import { useEffect, useMemo, useState } from "react";
import { isoDate, seasonDates, isDone } from "./dates.js";
import { dayNames, girls } from "./data.js";
import { now, mockToday } from "./clock.js";
import { isPreview } from "./env.js";
import { key, clampSeats, calculate, withAttendance, answerAttendance, answerDrive, ownerOf } from "./schedule.js";
import { useAppState, useDeviceValue } from "./storage.js";
import { useTab } from "./useTab.js";
import Onboarding from "./components/Onboarding.jsx";
import AdminSection from "./components/AdminSection.jsx";
import HomeSection from "./components/HomeSection.jsx";
import ScheduleSection from "./components/ScheduleSection.jsx";
import BalanceSection from "./components/BalanceSection.jsx";
import SettingsSection from "./components/SettingsSection.jsx";
import EditModal from "./components/EditModal.jsx";

export default function App(){
  const [state,setState,status]=useAppState();
  const [tab,setTab]=useTab();
  const [edit,setEdit]=useState(null);
  const [storedMe,setMe]=useDeviceValue("me");
  const me=girls.includes(storedMe)?storedMe:null;
  const [onboarding,setOnboarding]=useState(false);
  const [admin,setAdmin]=useDeviceValue("admin");
  // "light" eller "dark" tvingar ett tema; utan värde följer appen enhetens inställning.
  const [theme,setTheme]=useDeviceValue("theme");
  useEffect(()=>{
    if(theme) document.documentElement.dataset.theme=theme; else delete document.documentElement.dataset.theme;
  },[theme]);
  const season=useMemo(seasonDates,[]);
  // Klockan tickar varje minut så att en träning flyttas till historiken även om appen står öppen.
  // Beräkningen görs bara om när datumet eller antalet genomförda träningar ändras.
  const [,setTick]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setTick(t=>t+1),60e3); return ()=>clearInterval(id);},[]);
  const current=now(), todayIso=isoDate(current);
  const doneCount=season.filter(x=>isDone(x,current)).length;
  const calc=useMemo(()=>calculate(state,season,now()),[state,season,todayIso,doneCount]);

  // Frys genomförda träningar så att senare ändringar i inställningarna inte skriver om historiken.
  useEffect(()=>{
    if(!status.canFreeze) return;
    const toFreeze=season.filter(x=>calc.result[x.date].done && !state.history[x.date]);
    if(!toFreeze.length) return;
    const frozen=Object.fromEntries(toFreeze.map(x=>{const r=calc.result[x.date]; return [x.date,{attending:r.attending,dit:{drivers:r.dit.drivers},hem:{drivers:r.hem.drivers}}]}));
    setState(s=>({...s,history:{...frozen,...s.history}}));
  },[calc,season,state.history,setState,status.canFreeze]);

  // picked: {namn: platser} för körningen, eller null för att återställa till automatisk.
  // För passerade träningar skrivs det direkt till historiken, utan automatisk påfyllning.
  // moves: {barn: förare} för manuellt flyttade barn i körningen.
  function setTrip(date,dir,picked,attending,moves,resetAttendance=false){
    setState(s=>{
      const carOverride={...s.carOverride};
      if(moves && Object.keys(moves).length) carOverride[key(date,dir)]=moves; else delete carOverride[key(date,dir)];
      s={...s,carOverride};
      if(s.history[date]){
        const drivers=Object.entries(picked||{}).map(([name,seats])=>({name,seats,manual:true}));
        const day={...s.history[date],[dir]:{drivers}};
        if(attending && (attending.length!==day.attending.length || attending.some(g=>!day.attending.includes(g)))){
          day.attending=attending; day.attendanceEdited=true;
        }
        return {...s,history:{...s.history,[date]:day}};
      }
      const manual={...s.manual}, seatOverride={...s.seatOverride}, prefix=key(date,dir)+"|";
      delete manual[key(date,dir)];
      for(const k of Object.keys(seatOverride)) if(k.startsWith(prefix)) delete seatOverride[k];
      if(picked && Object.keys(picked).length){
        manual[key(date,dir)]=Object.keys(picked);
        for(const [name,seats] of Object.entries(picked)) if(seats!==s.seats[ownerOf(name)]) seatOverride[key(date,dir,name)]=seats;
      }
      s={...s,manual,seatOverride};
      // Valda förare i Ändra gäller: en borttagen förare tappar sin bekräftelse, och en som valts
      // trots "Kan inte köra" räknas inte längre som avböjd.
      if(picked){
        const trip=key(date,dir), keep=(obj,f)=>{const list=(obj[trip]||[]).filter(f), o={...obj}; if(list.length) o[trip]=list; else delete o[trip]; return o;};
        s={...s,driverConfirmed:keep(s.driverConfirmed,n=>n in picked),declined:keep(s.declined,n=>!(n in picked))};
      }
      return attending ? withAttendance(s,date,dayNames[new Date(date+"T00:00:00").getDay()],attending,{reset:resetAttendance}) : s;
    });
  }
  // Förarens svar för en körning: "yes" (Jag kör), "no" (Kan inte köra) eller null (ångra).
  function answerTrip(date,dir,ans){setState(s=>answerDrive(s,date,dir,me,ans))}
  // Förälderns svar för en träning: kommer vi eller inte?
  function answer(date,coming){setState(s=>answerAttendance(s,date,me,coming))}
  // Svara för flera träningar på en gång: [[datum, kommer], ...]
  function answerMany(list){setState(s=>list.reduce((acc,[date,coming])=>answerAttendance(acc,date,me,coming),s))}
  // confirm: ändringen görs av föräldern själv (guiden eller Inställningar), inte av admin.
  const confirmed=(s,name,confirm)=>confirm ? {...s,confirmed:{...s.confirmed,[name]:isoDate(new Date())}} : s;
  function setSeats(name,value,confirm){setState(s=>confirmed({...s,seats:{...s.seats,[name]:clampSeats(value)}},name,confirm))}
  function setAtt(name,day,value,confirm){setState(s=>confirmed({...s,attendance:{...s.attendance,[name]:{...s.attendance[name],[day]:value}}},name,confirm))}
  function setDrive(name,day,dir,value,confirm){setState(s=>confirmed({...s,drive:{...s.drive,[name]:{...s.drive[name],[day]:{...s.drive[name][day],[dir]:value}}}},name,confirm))}
  function setFamily(name,{attendance,drive,seats}){
    setState(s=>confirmed({...s,attendance:{...s.attendance,[name]:attendance},drive:{...s.drive,[name]:drive},seats:{...s.seats,[name]:clampSeats(seats)}},name,true));
    setMe(name); setOnboarding(false);
  }

  if(!status.ready) return <div className="loading">{status.error ? <p className="loading-error">{status.error}</p> : "Hämtar körschemat…"}</div>;
  if(!me || onboarding) return <Onboarding state={state} me={me} onDone={setFamily} onCancel={me?()=>setOnboarding(false):null}/>;

  // /admin utan upplåst admin-läge visar översikten.
  const shown=tab==="admin"&&!admin?"home":tab;

  return <div className="app">
    <header><div className="header-inner"><h1>🤾 Handboll – Samåkning</h1><p>Gemensamt körschema för laget</p></div></header>
    {status.error && <div className="error-banner">{status.error}</div>}
    {isPreview && !mockToday && <div className="test-banner">Testversion – ändringar här påverkar inte det riktiga schemat</div>}
    {mockToday && <div className="test-banner">Testläge: idag = {mockToday} · separat testdata · <a href="?">avsluta</a></div>}
    <main>
      {shown==="home" && <HomeSection season={season} calc={calc} me={me} onEdit={setEdit} onAnswer={answer} onAnswerMany={answerMany} onDrive={answerTrip}/>}
      {shown==="schedule" && <ScheduleSection season={season} calc={calc} me={me} onEdit={setEdit} onAnswer={answer}/>}
      {shown==="balance" && <BalanceSection calc={calc}/>}
      {shown==="settings" &&<SettingsSection state={state} me={me} onChangeMe={()=>setOnboarding(true)} onConfirm={()=>setState(s=>confirmed(s,me,true))} admin={!!admin} setAdmin={setAdmin} theme={theme} setTheme={setTheme} setAtt={setAtt} setDrive={setDrive} setSeats={setSeats} />}
      {shown==="admin" && <AdminSection state={state} calc={calc} season={season} setAtt={setAtt} setDrive={setDrive} setSeats={setSeats} />}
    </main>
    <nav>{[
      ["home","🏠","Översikt"],["schedule","🚗","Körschema"],["balance","⚖️","Körsaldo"],["settings","⚙️","Inställningar"],
      ...(admin?[["admin","🛠️","Admin"]]:[])
    ].map(([id,icon,label])=><button key={id} className={shown===id?"active":""} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav>
    {edit && <EditModal edit={edit} calc={calc} state={state} onSave={setTrip} onClose={()=>setEdit(null)}/>}
  </div>
}
