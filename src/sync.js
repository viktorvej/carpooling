import { girls, attendanceDefaults, driveDefaults, dayNames } from "./data.js";
import { key, DEFAULT_SEATS } from "./schedule.js";

// Översätter mellan appens state och databasens dokument, så att varje ändring bara
// skriver de dokument som berörs:
//   families/{namn}      {attendance, drive, seats, confirmedAt?}
//   days/{datum}         {attendanceOverride?: {barn: true|false}, answers?: {barn: true|false}, history?}
//   trips/{datum|dit}    {manual?, seatOverride?: {namn: platser}, carOverride?: {barn: förare}, confirmed?, declined?}
export const collections=["families","days","trips"];

export function emptyState(){
  return {
    attendance: attendanceDefaults,
    drive: driveDefaults,
    seats: Object.fromEntries(girls.map(g=>[g,DEFAULT_SEATS])),
    seatOverride: {}, manual: {}, attendanceOverride: {}, carOverride: {}, history: {},
    // {namn: datum} när föräldern själv senast bekräftade familjens inställningar.
    confirmed: {},
    // {datum: {barn: true|false}} familjernas egna svar (Kommer/Kommer inte).
    answers: {},
    // {"datum|dit": [förare]} som svarat "Jag kör" respektive "Kan inte köra".
    driverConfirmed: {}, declined: {},
  };
}

// Äldre data sparade närvaron per datum som en lista över deltagare; nu {barn: true|false}.
export function normalizeAttendanceOverride(v){
  return Array.isArray(v) ? Object.fromEntries(girls.map(g=>[g,v.includes(g)])) : v;
}

export function toDocs(state){
  const docs={families:{},days:{},trips:{}};
  for(const g of girls){
    docs.families[g]={attendance:state.attendance[g],drive:state.drive[g],seats:state.seats[g]};
    if(state.confirmed[g]) docs.families[g].confirmedAt=state.confirmed[g];
  }
  const day=d=>docs.days[d]??={};
  for(const [d,v] of Object.entries(state.attendanceOverride)) day(d).attendanceOverride=v;
  for(const [d,v] of Object.entries(state.history)) day(d).history=v;
  for(const [d,v] of Object.entries(state.answers)) day(d).answers=v;
  const trip=t=>docs.trips[t]??={};
  for(const [t,v] of Object.entries(state.manual)) trip(t).manual=v;
  for(const [t,v] of Object.entries(state.carOverride)) trip(t).carOverride=v;
  for(const [t,v] of Object.entries(state.driverConfirmed)) trip(t).confirmed=v;
  for(const [t,v] of Object.entries(state.declined)) trip(t).declined=v;
  for(const [k,v] of Object.entries(state.seatOverride)){
    const [date,dir,name]=k.split("|");
    (trip(key(date,dir)).seatOverride??={})[name]=v;
  }
  return docs;
}

// Familjer utan dokument får standardvärdena, så appen fungerar även innan någon sparat något.
export function fromDocs(docs){
  const s=emptyState();
  for(const [g,f] of Object.entries(docs.families||{})){
    if(!girls.includes(g)) continue;
    s.attendance={...s.attendance,[g]:f.attendance}; s.drive={...s.drive,[g]:f.drive}; s.seats={...s.seats,[g]:f.seats};
    if(f.confirmedAt) s.confirmed[g]=f.confirmedAt;
  }
  for(const [d,v] of Object.entries(docs.days||{})){
    const override=v.attendanceOverride ? {...normalizeAttendanceOverride(v.attendanceOverride)} : {};
    const answers={...v.answers};
    // Äldre data hade "Ibland"-familjernas svar bland ändringarna; flytta dem till svaren.
    if(!v.answers){
      const dayName=dayNames[new Date(d+"T00:00:00").getDay()];
      for(const g of Object.keys(override)) if(s.attendance[g]?.[dayName]==="?"){answers[g]=override[g]; delete override[g];}
    }
    if(Object.keys(override).length) s.attendanceOverride[d]=override;
    if(Object.keys(answers).length) s.answers[d]=answers;
    if(v.history) s.history[d]=v.history;
  }
  for(const [t,v] of Object.entries(docs.trips||{})){
    if(v.manual) s.manual[t]=v.manual;
    if(v.carOverride) s.carOverride[t]=v.carOverride;
    if(v.confirmed) s.driverConfirmed[t]=v.confirmed;
    if(v.declined) s.declined[t]=v.declined;
    for(const [name,seats] of Object.entries(v.seatOverride||{})) s.seatOverride[key(t,name)]=seats;
  }
  return s;
}

// Vilka dokument som ska skrivas (set) eller tas bort (delete) för att gå från prev till next.
export function diffDocs(prev,next){
  const a=toDocs(prev), b=toDocs(next), ops=[];
  for(const col of collections){
    for(const [id,data] of Object.entries(b[col])) if(JSON.stringify(a[col][id])!==JSON.stringify(data)) ops.push({op:"set",col,id,data});
    for(const id of Object.keys(a[col])) if(!(id in b[col])) ops.push({op:"delete",col,id});
  }
  return ops;
}
