import { girls } from "./data.js";

export function key(...parts){return parts.join("|")}

export const MIN_SEATS=1, MAX_SEATS=6, DEFAULT_SEATS=4;
export const seatOptions=Array.from({length:MAX_SEATS-MIN_SEATS+1},(_,i)=>MIN_SEATS+i);
export function clampSeats(n){const v=Number(n); return Number.isFinite(v)?Math.min(MAX_SEATS,Math.max(MIN_SEATS,Math.round(v))):DEFAULT_SEATS}
// Platser = antal barn bilen tar, inklusive förarens eget barn.
export function seatsFor(state,date,dir,name){return clampSeats(state.seatOverride[key(date,dir,name)] ?? state.seats[name])}

export function defaultAttending(state,day){return girls.filter(g=>state.attendance[g][day]==="J")}

// Placerar barnen i bilarna: förarens eget barn i egen bil, sedan manuella flyttar
// (overrides: {barn: förare}), sedan resten i bilen med flest lediga platser.
export function assignCars(drivers, attending, overrides={}){
  const cars=drivers.map(d=>({name:d.name,seats:d.seats,kids:[]}));
  const byName=Object.fromEntries(cars.map(c=>[c.name,c]));
  const hasRoom=c=>c.kids.length<c.seats;
  const place=(kid,car)=>car.kids.push(kid);
  const placed=kid=>cars.some(c=>c.kids.includes(kid));
  for(const c of cars) if(attending.includes(c.name)) place(c.name,c);
  for(const kid of attending){
    const c=byName[overrides[kid]];
    if(!placed(kid) && c && hasRoom(c)) place(kid,c);
  }
  for(const kid of attending){
    if(placed(kid)) continue;
    const c=cars.filter(hasRoom).sort((a,b)=>(b.seats-b.kids.length)-(a.seats-a.kids.length))[0];
    if(c) place(kid,c);
  }
  return {cars,unplaced:attending.filter(k=>!placed(k))};
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
    result[x.date]={attending,frozen:!!frozen};
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
      }
      const capacity=drivers.reduce((a,d)=>a+d.seats,0);
      result[x.date][dir]={drivers,needed,capacity,...assignCars(drivers,attending,state.carOverride[key(x.date,dir)])};
    }
  }
  soFar??={drives:{...drives},attends:{...attends}};
  return {result,drives,attends,soFar};
}
