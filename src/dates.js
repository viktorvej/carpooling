import { dayNames, scheduledWeekdays, seasonStart, seasonEnd } from "./data.js";

// Lokal tid, inte toISOString() som räknar i UTC och ger föregående dag i Sverige.
export function isoDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
export function monday(d){const x=new Date(d); const n=(x.getDay()+6)%7; x.setDate(x.getDate()-n); x.setHours(0,0,0,0); return x}
export function fmt(date){return new Date(date+"T00:00:00").toLocaleDateString("sv-SE",{weekday:"long",day:"numeric",month:"short"})}
export function weekDates(date){const m=monday(date); return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return d}).filter(d=>scheduledWeekdays.has(d.getDay())).map(d=>({date:isoDate(d),day:dayNames[d.getDay()]}))}
export function seasonDates(){
  const out=[]; const d=new Date(seasonStart);
  while(d<=seasonEnd){if(scheduledWeekdays.has(d.getDay())) out.push({date:isoDate(d),day:dayNames[d.getDay()]}); d.setDate(d.getDate()+1);}
  return out;
}
