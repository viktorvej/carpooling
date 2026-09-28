import { useEffect, useState } from "react";
import { girls, attendanceDefaults, driveDefaults } from "./data.js";
import { key, DEFAULT_SEATS } from "./schedule.js";
import { mockToday } from "./clock.js";

const STORAGE_KEY="carpooling-state-v1"+(mockToday?"-test":"");

const initial = {
  attendance: attendanceDefaults,
  drive: driveDefaults,
  seats: Object.fromEntries(girls.map(g=>[g,DEFAULT_SEATS])),
  seatOverride: {},
  manual: {},
  // Närvaro för enskilda kommande träningar: {datum: [namn]}, ersätter veckodagsinställningen.
  attendanceOverride: {},
  // Manuellt flyttade barn: {"datum|dit": {barn: förare}}
  carOverride: {},
  // Passerade träningar: {datum: {attending:[namn], dit:{drivers:[{name,seats,manual}]}, hem:{...}}}
  history: {},
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
  return {...initial,...s,seats:{...initial.seats,...s.seats},seatOverride:s.seatOverride||{},history:s.history||{},attendanceOverride:s.attendanceOverride||{},carOverride:s.carOverride||{},manual};
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

// Värden som bara gäller den här enheten (t.ex. vem som använder den), inte den gemensamma datan.
export function useDeviceValue(name){
  const storageKey="carpooling-"+name+(mockToday?"-test":"");
  const [value,setValue]=useState(()=>{try{return localStorage.getItem(storageKey)}catch{return null}});
  useEffect(()=>{try{if(value) localStorage.setItem(storageKey,value); else localStorage.removeItem(storageKey);}catch{}},[storageKey,value]);
  return [value,setValue];
}
