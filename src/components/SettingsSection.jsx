import { girls, trainingDays } from "../data.js";
import { seatOptions } from "../schedule.js";

export default function SettingsSection({state,setAtt,setDrive,setSeats}){
  return <div><h2 className="section-title">Inställningar</h2>
    <div className="card"><h3>Platser i bilen</h3><p className="muted">Hur många barn bilen normalt tar, inklusive det egna barnet. Kan ändras per körning via Ändra.</p>{girls.map(g=><div className="setting-row seats-row" key={g}><b>{g}</b><select value={state.seats[g]} onChange={e=>setSeats(g,e.target.value)}>{seatOptions.map(n=><option key={n} value={n}>{n}</option>)}</select></div>)}</div>
    <div className="card"><h3>Närvaro</h3>{girls.map(g=><div className="setting-row" key={g}><b>{g}</b>{trainingDays.map(day=><select key={day} value={state.attendance[g][day]} onChange={e=>setAtt(g,day,e.target.value)}><option>J</option><option>?</option><option>N</option></select>)}</div>)}</div>
    <div className="card"><h3>Körbarhet</h3>{girls.map(g=><div className="setting-person" key={g}><b>{g}</b>{trainingDays.map(day=><div className="setting-row nested" key={day}><span>{day}</span><select value={state.drive[g][day].dit} onChange={e=>setDrive(g,day,"dit",e.target.value)}><option>J</option><option>N</option></select><select value={state.drive[g][day].hem} onChange={e=>setDrive(g,day,"hem",e.target.value)}><option>J</option><option>N</option></select></div>)}</div>)}</div>
  </div>
}
