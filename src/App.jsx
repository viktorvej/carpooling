import { useMemo, useState } from "react";
import { monday, weekDates, seasonDates } from "./dates.js";
import { key, clampSeats, calculate } from "./schedule.js";
import { useStoredState } from "./storage.js";
import HomeSection from "./components/HomeSection.jsx";
import ScheduleSection from "./components/ScheduleSection.jsx";
import BalanceSection from "./components/BalanceSection.jsx";
import SettingsSection from "./components/SettingsSection.jsx";
import EditModal from "./components/EditModal.jsx";

export default function App(){
  const [state,setState]=useStoredState();
  const [tab,setTab]=useState("home");
  const [edit,setEdit]=useState(null);
  const season=useMemo(seasonDates,[]);
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
