import { girls } from "./data.js";

export function key(...parts){return parts.join("|")}

export const MIN_SEATS=1, MAX_SEATS=6, DEFAULT_SEATS=4;
export const seatOptions=Array.from({length:MAX_SEATS-MIN_SEATS+1},(_,i)=>MIN_SEATS+i);
export function clampSeats(n){const v=Number(n); return Number.isFinite(v)?Math.min(MAX_SEATS,Math.max(MIN_SEATS,Math.round(v))):DEFAULT_SEATS}
// Platser = antal barn bilen tar, inklusive förarens eget barn.
export function seatsFor(state,date,dir,name){return clampSeats(state.seatOverride[key(date,dir,name)] ?? state.seats[name])}

// today (ISO-datum): träningar före detta datum räknas som genomförda i "soFar".
export function calculate(state, dates, today){
  const drives=Object.fromEntries(girls.map(g=>[g,0]));
  const attends=Object.fromEntries(girls.map(g=>[g,0]));
  const result={};
  let soFar=null;
  for(const x of dates){
    if(!soFar && x.date>=today) soFar={drives:{...drives},attends:{...attends}};
    for(const g of girls) if(state.attendance[g][x.day]==="J") attends[g]++;
    result[x.date]={};
    const needed=girls.filter(g=>state.attendance[g][x.day]==="J").length;
    for(const dir of ["dit","hem"]){
      const eligible=girls.filter(g=>state.attendance[g][x.day]==="J" && state.drive[g][x.day][dir]==="J");
      const drivers=[]; let capacity=0;
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
      result[x.date][dir]={drivers,needed,capacity};
    }
  }
  soFar??={drives:{...drives},attends:{...attends}};
  return {result,drives,attends,soFar};
}
