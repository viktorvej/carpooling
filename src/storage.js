import { useEffect, useState } from "react";
import { girls, attendanceDefaults, driveDefaults } from "./data.js";
import { key, DEFAULT_SEATS } from "./schedule.js";

const STORAGE_KEY="carpooling-state-v1";

const initial = {
  attendance: attendanceDefaults,
  drive: driveDefaults,
  seats: Object.fromEntries(girls.map(g=>[g,DEFAULT_SEATS])),
  seatOverride: {},
  manual: {},
};

// Äldre sparad data hade manuella förare per plats ("datum|dit|0"), nu en lista per körning ("datum|dit").
function migrate(s){
  const manual={};
  for(const [k,v] of Object.entries(s.manual||{})){
    if(Array.isArray(v)){manual[k]=v; continue;}
    if(!v) continue;
    const [date,dir]=k.split("|"); const t=key(date,dir);
    if(!(manual[t]||=[]).includes(v)) manual[t].push(v);
  }
  return {...initial,...s,seats:{...initial.seats,...s.seats},seatOverride:s.seatOverride||{},manual};
}

export function useStoredState(){
  const [state,setState]=useState(()=>{
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      return raw ? migrate(JSON.parse(raw)) : initial;
    }catch{return initial;}
  });
  useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state)),[state]);
  return [state,setState];
}
