import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig.js";
import { collections, fromDocs, diffDocs } from "./sync.js";
import { mockToday } from "./clock.js";

// Skarp data i den publicerade appen; lokal utveckling och testläget har egna lag så att de inte rör den.
export const teamId=import.meta.env.DEV ? (mockToday ? "test" : "dev") : "main";

let db=null;
function getDb(){
  if(!db){
    const app=initializeApp(firebaseConfig);
    // Lokal cache gör att appen öppnas direkt och fungerar utan nät; ändringar skickas när nätet är tillbaka.
    db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
  }
  return db;
}

// Samma gränssnitt som useStoredState: [state, setState(fn), status].
// status.canFreeze blir sant först när datan hämtats från servern, så att en enhet utan nät
// aldrig fryser träningar utifrån en tom eller gammal cache.
export function useFirestoreState(){
  const [docs,setDocs]=useState({});
  const [synced,setSynced]=useState({});
  const [error,setError]=useState(null);

  useEffect(()=>{
    const unsubs=collections.map(col=>onSnapshot(collection(getDb(),"teams",teamId,col),{includeMetadataChanges:true},
      snap=>{
        setDocs(d=>({...d,[col]:Object.fromEntries(snap.docs.map(x=>[x.id,x.data()]))}));
        if(!snap.metadata.fromCache) setSynced(s=>s[col]?s:{...s,[col]:true});
        setError(null);
      },
      err=>setError(err.message)));
    return ()=>unsubs.forEach(u=>u());
  },[]);

  const state=useMemo(()=>fromDocs(docs),[docs]);
  // Senaste kända state, inklusive egna ändringar som ännu inte kommit tillbaka från databasen,
  // så att flera ändringar i rad (t.ex. dit och hem) bygger på varandra.
  const latest=useRef(state);
  useEffect(()=>{latest.current=state;},[state]);

  const setState=useCallback(fn=>{
    const prev=latest.current, next=fn(prev);
    latest.current=next;
    const ops=diffDocs(prev,next);
    if(!ops.length) return;
    const batch=writeBatch(getDb());
    for(const o of ops){
      const ref=doc(getDb(),"teams",teamId,o.col,o.id);
      if(o.op==="set") batch.set(ref,o.data); else batch.delete(ref);
    }
    batch.commit().catch(err=>setError(err.message));
  },[]);

  const ready=collections.every(c=>docs[c]);
  const canFreeze=collections.every(c=>synced[c]);
  return [state,setState,{ready,canFreeze,error}];
}
