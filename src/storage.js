import { useEffect, useState } from "react";
import { key } from "./schedule.js";
import { mockToday } from "./clock.js";
import { firebaseConfig } from "./firebaseConfig.js";
import { emptyState, normalizeAttendanceOverride } from "./sync.js";
import { useFirestoreState } from "./firestoreState.js";

const STORAGE_KEY="carpooling-state-v1"+(mockToday?"-test":"");

// State-fält:
//   attendance/drive/seats   familjernas normala inställningar
//   seatOverride             {"datum|dit|namn": platser}
//   manual                   {"datum|dit": [förare]}
//   attendanceOverride       {datum: {namn: true|false}}, ändringar via Ändra (se dayAttendance)
//   answers                  {datum: {namn: true|false}}, familjernas egna svar Kommer/Kommer inte
//   carOverride              {"datum|dit": {barn: förare}}, manuellt flyttade barn
//   history                  {datum: {attending, dit:{drivers}, hem:{drivers}, attendanceEdited?}}, passerade träningar
//   confirmed                {namn: datum} när föräldern själv senast bekräftade sina inställningar
//   driverConfirmed/declined {"datum|dit": [förare]} som svarat "Jag kör" / "Kan inte köra"
const initial=emptyState();

// Äldre sparad data hade manuella förare per plats ("datum|dit|0"), nu en lista per körning ("datum|dit").
function migrate(s){
  const manual={};
  for(const [k,v] of Object.entries(s.manual||{})){
    if(Array.isArray(v)){manual[k]=v; continue;}
    if(!v) continue;
    const [date,dir]=k.split("|"); const t=key(date,dir);
    if(!(manual[t]||=[]).includes(v)) manual[t].push(v);
  }
  return {...initial,...s,seats:{...initial.seats,...s.seats},seatOverride:s.seatOverride||{},history:s.history||{},attendanceOverride:Object.fromEntries(Object.entries(s.attendanceOverride||{}).map(([d,v])=>[d,normalizeAttendanceOverride(v)])),carOverride:s.carOverride||{},confirmed:s.confirmed||{},answers:s.answers||{},driverConfirmed:s.driverConfirmed||{},declined:s.declined||{},manual};
}

function useLocalState(){
  const [state,setState]=useState(()=>{
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      return raw ? migrate(JSON.parse(raw)) : initial;
    }catch{return initial;}
  });
  useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state)),[state]);
  return [state,setState,{ready:true,canFreeze:true,error:null}];
}

// Gemensam databas om Firebase är konfigurerat, annars bara i webbläsaren. Valet ändras aldrig
// under körning, så det är okej att välja hook här.
export const useAppState=firebaseConfig ? useFirestoreState : useLocalState;

// Värden som bara gäller den här enheten (t.ex. vem som använder den), inte den gemensamma datan.
export function useDeviceValue(name){
  const storageKey="carpooling-"+name+(mockToday?"-test":"");
  const [value,setValue]=useState(()=>{try{return localStorage.getItem(storageKey)}catch{return null}});
  useEffect(()=>{try{if(value) localStorage.setItem(storageKey,value); else localStorage.removeItem(storageKey);}catch{}},[storageKey,value]);
  return [value,setValue];
}
