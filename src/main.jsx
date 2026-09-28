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
function key(date,dir,slot){return [date,dir,slot].join("|")}

const initial = {
  attendance: attendanceDefaults,
  drive: driveDefaults,
  manual: {},
};

function useStoredState(){
  const [state,setState]=useState(()=>{
    try{
      const raw=localStorage.getItem("carpooling-state-v1");
      return raw ? JSON.parse(raw) : initial;
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
    result[x.date]={dit:[],hem:[]};
    for(const dir of ["dit","hem"]){
      const eligible=girls.filter(g=>state.attendance[g][x.day]==="J" && state.drive[g][x.day][dir]==="J");
      for(let slot=0;slot<2;slot++){
        const manualValue=state.manual[key(x.date,dir,slot)]||"";
        let chosen=manualValue;
        if(!chosen){
          const candidates=eligible.filter(g=>!result[x.date][dir].includes(g));
          candidates.sort((a,b)=>{
            const ra=attends[a] ? drives[a]/attends[a] : 0;
            const rb=attends[b] ? drives[b]/attends[b] : 0;
            return ra-rb || girls.indexOf(a)-girls.indexOf(b);
          });
          chosen=candidates[0]||"";
        }
        result[x.date][dir].push(chosen);
        if(chosen) drives[chosen]++;
      }
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

  function setManual(date,dir,slot,value){
    setState(s=>{const next={...s,manual:{...s.manual}}; const k=key(date,dir,slot); if(value) next.manual[k]=value; else delete next.manual[k]; return next;});
  }
  function setAtt(name,day,value){setState(s=>({...s,attendance:{...s.attendance,[name]:{...s.attendance[name],[day]:value}}}))}
  function setDrive(name,day,dir,value){setState(s=>({...s,drive:{...s.drive,[name]:{...s.drive[name],[day]:{...s.drive[name][day],[dir]:value}}}}))}

  return <div className="app">
    <header><div className="header-inner"><h1>🤾 Handboll – Samåkning</h1><p>Gemensamt körschema för laget</p></div></header>
    <main>
      {tab==="home" && <HomeSection weeks={[[ "Den här veckan",thisWeek ],[ "Nästa vecka",nextWeek ]] } calc={calc} onEdit={setEdit}/>}
      {tab==="schedule" && <ScheduleSection season={season} calc={calc} onEdit={setEdit}/>}
      {tab==="balance" && <BalanceSection calc={calc}/>}
      {tab==="settings" && <SettingsSection state={state} setAtt={setAtt} setDrive={setDrive} />}
    </main>
    <nav>{[
      ["home","🏠","Översikt"],["schedule","🚗","Körschema"],["balance","⚖️","Körsaldo"],["settings","⚙️","Inställningar"]
    ].map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav>
    {edit && <EditModal edit={edit} calc={calc} onSave={setManual} onClose={()=>setEdit(null)}/>}
  </div>
}

function DayCard({x,calc,onEdit,compact=false}){
  const today=isoDate(new Date()); const currentStart=isoDate(monday(new Date())); const currentEnd=isoDate(new Date(monday(new Date()).getFullYear(),monday(new Date()).getMonth(),monday(new Date()).getDate()+6));
  const past=x.date<today, current=x.date>=currentStart&&x.date<=currentEnd;
  const row=(dir,slot)=>calc.result[x.date]?.[dir]?.[slot]||"—";
  const isManual=(dir,slot)=>!!window.__stateManual?.[key(x.date,dir,slot)];
  return <section className={"day-card "+(past?"past ":"")+(current?"current ":"")}>
    <div className="day-head"><div><b>{fmt(x.date)}</b><span>{x.day}</span></div>{current&&<em>AKTUELL VECKA</em>}</div>
    {["dit","hem"].map(dir=><div className="route" key={dir}>
      <div className="route-label">{dir==="dit"?"🚗 DIT":"🏠 HEM"}</div>
      <div className="driver-list">{[0,1].map(i=><span key={i} className={isManual(dir,i)?"manual-driver":""}>{row(dir,i)}{isManual(dir,i)&&<small>MANUELL</small>}</span>)}</div>
      {!past && <button className="edit-btn" onClick={()=>onEdit({date:x.date,dir})}>Ändra</button>}
    </div>)}
  </section>
}

function HomeSection({weeks,calc,onEdit}){
  window.__stateManual = calc?Object.fromEntries(Object.entries(calc.result).flatMap(([date,r])=>["dit","hem"].flatMap(dir=>[0,1].map(slot=>[key(date,dir,slot),false])))): {};
  return <div><div className="hero"><h2>Vem kör?</h2><p>Tryck <b>Ändra</b> när någon vill ta över en körning.</p></div>{weeks.map(([title,dates])=><div key={title}><h2 className="section-title">{title}</h2>{dates.map(x=><DayCard key={x.date} x={x} calc={calc} onEdit={onEdit}/>)}</div>)}</div>
}

function ScheduleSection({season,calc,onEdit}){
  return <div><h2 className="section-title">Hela körschemat</h2><p className="muted">Grå = passerad · blå = aktuell vecka</p>{season.map(x=><DayCard key={x.date} x={x} calc={calc} onEdit={onEdit}/>)}</div>
}

function BalanceSection({calc}){
  const rows=girls.map(g=>({g,drives:calc.drives[g],attends:calc.attends[g],ratio:calc.attends[g]?calc.drives[g]/calc.attends[g]:0}));
  return <div><h2 className="section-title">Körsaldo</h2><div className="card"><table><thead><tr><th>Tjej</th><th>Körningar</th><th>Deltagit</th><th>Kör/delt.</th></tr></thead><tbody>{rows.map(r=><tr key={r.g}><td><b>{r.g}</b></td><td>{r.drives}</td><td>{r.attends}</td><td>{r.ratio.toFixed(2)}</td></tr>)}</tbody></table></div><div className="card"><b>Så fungerar automatiken</b><p className="muted">Tidigare körningar jämförs med antal deltagna träningar. Nästa förare väljs bland dem som deltar och kan köra den aktuella vägen.</p></div></div>
}

function SettingsSection({state,setAtt,setDrive}){
  return <div><h2 className="section-title">Inställningar</h2><div className="card"><h3>Närvaro</h3>{girls.map(g=><div className="setting-row" key={g}><b>{g}</b>{["Måndag","Tisdag","Torsdag"].map(day=><select key={day} value={state.attendance[g][day]} onChange={e=>setAtt(g,day,e.target.value)}><option>J</option><option>?</option><option>N</option></select>)}</div>)}</div><div className="card"><h3>Körbarhet</h3>{girls.map(g=><div className="setting-person" key={g}><b>{g}</b>{["Måndag","Tisdag","Torsdag"].map(day=><div className="setting-row nested" key={day}><span>{day}</span><select value={state.drive[g][day].dit} onChange={e=>setDrive(g,day,"dit",e.target.value)}><option>J</option><option>N</option></select><select value={state.drive[g][day].hem} onChange={e=>setDrive(g,day,"hem",e.target.value)}><option>J</option><option>N</option></select></div>)}</div>)}</div></div>
}

function EditModal({edit,calc,onSave,onClose}){
  const [a,setA]=useState(calc.result[edit.date][edit.dir][0]||"");
  const [b,setB]=useState(calc.result[edit.date][edit.dir][1]||"");
  return <div className="modal-back"><div className="modal"><h3>{fmt(edit.date)} · {edit.dir==="dit"?"DIT":"HEM"}</h3><p className="muted">Välj förare. "Automatisk" återställer den automatiska fördelningen.</p>{[[0,a,setA],[1,b,setB]].map(([slot,val,setVal])=><label className="modal-row" key={slot}>Körning {slot+1}<select value={val} onChange={e=>setVal(e.target.value)}><option value="">Automatisk</option>{girls.map(g=><option key={g}>{g}</option>)}</select></label>)}<div className="modal-actions"><button className="secondary" onClick={onClose}>Avbryt</button><button className="primary" onClick={()=>{onSave(edit.date,edit.dir,0,a==="Automatisk"?"":a);onSave(edit.date,edit.dir,1,b==="Automatisk"?"":b);onClose()}}>Spara</button></div></div></div>
}

createRoot(document.getElementById("root")).render(<App/>);
