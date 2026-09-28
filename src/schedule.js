import { girls } from "./data.js";

export function key(...parts){return parts.join("|")}

export const MIN_SEATS=1, MAX_SEATS=6, DEFAULT_SEATS=4;
export const seatOptions=Array.from({length:MAX_SEATS-MIN_SEATS+1},(_,i)=>MIN_SEATS+i);
export function clampSeats(n){const v=Number(n); return Number.isFinite(v)?Math.min(MAX_SEATS,Math.max(MIN_SEATS,Math.round(v))):DEFAULT_SEATS}
// Platser = antal barn bilen tar, inklusive förarens eget barn.
export function seatsFor(state,date,dir,name){return clampSeats(state.seatOverride[key(date,dir,name)] ?? state.seats[name])}

// Närvaro: "J" och "?" (Ibland) planeras in, "N" inte. För en enskild träning kan
// attendanceOverride[datum] = {barn: true|false} ange uttryckliga svar eller ändringar.
// "Ibland"-barn utan svar räknas som obekräftade, så att appen kan påminna.
const planned=(state,g,day)=>state.attendance[g][day]!=="N";
const maybe=(state,g,day)=>state.attendance[g][day]==="?";

export function defaultAttending(state,day){return girls.filter(g=>planned(state,g,day))}

export function dayAttendance(state,date,day){
  const o=state.attendanceOverride[date]||{};
  return {
    attending:girls.filter(g=>o[g] ?? planned(state,g,day)),
    unconfirmed:girls.filter(g=>maybe(state,g,day) && o[g]===undefined),
    // Svar från "Ibland"-familjer är förväntade och räknas inte som ändrad närvaro.
    changed:girls.some(g=>!maybe(state,g,day) && o[g]!==undefined && o[g]!==planned(state,g,day)),
  };
}

// Sparar närvaron från Ändra: bara barn vars närvaro faktiskt ändrats får ett uttryckligt värde,
// så att någon annans ändring inte räknas som ett svar från en "Ibland"-familj.
// reset (Automatisk) tar bort ändringar men behåller svar från "Ibland"-familjer.
export function withAttendance(state,date,day,attending,{reset=false}={}){
  const prev=state.attendanceOverride[date]||{}, o={};
  for(const g of girls){
    if(prev[g]!==undefined && (!reset || maybe(state,g,day))) o[g]=prev[g];
    if(!reset){const now=attending.includes(g); if(now!==(o[g] ?? planned(state,g,day))) o[g]=now;}
    if(!maybe(state,g,day) && o[g]===planned(state,g,day)) delete o[g];
  }
  const all={...state.attendanceOverride};
  if(Object.keys(o).length) all[date]=o; else delete all[date];
  return {...state,attendanceOverride:all};
}

// Förälderns eget svar (Kommer/Kommer inte). Ett svar som stämmer med inställningen sparas inte som
// undantag, utom för "Ibland" där själva svaret behövs för att träningen ska räknas som bekräftad.
export function answerAttendance(state,date,day,name,coming){
  const o={...state.attendanceOverride[date],[name]:coming};
  if(!maybe(state,name,day) && coming===planned(state,name,day)) delete o[name];
  const all={...state.attendanceOverride};
  if(Object.keys(o).length) all[date]=o; else delete all[date];
  return {...state,attendanceOverride:all};
}

// Placerar barnen i bilarna: förarens eget barn i egen bil (kan flyttas manuellt), resten i bilen med flest lediga platser.
// Manuella flyttar (overrides: {barn: förare}) läggs sedan ovanpå, en i taget, så att bara
// det flyttade barnet byter bil och de andra stannar där de automatiskt placerades.
export function assignCars(drivers, attending, overrides={}){
  const cars=drivers.map(d=>({name:d.name,seats:d.seats,kids:[]}));
  const byName=Object.fromEntries(cars.map(c=>[c.name,c]));
  const hasRoom=c=>c.kids.length<c.seats;
  const carOf=kid=>cars.find(c=>c.kids.includes(kid));
  for(const c of cars) if(attending.includes(c.name)) c.kids.push(c.name);
  for(const kid of attending){
    if(carOf(kid)) continue;
    const c=cars.filter(hasRoom).sort((a,b)=>(b.seats-b.kids.length)-(a.seats-a.kids.length))[0];
    if(c) c.kids.push(kid);
  }
  const moved=[];
  for(const [kid,target] of Object.entries(overrides)){
    const to=byName[target], from=carOf(kid);
    if(!attending.includes(kid) || !to) continue;
    if(to===from){moved.push(kid); continue;}
    if(!hasRoom(to)) continue;
    if(from) from.kids=from.kids.filter(k=>k!==kid);
    to.kids.push(kid); moved.push(kid);
  }
  return {cars,unplaced:attending.filter(k=>!carOf(k)),moved};
}

// Hur mycket obalans mellan dit- och hemkörningar väger mot det totala körsaldot.
// 0.5 ger jämn fördelning utan att försämra rättvisan i antal körningar (testat över en hel säsong).
export const DIR_BALANCE_WEIGHT=0.5;

// today (ISO-datum): träningar före detta datum räknas som genomförda i "soFar".
export function calculate(state, dates, today, dirWeight=DIR_BALANCE_WEIGHT){
  const drives=Object.fromEntries(girls.map(g=>[g,0]));
  const dirDrives=Object.fromEntries(girls.map(g=>[g,{dit:0,hem:0}]));
  const attends=Object.fromEntries(girls.map(g=>[g,0]));
  const result={};
  let soFar=null;
  for(const x of dates){
    if(!soFar && x.date>=today) soFar={drives:{...drives},attends:{...attends}};
    // Frysta (passerade) träningar räknas från historiken, inte från nuvarande inställningar.
    // (Bara före idag, så att testläget med ett tidigare ?idag-datum inte låser "framtida" träningar.)
    const frozen=x.date<today && state.history[x.date];
    const planned=frozen ? null : dayAttendance(state,x.date,x.day);
    const attending=frozen ? frozen.attending : planned.attending;
    for(const g of attending) attends[g]++;
    const attendanceChanged=frozen ? !!frozen.attendanceEdited : planned.changed;
    result[x.date]={attending,frozen:!!frozen,attendanceChanged,unconfirmed:frozen?[]:planned.unconfirmed};
    const needed=attending.length;
    for(const dir of ["dit","hem"]){
      let drivers;
      const other=dir==="dit"?"hem":"dit";
      if(frozen){
        drivers=frozen[dir].drivers;
        for(const d of drivers){drives[d.name]++; dirDrives[d.name][dir]++;}
      }else{
        const eligible=attending.filter(g=>state.drive[g][x.day][dir]==="J");
        drivers=[]; let capacity=0;
        const add=(name,manual)=>{const seats=seatsFor(state,x.date,dir,name); drivers.push({name,seats,manual}); capacity+=seats; drives[name]++; dirDrives[name][dir]++;};
        for(const g of state.manual[key(x.date,dir)]||[]) add(g,true);
        // Turordning: minst körningar per deltagen träning först. Den som redan kört fler åt det här
        // hållet än åt andra hållet (och kan köra båda) får lägre prioritet, så att dit/hem fördelas jämnt.
        const score=g=>{
          const ratio=attends[g] ? drives[g]/attends[g] : 0;
          const both=state.drive[g][x.day][other]==="J";
          return ratio + (both ? dirWeight*(dirDrives[g][dir]-dirDrives[g][other])/Math.max(attends[g],1) : 0);
        };
        // Fyll på med förare tills alla barn som deltar får plats.
        while(capacity<needed){
          const candidates=eligible.filter(g=>!drivers.some(d=>d.name===g));
          if(!candidates.length) break;
          candidates.sort((a,b)=>score(a)-score(b) || girls.indexOf(a)-girls.indexOf(b));
          add(candidates[0],false);
        }
        // Ta bort automatiskt valda förare som inte behövs (t.ex. när en senare vald bil har många platser).
        // Baklänges, så att de som stod först i tur behåller sin körning om det går.
        for(let i=drivers.length-1;i>=0;i--){
          const d=drivers[i];
          if(!d.manual && capacity-d.seats>=needed){drivers.splice(i,1); capacity-=d.seats; drives[d.name]--; dirDrives[d.name][dir]--;}
        }
      }
      const capacity=drivers.reduce((a,d)=>a+d.seats,0);
      result[x.date][dir]={drivers,needed,capacity,...assignCars(drivers,attending,state.carOverride[key(x.date,dir)])};
    }
  }
  soFar??={drives:{...drives},attends:{...attends}};
  return {result,drives,attends,soFar};
}
