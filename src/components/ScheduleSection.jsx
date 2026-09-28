import { useState } from "react";
import { isoDate } from "../dates.js";
import { now } from "../clock.js";
import DayCard from "./DayCard.jsx";

const views=[["upcoming","Kommande"],["history","Historik"]];

export default function ScheduleSection({season,calc,me,onEdit,onAnswer}){
  const [view,setView]=useState("upcoming");
  const today=isoDate(now());
  const dates=view==="upcoming" ? season.filter(x=>x.date>=today) : season.filter(x=>x.date<today).reverse();
  return <div><h2 className="section-title">Körschema</h2>
    <div className="segmented">{views.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</div>
    <p className="muted">{view==="upcoming"?"Blå = aktuell vecka.":"Senaste först. Tryck Rätta om det inte blev som planerat."}</p>
    {dates.length ? dates.map(x=><DayCard key={x.date} x={x} calc={calc} me={me} onEdit={onEdit} onAnswer={onAnswer}/>) : <div className="card muted">{view==="upcoming"?"Inga fler träningar den här säsongen.":"Inga träningar har passerat än."}</div>}
  </div>
}
