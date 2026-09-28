import { useState } from "react";
import { girls, trainingDays } from "../data.js";
import { seatOptions } from "../schedule.js";
import { isoDate } from "../dates.js";
import { now } from "../clock.js";
import UnconfirmedDrives from "./UnconfirmedDrives.jsx";

const views=[["attendance","Närvaro"],["drive","Kör"],["seats","Platser"]];
const nextAttendance={J:"?","?":"N",N:"J"};
const attendanceLabel={J:"Ja","?":"Ibland",N:"Nej"};
const short=day=>day.slice(0,3);

// Alla familjers normala inställningar i kompakta tabeller. Tryck i en cell för att ändra.
const confirmedLabel=date=>new Date(date+"T00:00:00").toLocaleDateString("sv-SE",{day:"numeric",month:"short"});

export default function AdminSection({state,calc,season,setAtt,setDrive,setSeats}){
  const [view,setView]=useState("attendance");
  const done=girls.filter(g=>state.confirmed[g]);
  return <div><h2 className="section-title">Admin</h2>
    <UnconfirmedDrives calc={calc} season={season} today={isoDate(now())}/>
    <div className={"card admin-status"+(done.length===girls.length?" all-done":"")}>
      <b>{done.length} av {girls.length} familjer har fyllt i sina inställningar</b>
      {done.length<girls.length && <p className="muted">Inte ifyllt: {girls.filter(g=>!state.confirmed[g]).join(", ")}. De har fortfarande standardinställningarna, om inte admin ändrat dem.</p>}
    </div>
    <div className="segmented">{views.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</div>
    <p className="muted">{view==="attendance"?"Tryck för att växla Ja → Ibland → Nej.":view==="drive"?"Tryck på Dit eller Hem för att slå på eller av.":"Hur många barn bilen normalt tar, inklusive det egna barnet."}</p>
    <div className="card admin-table"><table>
      <thead><tr><th>Barn</th>{view==="seats"?<th>Platser</th>:trainingDays.map(day=><th key={day}>{short(day)}</th>)}</tr></thead>
      <tbody>{girls.map(g=><tr key={g}><td><b>{g}</b>{state.confirmed[g]
          ? <span className="family-status ok" title="Föräldern har bekräftat sina inställningar">✓ {confirmedLabel(state.confirmed[g])}</span>
          : <span className="family-status" title="Föräldern har inte varit inne och bekräftat">Ej ifyllt</span>}</td>
        {view==="attendance" && trainingDays.map(day=>{const v=state.attendance[g][day]; return <td key={day}>
          <button className={"cell att-"+(v==="?"?"maybe":v)} onClick={()=>setAtt(g,day,nextAttendance[v])}>{attendanceLabel[v]}</button></td>;})}
        {view==="drive" && trainingDays.map(day=><td key={day}><div className="cell-pair">{["dit","hem"].map(dir=>{const on=state.drive[g][day][dir]==="J"; return <button key={dir} className={"cell"+(on?" on":"")} onClick={()=>setDrive(g,day,dir,on?"N":"J")}>{dir==="dit"?"Dit":"Hem"}</button>;})}</div></td>)}
        {view==="seats" && <td><select value={state.seats[g]} onChange={e=>setSeats(g,e.target.value)}>{seatOptions.map(n=><option key={n} value={n}>{n}</option>)}</select></td>}
      </tr>)}</tbody>
    </table></div>
  </div>
}
