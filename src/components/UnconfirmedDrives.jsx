import { fmt, isoDate } from "../dates.js";
import { ANSWER_WINDOW_DAYS } from "../schedule.js";

// Admin: körningar inom en vecka där föraren inte bekräftat, och körningar som saknar förare.
export default function UnconfirmedDrives({calc,season,today}){
  const end=new Date(today+"T00:00:00"); end.setDate(end.getDate()+7);
  const weekAhead=isoDate(end);
  const rows=season.filter(x=>!calc.result[x.date].done && x.date<=weekAhead).flatMap(x=>["dit","hem"].flatMap(dir=>{
    const r=calc.result[x.date][dir];
    const out=r.drivers.filter(d=>!d.confirmed).map(d=>({x,dir,text:d.name}));
    if(r.capacity<r.needed) out.push({x,dir,text:`${r.needed-r.capacity} platser saknas`,problem:true});
    return out;
  }));
  // Familjer som inte svarat om de kommer, för träningar inom svarsfönstret.
  const unanswered=season.filter(x=>calc.result[x.date].soon && calc.result[x.date].unconfirmed.length);
  return <>
    <div className="card">
      <h3>Har inte svarat</h3><p className="muted">Träningar de närmaste {ANSWER_WINDOW_DAYS} dagarna där familjer inte svarat om de kommer.</p>
      {unanswered.length ? <div className="my-drives">{unanswered.map(x=><div key={x.date}>
        <span>{fmt(x.date)}</span><span className="not-confirmed">{calc.result[x.date].unconfirmed.join(", ")}</span>
      </div>)}</div> : <p className="drive-ok">✓ Alla har svarat.</p>}
    </div>
    <div className="card">
      <h3>Obekräftade körningar</h3><p className="muted">Kommande 7 dagarna.</p>
      {rows.length ? <div className="my-drives">{rows.map((r,i)=><div key={i}>
        <span>{fmt(r.x.date)} <b>{r.dir==="dit"?"🚗 Dit":"🏠 Hem"}</b></span>
        <span className={r.problem?"pin-error":"not-confirmed"}>{r.text}</span>
      </div>)}</div> : <p className="drive-ok">✓ Alla körningar den närmaste veckan är bekräftade.</p>}
    </div>
  </>;
}
