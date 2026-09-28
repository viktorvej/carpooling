import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const girls = ["Edda","Freja","Signe","Lo","Tyra","Lykke","Alma"];
const attendanceDefaults = {
  Edda:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Freja:{Måndag:"J",Tisdag:"?",Torsdag:"N"},
  Signe:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Lo:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Tyra:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Lykke:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Alma:{Måndag:"N",Tisdag:"J",Torsdag:"J"},
};
const driveDefaults = Object.fromEntries(girls.map((name)=>[name,{
  Måndag:{dit:"N",hem:"N"},Tisdag:{dit:"N",hem:"N"},Torsdag:{dit:"N",hem:"N"}
}]));
Object.assign(driveDefaults,{
  Edda:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Freja:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"N",hem:"N"},Torsdag:{dit:"N",hem:"N"}},
  Signe:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Lo:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Tyra:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Lykke:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Alma:{Måndag:{dit:"N",hem:"N"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
});

const dayNames={0:"Söndag",1:"Måndag",2:"Tisdag",3:"Onsdag",4:"Torsdag",5:"Fredag",6:"Lördag"};
const scheduledWeekdays = new Set([1,2,4]);

function isoDate(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10)}
function monday(d){const x=new Date(d); const n=(x.getDay()+6)%7; x.setDate(x.getDate()-n); x.setHours(0,0,0,0); return x}
function fmt(date){return new Date(date+"T00:00:00").toLocaleDateString("sv-SE",{weekday:"long",day:"numeric",month:"short"})}
function weekDates(date){const m=monday(date); return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return d}).filter(d=>scheduledWeekdays.has(d.getDay())).map(d=>({date:isoDate(d),day:dayNames[d.getDay()]}))}
function key(...parts){return parts.join("|")}

const MIN_SEATS=1, MAX_SEATS=6, DEFAULT_SEATS=4;
const seatOptions=Array.from({length:MAX_SEATS-MIN_SEATS+1},(_,i)=>MIN_SEATS+i);
function clampSeats(n){const v=Number(n); return Number.isFinite(v)?Math.min(MAX_SEATS,Math.max(MIN_SEATS,Math.round(v))):DEFAULT_SEATS}
// Platser = antal barn bilen tar, inklusive förarens eget barn.
function seatsFor(state,date,dir,name){return clampSeats(state.seatOverride[key(date,dir,name)] ?? state.seats[name])}

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

function useStoredState(){
  const [state,setState]=useState(()=>{
    try{
      const raw=localStorage.getItem("carpooling-state-v1");
      return raw ? migrate(JSON.parse(raw)) : initial;
    }catch{return initial;}
  });
  useEffect(()=>localStorage.setItem("carpooling-state-v1",JSON.stringify(state)),[state]);
  return [state,setState];
}

function calculate(state, dates){
  const drives=Object.fromEntries(girls.map(g=>[g,0]));
  const attends=Object.fromEntries(girls.map(g=>[g,0]));
  const result={};
  for(const x of dates){
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
  return {result,drives,attends};
}

function App(){
  const [state,setState]=useStoredState();
  const [tab,setTab]=useState("home");
  const [edit,setEdit]=useState(null);
  const season=useMemo(()=>{
    const out=[]; let d=new Date(2026,8,28);
    while(d<=new Date(2027,4,31)){if(scheduledWeekdays.has(d.getDay())) out.push({date:isoDate(d),day:dayNames[d.getDay()]}); d.setDate(d.getDate()+1);}
    return out;
  },[]);
  const today=new Date();
  const thisWeek=weekDates(today);
  const nextWeek=weekDates(new Date(monday(today).getFullYear(),monday(today).getMonth(),monday(today).getDate()+7));
  const calc=useMemo(()=>calculate(state,season),[state,season]);

  // picked: {namn: platser} för körningen, eller null för att återställa till automatisk.
  function setTrip(date,dir,picked){
    setState(s=>{
      const manual={...s.manual}, seatOverride={...s.seatOverride}, prefix=key(date,dir)+"|";
      delete manual[key(date,dir)];
      for(const k of Object.keys(seatOverride)) if(k.startsWith(prefix)) delete seatOverride[k];
      if(picked && Object.keys(picked).length){
        manual[key(date,dir)]=Object.keys(picked);
        for(const [name,seats] of Object.entries(picked)) if(seats!==s.seats[name]) seatOverride[key(date,dir,name)]=seats;
      }
      return {...s,manual,seatOverride};
    });
  }
  function setSeats(name,value){setState(s=>({...s,seats:{...s.seats,[name]:clampSeats(value)}}))}
  function setAtt(name,day,value){setState(s=>({...s,attendance:{...s.attendance,[name]:{...s.attendance[name],[day]:value}}}))}
  function setDrive(name,day,dir,value){setState(s=>({...s,drive:{...s.drive,[name]:{...s.drive[name],[day]:{...s.drive[name][day],[dir]:value}}}}))}

  return <div className="app">
    <header><div className="header-inner"><h1>🤾 Handboll – Samåkning</h1><p>Gemensamt körschema för laget</p></div></header>
    <main>
      {tab==="home" && <HomeSection weeks={[[ "Den här veckan",thisWeek ],[ "Nästa vecka",nextWeek ]] } calc={calc} onEdit={setEdit}/>}
      {tab==="schedule" && <ScheduleSection season={season} calc={calc} onEdit={setEdit}/>}
      {tab==="balance" && <BalanceSection calc={calc}/>}
      {tab==="settings" && <SettingsSection state={state} setAtt={setAtt} setDrive={setDrive} setSeats={setSeats} />}
    </main>
    <nav>{[
      ["home","🏠","Översikt"],["schedule","🚗","Körschema"],["balance","⚖️","Körsaldo"],["settings","⚙️","Inställningar"]
    ].map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav>
    {edit && <EditModal edit={edit} calc={calc} state={state} onSave={setTrip} onClose={()=>setEdit(null)}/>}
  </div>
}

function DayCard({x,calc,onEdit,compact=false}){
  const today=isoDate(new Date()); const currentStart=isoDate(monday(new Date())); const currentEnd=isoDate(new Date(monday(new Date()).getFullYear(),monday(new Date()).getMonth(),monday(new Date()).getDate()+6));
  const past=x.date<today, current=x.date>=currentStart&&x.date<=currentEnd;
  return <section className={"day-card "+(past?"past ":"")+(current?"current ":"")}>
    <div className="day-head"><div><b>{fmt(x.date)}</b><span>{x.day}</span></div>{current&&<em>AKTUELL VECKA</em>}</div>
    {["dit","hem"].map(dir=>{
      const r=calc.result[x.date][dir], short=r.capacity<r.needed;
      return <div className="route" key={dir}>
        <div className="route-label">{dir==="dit"?"🚗 DIT":"🏠 HEM"}</div>
        <div>
          <div className="driver-list">{r.drivers.length ? r.drivers.map(d=><span key={d.name} className={d.manual?"manual-driver":""}>{d.name}<small className="seats">{d.seats} pl</small>{d.manual&&<small>MANUELL</small>}</span>) : <span>—</span>}</div>
          <div className={"capacity"+(short?" short":"")}>{r.needed} barn · {r.capacity} platser{short&&` · ${r.needed-r.capacity} saknas`}</div>
        </div>
        {!past && <button className="edit-btn" onClick={()=>onEdit({date:x.date,dir})}>Ändra</button>}
      </div>;
    })}
  </section>
}

function HomeSection({weeks,calc,onEdit}){
  return <div><div className="hero"><h2>Vem kör?</h2><p>Tryck <b>Ändra</b> när någon vill ta över en körning.</p></div>{weeks.map(([title,dates])=><div key={title}><h2 className="section-title">{title}</h2>{dates.map(x=><DayCard key={x.date} x={x} calc={calc} onEdit={onEdit}/>)}</div>)}</div>
}

function ScheduleSection({season,calc,onEdit}){
  return <div><h2 className="section-title">Hela körschemat</h2><p className="muted">Grå = passerad · blå = aktuell vecka</p>{season.map(x=><DayCard key={x.date} x={x} calc={calc} onEdit={onEdit}/>)}</div>
}

function BalanceSection({calc}){
  const rows=girls.map(g=>({g,drives:calc.drives[g],attends:calc.attends[g],ratio:calc.attends[g]?calc.drives[g]/calc.attends[g]:0}));
  return <div><h2 className="section-title">Körsaldo</h2><div className="card"><table><thead><tr><th>Tjej</th><th>Körningar</th><th>Deltagit</th><th>Kör/delt.</th></tr></thead><tbody>{rows.map(r=><tr key={r.g}><td><b>{r.g}</b></td><td>{r.drives}</td><td>{r.attends}</td><td>{r.ratio.toFixed(2)}</td></tr>)}</tbody></table></div><div className="card"><b>Så fungerar automatiken</b><p className="muted">Tidigare körningar jämförs med antal deltagna träningar. Nästa förare väljs bland dem som deltar och kan köra den aktuella vägen.</p></div></div>
}

function SettingsSection({state,setAtt,setDrive,setSeats}){
  return <div><h2 className="section-title">Inställningar</h2><div className="card"><h3>Platser i bilen</h3><p className="muted">Hur många barn bilen normalt tar, inklusive det egna barnet. Kan ändras per körning via Ändra.</p>{girls.map(g=><div className="setting-row seats-row" key={g}><b>{g}</b><select value={state.seats[g]} onChange={e=>setSeats(g,e.target.value)}>{seatOptions.map(n=><option key={n} value={n}>{n}</option>)}</select></div>)}</div><div className="card"><h3>Närvaro</h3>{girls.map(g=><div className="setting-row" key={g}><b>{g}</b>{["Måndag","Tisdag","Torsdag"].map(day=><select key={day} value={state.attendance[g][day]} onChange={e=>setAtt(g,day,e.target.value)}><option>J</option><option>?</option><option>N</option></select>)}</div>)}</div><div className="card"><h3>Körbarhet</h3>{girls.map(g=><div className="setting-person" key={g}><b>{g}</b>{["Måndag","Tisdag","Torsdag"].map(day=><div className="setting-row nested" key={day}><span>{day}</span><select value={state.drive[g][day].dit} onChange={e=>setDrive(g,day,"dit",e.target.value)}><option>J</option><option>N</option></select><select value={state.drive[g][day].hem} onChange={e=>setDrive(g,day,"hem",e.target.value)}><option>J</option><option>N</option></select></div>)}</div>)}</div></div>
}

function EditModal({edit,calc,state,onSave,onClose}){
  const r=calc.result[edit.date][edit.dir];
  const [picked,setPicked]=useState(()=>Object.fromEntries(r.drivers.map(d=>[d.name,d.seats])));
  const toggle=g=>setPicked(p=>{const n={...p}; if(g in n) delete n[g]; else n[g]=seatsFor(state,edit.date,edit.dir,g); return n;});
  const capacity=Object.values(picked).reduce((a,b)=>a+b,0), short=capacity<r.needed;
  return <div className="modal-back"><div className="modal"><h3>{fmt(edit.date)} · {edit.dir==="dit"?"DIT":"HEM"}</h3><p className="muted">Välj vilka som kör och hur många platser de har den här gången.</p>
    <div className="modal-drivers">{girls.map(g=><div className={"modal-driver"+(g in picked?" on":"")} key={g}>
      <label><input type="checkbox" checked={g in picked} onChange={()=>toggle(g)}/>{g}</label>
      {g in picked && <select value={picked[g]} onChange={e=>setPicked(p=>({...p,[g]:clampSeats(e.target.value)}))}>{seatOptions.map(n=><option key={n} value={n}>{n} pl</option>)}</select>}
    </div>)}</div>
    <div className={"capacity"+(short?" short":"")}>{r.needed} barn · {capacity} platser{short&&" · resten fylls på automatiskt"}</div>
    <div className="modal-actions"><button className="secondary" onClick={()=>{onSave(edit.date,edit.dir,null);onClose()}}>Automatisk</button><span className="spacer"/><button className="secondary" onClick={onClose}>Avbryt</button><button className="primary" onClick={()=>{onSave(edit.date,edit.dir,picked);onClose()}}>Spara</button></div></div></div>
}

createRoot(document.getElementById("root")).render(<App/>);
