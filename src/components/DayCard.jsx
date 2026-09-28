import { isoDate, monday, fmt } from "../dates.js";
import { now } from "../clock.js";

export default function DayCard({x,calc,me,onEdit,hideWeekBadge=false}){
  const today=isoDate(now()); const currentStart=isoDate(monday(now())); const currentEnd=isoDate(new Date(monday(now()).getFullYear(),monday(now()).getMonth(),monday(now()).getDate()+6));
  const past=x.date<today, current=x.date>=currentStart&&x.date<=currentEnd;
  const name=n=>n===me?<span className="me-name">{n}</span>:n;
  return <section className={"day-card "+(past?"past ":"")+(current&&!hideWeekBadge?"current ":"")}>
    <div className="day-head"><div><b>{fmt(x.date)}</b><span>{x.day}</span></div>{current&&!hideWeekBadge&&<em>AKTUELL VECKA</em>}</div>
    {["dit","hem"].map(dir=>{
      const r=calc.result[x.date][dir], short=r.capacity<r.needed;
      return <div className="route" key={dir}>
        <div className="route-label">{dir==="dit"?"🚗 DIT":"🏠 HEM"}</div>
        <div>
          {r.drivers.length ? r.drivers.map((d,i)=><div className="driver-car" key={d.name}>
            <span className="driver"><b className={"driver-name"+(d.manual?" manual-driver":"")}>{name(d.name)}</b><small className="seats">{r.cars[i].kids.length}/{d.seats}</small>{d.manual&&<small>MANUELL</small>}</span>
            {(()=>{const others=r.cars[i].kids.filter(k=>k!==d.name); return others.length>0 && <span className="car-kids">med {others.map((k,j)=><span key={k}>{j>0&&", "}{name(k)}</span>)}</span>;})()}
          </div>) : <div className="driver-car">—</div>}
          {r.unplaced.length>0 && <div className="driver-car unplaced">Utan plats: {r.unplaced.join(", ")}</div>}
          <div className={"capacity"+(short?" short":"")}>{r.needed} barn · {r.capacity} platser{short&&` · ${r.needed-r.capacity} saknas`}</div>
        </div>
        <button className="edit-btn" onClick={()=>onEdit({date:x.date,dir})}>{past?"Rätta":"Ändra"}</button>
      </div>;
    })}
  </section>
}
