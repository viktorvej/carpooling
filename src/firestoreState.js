import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig.js";
import { collections, fromDocs, diffDocs } from "./sync.js";
import { mockToday } from "./clock.js";
import { isDev, isPreview } from "./env.js";

// Skarp data bara på den riktiga adressen; lokal utveckling, testversionen och ?idag-läget har egna lag.
export const teamId=mockToday ? "test" : isDev ? "dev" : isPreview ? "preview" : "main";

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
  // Läs- och skrivfel hålls isär: en nekad skrivning ger en ny snapshot (ändringen backas), och den
  // får inte sudda ut skrivfelet innan användaren hunnit se det.
  const [readError,setReadError]=useState(null);
  const [writeError,setWriteError]=useState(null);

  useEffect(()=>{
    const unsubs=collections.map(col=>onSnapshot(collection(getDb(),"teams",teamId,col),{includeMetadataChanges:true},
      snap=>{
        setDocs(d=>({...d,[col]:Object.fromEntries(snap.docs.map(x=>[x.id,x.data()]))}));
        if(!snap.metadata.fromCache) setSynced(s=>s[col]?s:{...s,[col]:true});
        setReadError(null);
      },
      err=>setReadError("Kunde inte hämta från databasen ("+err.message+")")));
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
    batch.commit().then(()=>setWriteError(null),err=>setWriteError("Ändringen kunde inte sparas ("+err.message+")"));
  },[]);

  const ready=collections.every(c=>docs[c]);
  const canFreeze=collections.every(c=>synced[c]);
  return [state,setState,{ready,canFreeze,error:writeError||readError}];
}
