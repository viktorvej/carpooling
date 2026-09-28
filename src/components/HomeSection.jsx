import { isoDate, fmt } from "../dates.js";
import { now } from "../clock.js";
import DayCard from "./DayCard.jsx";

const dirLabel={dit:"🚗 Dit",hem:"🏠 Hem"};

function whenLabel(date,today){
  const days=Math.round((new Date(date+"T00:00:00")-new Date(today+"T00:00:00"))/864e5);
  return days===0?"Idag":days===1?"Imorgon":`Om ${days} dagar`;
}
const list=names=>names.length<2?names.join(""):names.slice(0,-1).join(", ")+" och "+names.at(-1);

// Vad gäller för min familj åt ett håll: kör jag, och vem ska med? Annars: vem åker mitt barn med?
function myTrip(r,me){
  const own=r.cars.find(c=>c.name===me);
  const car=r.cars.find(c=>c.kids.includes(me));
  if(own){
    const others=own.kids.filter(k=>k!==me);
    const elsewhere=car && car!==own && <> · {me} åker med <b>{car.name}</b></>;
    return {drive:true,text:<>Du kör{others.length?<> – ta med <b>{list(others)}</b></>:" – inga fler barn"}{elsewhere}</>};
  }
  if(car) return {text:<>{me} åker med <b>{car.name}</b></>};
  return {warn:true,text:<>⚠️ {me} har ingen plats än</>};
}

export default function HomeSection({season,calc,me,onEdit,onAnswer,onDrive}){
  const today=isoDate(now());
  const upcoming=season.filter(x=>x.date>=today);
  const next=upcoming[0];
  if(!next) return <div className="hero"><h2>Säsongen är slut</h2><p>Det finns inga fler träningar inlagda.</p></div>;
  const day=calc.result[next.date];
  const attending=day.attending.includes(me), unanswered=day.unconfirmed.includes(me);
  const myDrives=upcoming.slice(1).flatMap(x=>["dit","hem"].filter(dir=>calc.result[x.date][dir].drivers.some(d=>d.name===me)).map(dir=>({...x,dir}))).slice(0,5);

  return <div>
    <div className="my-summary">
      <div className="my-when">{whenLabel(next.date,today)} · {fmt(next.date)}</div>
      <div className={"my-question"+(unanswered?" open":"")}>
        {unanswered && <div>❓ {me} står på <b>Ibland</b>. Kommer ni på den här träningen?</div>}
        <div className="my-answers">
          <button className={!unanswered&&attending?"active":""} onClick={()=>onAnswer(next.date,true)}>{!unanswered&&attending?"✓ ":""}Kommer</button>
          <button className={!unanswered&&!attending?"active":""} onClick={()=>onAnswer(next.date,false)}>{!unanswered&&!attending?"✓ ":""}Kommer inte</button>
        </div>
      </div>
      {["dit","hem"].map(dir=>{
        const r=day[dir], t=myTrip(r,me), driver=r.drivers.find(d=>d.name===me), declined=r.declined.includes(me);
        if(!attending && !t.drive && !declined) return null;
        return <div className={"my-line"+(t.drive?" drive":"")+(t.warn?" warn":"")} key={dir}><span>{dirLabel[dir]}</span><div>
          {t.text}
          {driver && (driver.confirmed
            ? <div className="drive-answer done">✓ Du har bekräftat körningen <button className="link" onClick={()=>onDrive(next.date,dir,"no")}>Kan inte köra ändå</button></div>
            : <div className="drive-prompt">
                <div><b>❓ Kan du köra {dir}?</b><span>Bekräfta så att de andra ser att körningen är klar.</span></div>
                <div className="my-answers"><button className="cta" onClick={()=>onDrive(next.date,dir,"yes")}>Ja, jag kör</button><button onClick={()=>onDrive(next.date,dir,"no")}>Kan inte köra</button></div>
              </div>)}
          {declined && <div className="drive-answer done">Du har sagt att du inte kan köra <button className="link" onClick={()=>onDrive(next.date,dir,null)}>Ångra</button></div>}
        </div></div>;
      })}
    </div>
    <DayCard x={next} calc={calc} me={me} onEdit={onEdit} hideWeekBadge/>
    <h2 className="section-title">Dina kommande körningar</h2>
    {myDrives.some(x=>!calc.result[x.date][x.dir].drivers.find(d=>d.name===me)?.confirmed) && <p className="muted">Tryck <b>Bekräfta</b> när du vet att du kan köra, så låses körningen till dig.</p>}
    {myDrives.length
      ? <div className="card my-drives">{myDrives.map(x=>{
          const confirmedDrive=calc.result[x.date][x.dir].drivers.find(d=>d.name===me)?.confirmed;
          return <div key={x.date+x.dir}>
            <span>{fmt(x.date)} <b>{dirLabel[x.dir]}</b>{calc.result[x.date].unconfirmed.includes(me)&&<small className="not-confirmed"> · närvaro ej bekräftad</small>}</span>
            {confirmedDrive ? <span className="drive-ok">✓ Bekräftad</span> : <button className="small-confirm" onClick={()=>onDrive(x.date,x.dir,"yes")}>Bekräfta</button>}
          </div>;
        })}</div>
      : <div className="card muted">Du har inga fler körningar inplanerade just nu.</div>}
  </div>
}
