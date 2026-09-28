import { isoDate, monday, fmt } from "../dates.js";

export default function DayCard({x,calc,onEdit}){
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
