import { girls } from "./data.js";

export function key(...parts){return parts.join("|")}

export const MIN_SEATS=1, MAX_SEATS=6, DEFAULT_SEATS=4;
export const seatOptions=Array.from({length:MAX_SEATS-MIN_SEATS+1},(_,i)=>MIN_SEATS+i);
export function clampSeats(n){const v=Number(n); return Number.isFinite(v)?Math.min(MAX_SEATS,Math.max(MIN_SEATS,Math.round(v))):DEFAULT_SEATS}
// Platser = antal barn bilen tar, inklusive förarens eget barn.
export function seatsFor(state,date,dir,name){return clampSeats(state.seatOverride[key(date,dir,name)] ?? state.seats[name])}

export function defaultAttending(state,day){return girls.filter(g=>state.attendance[g][day]==="J")}

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

// today (ISO-datum): träningar före detta datum räknas som genomförda i "soFar".
export function calculate(state, dates, today){
  const drives=Object.fromEntries(girls.map(g=>[g,0]));
  const attends=Object.fromEntries(girls.map(g=>[g,0]));
  const result={};
  let soFar=null;
  for(const x of dates){
    if(!soFar && x.date>=today) soFar={drives:{...drives},attends:{...attends}};
    // Frysta (passerade) träningar räknas från historiken, inte från nuvarande inställningar.
    const frozen=state.history[x.date];
    const attending=frozen ? frozen.attending : state.attendanceOverride[x.date] ?? defaultAttending(state,x.day);
    for(const g of attending) attends[g]++;
    const attendanceChanged=frozen ? !!frozen.attendanceEdited : !!state.attendanceOverride[x.date];
    result[x.date]={attending,frozen:!!frozen,attendanceChanged};
    const needed=attending.length;
    for(const dir of ["dit","hem"]){
      let drivers;
      if(frozen){
        drivers=frozen[dir].drivers;
        for(const d of drivers) drives[d.name]++;
      }else{
        const eligible=attending.filter(g=>state.drive[g][x.day][dir]==="J");
        drivers=[]; let capacity=0;
        const add=(name,manual)=>{const seats=seatsFor(state,x.date,dir,name); drivers.push({name,seats,manual}); capacity+=seats; drives[name]++;};
        for(const g of state.manual[key(x.date,dir)]||[]) add(g,true);
        // Fyll på med förare tills alla barn som deltar får plats.
        while(capacity<needed){
          const candidates=eligible.filter(g=>!drivers.some(d=>d.name===g));
          if(!candidates.length) break;
          candidates.sort((a,b)=>{
            const ra=attends[a] ? drives[a]/attends[a] : 0;
            const rb=attends[b] ? drives[b]/attends[b] : 0;
            return ra-rb || girls.indexOf(a)-girls.indexOf(b);
          });
          add(candidates[0],false);
        }
        // Ta bort automatiskt valda förare som inte behövs (t.ex. när en senare vald bil har många platser).
        // Baklänges, så att de som stod först i tur behåller sin körning om det går.
        for(let i=drivers.length-1;i>=0;i--){
          const d=drivers[i];
          if(!d.manual && capacity-d.seats>=needed){drivers.splice(i,1); capacity-=d.seats; drives[d.name]--;}
        }
      }
      const capacity=drivers.reduce((a,d)=>a+d.seats,0);
      result[x.date][dir]={drivers,needed,capacity,...assignCars(drivers,attending,state.carOverride[key(x.date,dir)])};
    }
  }
  soFar??={drives:{...drives},attends:{...attends}};
  return {result,drives,attends,soFar};
}
