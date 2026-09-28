import { useEffect, useMemo, useState } from "react";
import { isoDate, seasonDates } from "./dates.js";
import { dayNames, girls } from "./data.js";
import { now, mockToday } from "./clock.js";
import { key, clampSeats, calculate, defaultAttending } from "./schedule.js";
import { useStoredState, useDeviceValue } from "./storage.js";
import Onboarding from "./components/Onboarding.jsx";
import HomeSection from "./components/HomeSection.jsx";
import ScheduleSection from "./components/ScheduleSection.jsx";
import BalanceSection from "./components/BalanceSection.jsx";
import SettingsSection from "./components/SettingsSection.jsx";
import EditModal from "./components/EditModal.jsx";

export default function App(){
  const [state,setState]=useStoredState();
  const [tab,setTab]=useState("home");
  const [edit,setEdit]=useState(null);
  const [storedMe,setMe]=useDeviceValue("me");
  const me=girls.includes(storedMe)?storedMe:null;
  const [onboarding,setOnboarding]=useState(false);
  const season=useMemo(seasonDates,[]);
  const todayIso=isoDate(now());
  const calc=useMemo(()=>calculate(state,season,todayIso),[state,season,todayIso]);

  // Frys passerade träningar så att senare ändringar i inställningarna inte skriver om historiken.
  useEffect(()=>{
    const toFreeze=season.filter(x=>x.date<todayIso && !state.history[x.date]);
    if(!toFreeze.length) return;
    const frozen=Object.fromEntries(toFreeze.map(x=>{const r=calc.result[x.date]; return [x.date,{attending:r.attending,dit:{drivers:r.dit.drivers},hem:{drivers:r.hem.drivers}}]}));
    setState(s=>({...s,history:{...frozen,...s.history}}));
  },[calc,season,todayIso,state.history,setState]);

  // picked: {namn: platser} för körningen, eller null för att återställa till automatisk.
  // För passerade träningar skrivs det direkt till historiken, utan automatisk påfyllning.
  // moves: {barn: förare} för manuellt flyttade barn i körningen.
  function setTrip(date,dir,picked,attending,moves){
    setState(s=>{
      const carOverride={...s.carOverride};
      if(moves && Object.keys(moves).length) carOverride[key(date,dir)]=moves; else delete carOverride[key(date,dir)];
      s={...s,carOverride};
      if(s.history[date]){
        const drivers=Object.entries(picked||{}).map(([name,seats])=>({name,seats,manual:true}));
        const day={...s.history[date],[dir]:{drivers}};
        if(attending) day.attending=attending;
        return {...s,history:{...s.history,[date]:day}};
      }
      const manual={...s.manual}, seatOverride={...s.seatOverride}, prefix=key(date,dir)+"|";
      delete manual[key(date,dir)];
      for(const k of Object.keys(seatOverride)) if(k.startsWith(prefix)) delete seatOverride[k];
      if(picked && Object.keys(picked).length){
        manual[key(date,dir)]=Object.keys(picked);
        for(const [name,seats] of Object.entries(picked)) if(seats!==s.seats[name]) seatOverride[key(date,dir,name)]=seats;
      }
      const attendanceOverride={...s.attendanceOverride};
      if(attending){
        const standard=defaultAttending(s,dayNames[new Date(date+"T00:00:00").getDay()]);
        if(attending.length===standard.length && attending.every(g=>standard.includes(g))) delete attendanceOverride[date];
        else attendanceOverride[date]=attending;
      }
      return {...s,manual,seatOverride,attendanceOverride};
    });
  }
  function setSeats(name,value){setState(s=>({...s,seats:{...s.seats,[name]:clampSeats(value)}}))}
  function setAtt(name,day,value){setState(s=>({...s,attendance:{...s.attendance,[name]:{...s.attendance[name],[day]:value}}}))}
  function setDrive(name,day,dir,value){setState(s=>({...s,drive:{...s.drive,[name]:{...s.drive[name],[day]:{...s.drive[name][day],[dir]:value}}}}))}
  function setFamily(name,{attendance,drive,seats}){
    setState(s=>({...s,attendance:{...s.attendance,[name]:attendance},drive:{...s.drive,[name]:drive},seats:{...s.seats,[name]:clampSeats(seats)}}));
    setMe(name); setOnboarding(false);
  }

  if(!me || onboarding) return <Onboarding state={state} me={me} onDone={setFamily} onCancel={me?()=>setOnboarding(false):null}/>;

  return <div className="app">
    <header><div className="header-inner"><h1>🤾 Handboll – Samåkning</h1><p>Gemensamt körschema för laget</p></div></header>
    {mockToday && <div className="test-banner">Testläge: idag = {mockToday} · separat testdata · <a href="?">avsluta</a></div>}
    <main>
      {tab==="home" && <HomeSection season={season} calc={calc} me={me} onEdit={setEdit}/>}
      {tab==="schedule" && <ScheduleSection season={season} calc={calc} me={me} onEdit={setEdit}/>}
      {tab==="balance" && <BalanceSection calc={calc}/>}
      {tab==="settings" && <SettingsSection state={state} me={me} onChangeMe={()=>setOnboarding(true)} setAtt={setAtt} setDrive={setDrive} setSeats={setSeats} />}
    </main>
    <nav>{[
      ["home","🏠","Översikt"],["schedule","🚗","Körschema"],["balance","⚖️","Körsaldo"],["settings","⚙️","Inställningar"]
    ].map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav>
    {edit && <EditModal edit={edit} calc={calc} state={state} onSave={setTrip} onClose={()=>setEdit(null)}/>}
  </div>
}
