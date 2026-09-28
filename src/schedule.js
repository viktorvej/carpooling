import { girls } from "./data.js";
import { isoDate, isDone } from "./dates.js";

export function key(...parts){return parts.join("|")}

export const MIN_SEATS=1, MAX_SEATS=6, DEFAULT_SEATS=4;
export const seatOptions=Array.from({length:MAX_SEATS-MIN_SEATS+1},(_,i)=>MIN_SEATS+i);
export function clampSeats(n){const v=Number(n); return Number.isFinite(v)?Math.min(MAX_SEATS,Math.max(MIN_SEATS,Math.round(v))):DEFAULT_SEATS}
// Platser = antal barn bilen tar, inklusive förarens eget barn.
export function seatsFor(state,date,dir,name){return clampSeats(state.seatOverride[key(date,dir,name)] ?? state.seats[name])}

// Närvaro per träning, i prioritetsordning:
//   attendanceOverride[datum][barn]  ändring av någon annan via Ändra
//   answers[datum][barn]             familjens eget svar (Kommer/Kommer inte)
//   inställningen                    "J" och "?" (Ibland) planeras in, "N" inte
// Barn som planeras in men varken svarat eller ändrats räknas som obekräftade. Påminnelser och
// markeringar visas bara när träningen är inom ANSWER_WINDOW_DAYS dagar.
export const ANSWER_WINDOW_DAYS=3;
const planned=(state,g,day)=>state.attendance[g][day]!=="N";
const maybe=(state,g,day)=>state.attendance[g][day]==="?";

export function defaultAttending(state,day){return girls.filter(g=>planned(state,g,day))}

export function dayAttendance(state,date,day){
  const o=state.attendanceOverride[date]||{}, a=state.answers[date]||{};
  const attending=girls.filter(g=>o[g] ?? a[g] ?? planned(state,g,day));
  return {
    attending,
    answered:a,
    maybe:girls.filter(g=>maybe(state,g,day)),
    unconfirmed:attending.filter(g=>a[g]===undefined && o[g]===undefined),
    // "Ibland"-familjer som inte kommer är ett förväntat svar och räknas inte som ändrad närvaro.
    changed:girls.some(g=>!maybe(state,g,day) && attending.includes(g)!==planned(state,g,day)),
  };
}

// En familjs svarsläge för en träning (från calculate-resultatet): svarat, eller inställningens förslag
// (null för "Ibland", som inte har något förslag).
export function answerState(day,me){
  const a=day.answered[me];
  if(a!==undefined) return {answered:true,value:a};
  return {answered:false,value:day.maybe.includes(me)?null:day.attending.includes(me)};
}

const setDate=(obj,date,o)=>{const all={...obj}; if(Object.keys(o).length) all[date]=o; else delete all[date]; return all;};

// Sparar närvaron från Ändra som ändringar ovanpå familjernas svar; bara barn som faktiskt ändrats
// får ett värde. reset (Automatisk) tar bort alla ändringar men rör inte familjernas svar.
export function withAttendance(state,date,day,attending,{reset=false}={}){
  const prev=state.attendanceOverride[date]||{}, a=state.answers[date]||{}, o={};
  if(!reset) for(const g of girls){
    const base=a[g] ?? planned(state,g,day);
    const now=attending.includes(g), current=prev[g] ?? base;
    const value=now!==current ? now : prev[g];
    if(value!==undefined && value!==base) o[g]=value;
  }
  return {...state,attendanceOverride:setDate(state.attendanceOverride,date,o)};
}

// Familjens eget svar. Sparas alltid (även när det stämmer med inställningen, för det är just
// bekräftelsen som behövs) och ersätter en eventuell ändring av någon annan för samma barn.
export function answerAttendance(state,date,name,coming){
  const o={...state.attendanceOverride[date]}; delete o[name];
  return {...state,answers:{...state.answers,[date]:{...state.answers[date],[name]:coming}},attendanceOverride:setDate(state.attendanceOverride,date,o)};
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
  // Först lyfts alla flyttade barn ur sina bilar, sedan placeras de i sina valda bilar. Då spelar
  // ordningen på flyttarna ingen roll: en placering som gick att göra i Ändra går alltid att återskapa.
  const moves=Object.entries(overrides).filter(([kid,target])=>attending.includes(kid) && byName[target]);
  const baseCar=Object.fromEntries(moves.map(([kid])=>[kid,carOf(kid)]));
  for(const [kid] of moves){const from=carOf(kid); if(from) from.kids=from.kids.filter(k=>k!==kid);}
  const bounced=[];
  for(const [kid,target] of moves){const to=byName[target]; if(hasRoom(to)) to.kids.push(kid); else bounced.push(kid);}
  // Barn vars valda bil inte längre har plats (t.ex. färre platser nu) placeras automatiskt igen.
  for(const kid of bounced){
    const c=(baseCar[kid] && hasRoom(baseCar[kid])) ? baseCar[kid] : cars.filter(hasRoom).sort((a,b)=>(b.seats-b.kids.length)-(a.seats-a.kids.length))[0];
    if(c) c.kids.push(kid);
  }
  const moved=moves.map(([kid])=>kid).filter(kid=>carOf(kid) && carOf(kid)!==baseCar[kid]);
  return {cars,unplaced:attending.filter(k=>!carOf(k)),moved};
}

// Förarens svar för en körning: "Jag kör" (bekräftar och låser) eller "Kan inte köra" (släpper körningen).
// Ett nytt svar ersätter det tidigare; answer=null tar bort svaret.
export function answerDrive(state,date,dir,name,answer){
  const trip=key(date,dir);
  const without=(list,n)=>(list||[]).filter(x=>x!==n);
  const setList=(obj,list)=>{const o={...obj}; if(list.length) o[trip]=list; else delete o[trip]; return o;};
  const confirmed=without(state.driverConfirmed[trip],name), declined=without(state.declined[trip],name);
  if(answer==="yes") confirmed.push(name);
  if(answer==="no") declined.push(name);
  // Den som inte kan köra ska inte heller ligga kvar som manuell förare.
  const manual=answer==="no" ? setList(state.manual,without(state.manual[trip],name)) : state.manual;
  return {...state,manual,driverConfirmed:setList(state.driverConfirmed,confirmed),declined:setList(state.declined,declined)};
}

// Hur mycket obalans mellan dit- och hemkörningar väger mot det totala körsaldot.
// 0.5 ger jämn fördelning utan att försämra rättvisan i antal körningar (testat över en hel säsong).
export const DIR_BALANCE_WEIGHT=0.5;

// now (Date): träningar som är genomförda (isDone) räknas in i "soFar" och används från historiken.
export function calculate(state, dates, now, dirWeight=DIR_BALANCE_WEIGHT){
  const today=isoDate(now);
  const drives=Object.fromEntries(girls.map(g=>[g,0]));
  const dirDrives=Object.fromEntries(girls.map(g=>[g,{dit:0,hem:0}]));
  const attends=Object.fromEntries(girls.map(g=>[g,0]));
  const result={};
  let soFar=null;
  for(const x of dates){
    const done=isDone(x,now);
    if(!soFar && !done) soFar={drives:{...drives},attends:{...attends}};
    // Frysta (genomförda) träningar räknas från historiken, inte från nuvarande inställningar.
    // (Bara genomförda, så att testläget med ett tidigare ?idag-datum inte låser "framtida" träningar.)
    const frozen=done && state.history[x.date];
    const planned=frozen ? null : dayAttendance(state,x.date,x.day);
    const attending=frozen ? frozen.attending : planned.attending;
    for(const g of attending) attends[g]++;
    const attendanceChanged=frozen ? !!frozen.attendanceEdited : planned.changed;
    const daysUntil=Math.round((new Date(x.date+"T00:00:00")-new Date(today+"T00:00:00"))/864e5);
    result[x.date]={attending,done,frozen:!!frozen,attendanceChanged,
      unconfirmed:frozen?[]:planned.unconfirmed, answered:frozen?{}:planned.answered, maybe:frozen?[]:planned.maybe,
      // Inom svarsfönstret: då visas påminnelser och obekräftade barn markeras.
      soon:!done && daysUntil>=0 && daysUntil<=ANSWER_WINDOW_DAYS};
    const needed=attending.length;
    for(const dir of ["dit","hem"]){
      let drivers;
      const other=dir==="dit"?"hem":"dit";
      const trip=key(x.date,dir);
      // Förare som bekräftat ("Jag kör") låses som manuella; de som sagt "Kan inte köra" väljs inte automatiskt.
      const declined=state.declined[trip]||[], confirmed=state.driverConfirmed[trip]||[];
      if(frozen){
        drivers=frozen[dir].drivers;
        for(const d of drivers){drives[d.name]++; dirDrives[d.name][dir]++;}
      }else{
        const eligible=attending.filter(g=>state.drive[g][x.day][dir]==="J" && !declined.includes(g));
        drivers=[]; let capacity=0;
        const add=(name,manual)=>{const seats=seatsFor(state,x.date,dir,name); drivers.push({name,seats,manual,confirmed:confirmed.includes(name)}); capacity+=seats; drives[name]++; dirDrives[name][dir]++;};
        for(const g of state.manual[trip]||[]) if(!declined.includes(g)) add(g,true);
        for(const g of confirmed) if(!drivers.some(d=>d.name===g) && !declined.includes(g)) add(g,false);
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
          if(!d.manual && !d.confirmed && capacity-d.seats>=needed){drivers.splice(i,1); capacity-=d.seats; drives[d.name]--; dirDrives[d.name][dir]--;}
        }
      }
      const capacity=drivers.reduce((a,d)=>a+d.seats,0);
      result[x.date][dir]={drivers,needed,capacity,declined,...assignCars(drivers,attending,state.carOverride[key(x.date,dir)])};
    }
  }
  soFar??={drives:{...drives},attends:{...attends}};
  return {result,drives,attends,soFar};
}
