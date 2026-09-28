import { isoDate, monday, fmt, fmtTime, trainingTime } from "../dates.js";
import { now } from "../clock.js";
import AnswerButtons from "./AnswerButtons.jsx";

export default function DayCard({x,calc,me,onEdit,onAnswer,hideWeekBadge=false}){
  const currentStart=isoDate(monday(now())); const currentEnd=isoDate(new Date(monday(now()).getFullYear(),monday(now()).getMonth(),monday(now()).getDate()+6));
  const past=calc.result[x.date].done, current=x.date>=currentStart&&x.date<=currentEnd;
  const time=trainingTime(x.day);
  const day=calc.result[x.date];
  // Obekräftade förare och barn som inte svarat markeras bara inom svarsfönstret, så att det inte blir brus.
  const soon=day.soon;
  const name=n=>n===me?<span className="me-name">{n}</span>:n;
  // Passagerare som svarat att de kommer får en liten bock, så att föraren ser vilka som är klara.
  const kidName=k=><>{name(k)}{!past&&day.answered[k]===true&&<span className="kid-answered" title="Har svarat att de kommer">✓</span>}</>;
  return <section className={"day-card "+(past?"past ":"")+(current&&!hideWeekBadge?"current ":"")}>
    <div className="day-head"><div><b>{fmt(x.date)}</b><span>{time?`Träning ${fmtTime(time.start)}–${fmtTime(time.end)}`:x.day}</span></div>
      <div className="day-badges">{day.attendanceChanged&&<em className="manual-badge" title="Närvaron har ändrats för just den här träningen">NÄRVARO ÄNDRAD</em>}{current&&!hideWeekBadge&&<em>AKTUELL VECKA</em>}</div></div>
    {!past && onAnswer && me && <AnswerButtons day={day} me={me} label={me+":"} onAnswer={v=>onAnswer(x.date,v)}/>}
    {soon && day.unconfirmed.length>0 && <div className="unconfirmed" title="Planerade men har inte svarat om de kommer">⚠️ Har inte svarat: {day.unconfirmed.map((k,j)=><span key={k}>{j>0&&", "}{k===me?<span className="me-name">{k}</span>:k}</span>)}</div>}
    {["dit","hem"].map(dir=>{
      const r=calc.result[x.date][dir], short=r.capacity<r.needed;
      return <div className="route" key={dir}>
        <div className="route-label">{dir==="dit"?"🚗 DIT":"🏠 HEM"}{time&&<span title={dir==="dit"?"Träningen börjar":"Träningen slutar"}>{fmtTime(dir==="dit"?time.start:time.end)}</span>}</div>
        <div>
          {r.drivers.length ? r.drivers.map((d,i)=><div className="driver-car" key={d.name}>
            <span className="driver"><b className={"driver-name"+(d.manual?" manual-driver":"")}>{name(d.name)}</b>{d.confirmed&&<span className="driver-ok" title="Föraren har bekräftat körningen">✓</span>}{!d.confirmed&&soon&&<small className="unconfirmed-driver" title="Föraren har inte bekräftat körningen">EJ BEKRÄFTAD</small>}<small className="seats">{r.cars[i].kids.length}/{d.seats}</small>{d.manual&&<small>MANUELL</small>}</span>
            {(()=>{const others=r.cars[i].kids.filter(k=>k!==d.name); return others.length>0 && <span className="car-kids">med {others.map((k,j)=><span key={k}>{j>0&&", "}{r.moved.includes(k)?<span className="moved" title="Manuellt flyttad">{kidName(k)}</span>:kidName(k)}</span>)}</span>;})()}
          </div>) : <div className="driver-car">—</div>}
          {r.unplaced.length>0 && <div className="driver-car unplaced">Utan plats: {r.unplaced.join(", ")}</div>}
          <div className={"capacity"+(short?" short":"")}>{r.needed} barn · {r.capacity} platser{short&&` · ${r.needed-r.capacity} saknas`}</div>
        </div>
        <button className="edit-btn" onClick={()=>onEdit({date:x.date,dir})}>{past?"Rätta":"Ändra"}</button>
      </div>;
    })}
  </section>
}
