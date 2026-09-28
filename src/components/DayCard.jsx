import { isoDate, monday, fmt } from "../dates.js";
import { now } from "../clock.js";

export default function DayCard({x,calc,me,onEdit,onAnswer,hideWeekBadge=false}){
  const today=isoDate(now()); const currentStart=isoDate(monday(now())); const currentEnd=isoDate(new Date(monday(now()).getFullYear(),monday(now()).getMonth(),monday(now()).getDate()+6));
  const past=x.date<today, current=x.date>=currentStart&&x.date<=currentEnd;
  const name=n=>n===me?<span className="me-name">{n}</span>:n;
  // Obekräftade förare markeras först när träningen är inom en vecka, så att det inte blir brus.
  const soon=!past && (new Date(x.date+"T00:00:00")-new Date(today+"T00:00:00"))/864e5<=7;
  return <section className={"day-card "+(past?"past ":"")+(current&&!hideWeekBadge?"current ":"")}>
    <div className="day-head"><div><b>{fmt(x.date)}</b><span>{x.day}</span></div>
      <div className="day-badges">{calc.result[x.date].attendanceChanged&&<em className="manual-badge" title="Närvaron har ändrats för just den här träningen">NÄRVARO ÄNDRAD</em>}{current&&!hideWeekBadge&&<em>AKTUELL VECKA</em>}</div></div>
    {!past && onAnswer && me && (()=>{
      const d=calc.result[x.date], open=d.unconfirmed.includes(me), coming=d.attending.includes(me);
      return <div className={"card-answer"+(open?" open":"")}><span>{me}:</span>
        <button className={!open&&coming?"active":""} onClick={()=>onAnswer(x.date,true)}>Kommer</button>
        <button className={!open&&!coming?"active":""} onClick={()=>onAnswer(x.date,false)}>Kommer inte</button>
      </div>;
    })()}
    {!past && calc.result[x.date].unconfirmed.length>0 && <div className="unconfirmed" title="Står på Ibland och har inte svarat för den här träningen">⚠️ Inte bekräftat: {calc.result[x.date].unconfirmed.map((k,j)=><span key={k}>{j>0&&", "}{name(k)}</span>)}</div>}
    {["dit","hem"].map(dir=>{
      const r=calc.result[x.date][dir], short=r.capacity<r.needed;
      return <div className="route" key={dir}>
        <div className="route-label">{dir==="dit"?"🚗 DIT":"🏠 HEM"}</div>
        <div>
          {r.drivers.length ? r.drivers.map((d,i)=><div className="driver-car" key={d.name}>
            <span className="driver"><b className={"driver-name"+(d.manual?" manual-driver":"")}>{name(d.name)}</b>{d.confirmed&&<span className="driver-ok" title="Föraren har bekräftat körningen">✓</span>}{!d.confirmed&&soon&&<small className="unconfirmed-driver" title="Föraren har inte bekräftat körningen">EJ BEKRÄFTAD</small>}<small className="seats">{r.cars[i].kids.length}/{d.seats}</small>{d.manual&&<small>MANUELL</small>}</span>
            {(()=>{const others=r.cars[i].kids.filter(k=>k!==d.name); return others.length>0 && <span className="car-kids">med {others.map((k,j)=><span key={k}>{j>0&&", "}{r.moved.includes(k)?<span className="moved" title="Manuellt flyttad">{name(k)}</span>:name(k)}</span>)}</span>;})()}
          </div>) : <div className="driver-car">—</div>}
          {r.unplaced.length>0 && <div className="driver-car unplaced">Utan plats: {r.unplaced.join(", ")}</div>}
          <div className={"capacity"+(short?" short":"")}>{r.needed} barn · {r.capacity} platser{short&&` · ${r.needed-r.capacity} saknas`}</div>
        </div>
        <button className="edit-btn" onClick={()=>onEdit({date:x.date,dir})}>{past?"Rätta":"Ändra"}</button>
      </div>;
    })}
  </section>
}
