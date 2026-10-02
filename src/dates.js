import { dayNames, scheduledWeekdays, seasonStart, seasonEnd, trainingTimes } from "./data.js";

// En träning räknas som genomförd (flyttas till historiken och fryses) en stund efter att den slutat.
export const DONE_AFTER_MINUTES=30;
export function trainingTime(day){return trainingTimes[day]}
export function fmtTime(hhmm){return hhmm.replace(":",".")}
export function isDone(x,now){
  const end=new Date(`${x.date}T${trainingTimes[x.day]?.end ?? "23:59"}:00`);
  return now.getTime()>=end.getTime()+DONE_AFTER_MINUTES*60e3;
}

// Lokal tid, inte toISOString() som räknar i UTC och ger föregående dag i Sverige.
export function isoDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
export function monday(d){const x=new Date(d); const n=(x.getDay()+6)%7; x.setDate(x.getDate()-n); x.setHours(0,0,0,0); return x}
// Kommande vecka låses efter torsdagens träning (från fredag 00.00), så att förarna kan planera i förväg.
// Träningar före det returnerade datumet (måndagen efter den låsta veckan) är låsta.
export function lockedUntil(now){const d=new Date(now); d.setDate(d.getDate()+3); const m=monday(d); m.setDate(m.getDate()+7); return isoDate(m)}
export function fmt(date){return new Date(date+"T00:00:00").toLocaleDateString("sv-SE",{weekday:"long",day:"numeric",month:"short"})}
export function seasonDates(){
  const out=[]; const d=new Date(seasonStart);
  while(d<=seasonEnd){if(scheduledWeekdays.has(d.getDay())) out.push({date:isoDate(d),day:dayNames[d.getDay()]}); d.setDate(d.getDate()+1);}
  return out;
}
