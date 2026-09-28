import { isoDate, fmt, fmtTime, trainingTime } from "../dates.js";
import { now } from "../clock.js";
import { answerState } from "../schedule.js";
import DayCard from "./DayCard.jsx";
import AnswerButtons from "./AnswerButtons.jsx";

const dirLabel={dit:"🚗 Dit",hem:"🏠 Hem"};

function whenLabel(date,today){
  const days=Math.round((new Date(date+"T00:00:00")-new Date(today+"T00:00:00"))/864e5);
  return days===0?"Idag":days===1?"Imorgon":`Om ${days} dagar`;
}
const joinList=items=>items.flatMap((x,i)=>[i===0?"":i===items.length-1?" och ":", ",x]);

// Barnen föraren ska ta med, med ✓ för de som svarat att de kommer och "ej svarat" inom svarsfönstret.
function kidStatus(day,k){
  if(day.answered[k]===true) return <span key={k}><b>{k}</b> <span className="kid-ok">✓</span></span>;
  if(day.soon && day.unconfirmed.includes(k)) return <span key={k}><b>{k}</b> <span className="kid-unanswered">(ej svarat)</span></span>;
  return <b key={k}>{k}</b>;
}

// Vad gäller för min familj åt ett håll: kör jag, och vem ska med? Annars: vem åker mitt barn med?
function myTrip(day,r,me){
  const own=r.cars.find(c=>c.name===me);
  const car=r.cars.find(c=>c.kids.includes(me));
  if(own){
    const others=own.kids.filter(k=>k!==me);
    const elsewhere=car && car!==own && <> · {me} åker med <b>{car.name}</b></>;
    return {drive:true,text:<>Du kör{others.length?<> – ta med {joinList(others.map(k=>kidStatus(day,k)))}</>:" – inga fler barn"}{elsewhere}</>};
  }
  if(car) return {text:<>{me} åker med <b>{car.name}</b></>};
  return {warn:true,text:<>⚠️ {me} har ingen plats än</>};
}

export default function HomeSection({season,calc,me,onEdit,onAnswer,onAnswerMany,onDrive}){
  const today=isoDate(now());
  const upcoming=season.filter(x=>!calc.result[x.date].done);
  const next=upcoming[0];
  if(!next) return <div className="hero"><h2>Säsongen är slut</h2><p>Det finns inga fler träningar inlagda.</p></div>;
  const day=calc.result[next.date];
  const attending=day.attending.includes(me), {answered}=answerState(day,me);
  const ask=!answered && (day.soon || day.maybe.includes(me));
  const myDrives=upcoming.slice(1).flatMap(x=>["dit","hem"].filter(dir=>calc.result[x.date][dir].drivers.some(d=>d.name===me)).map(dir=>({...x,dir}))).slice(0,5);
  // Kommande veckans träningar (efter nästa) att svara på, och de som kan bekräftas enligt förslaget.
  const weekEnd=new Date(today+"T00:00:00"); weekEnd.setDate(weekEnd.getDate()+7);
  const week=upcoming.slice(1).filter(x=>x.date<=isoDate(weekEnd));
  const toConfirm=[next,...week].map(x=>[x.date,answerState(calc.result[x.date],me)]).filter(([,s])=>!s.answered && s.value!==null).map(([date,s])=>[date,s.value]);

  return <div>
    <div className="my-summary">
      <div className="my-when">{whenLabel(next.date,today)} · {fmt(next.date)}{trainingTime(next.day)&&` · ${fmtTime(trainingTime(next.day).start)}–${fmtTime(trainingTime(next.day).end)}`}</div>
      <div className={"my-question"+(ask?" open":"")}>
        {ask && <div>❓ {day.maybe.includes(me)?<>{me} står på <b>Ibland</b>. Kommer ni?</>:<>Kommer {me}? Svara så att föraren vet.</>}</div>}
        <AnswerButtons day={day} me={me} className="my-answers" onAnswer={v=>onAnswer(next.date,v)}/>
      </div>
      {["dit","hem"].map(dir=>{
        const r=day[dir], t=myTrip(day,r,me), driver=r.drivers.find(d=>d.name===me), declined=r.declined.includes(me);
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
    {week.length>0 && <>
      <h2 className="section-title">Kommer {me} den närmaste veckan?</h2>
      <div className="card week-answers">
        {week.map(x=><div key={x.date}><span>{fmt(x.date)}</span><AnswerButtons day={calc.result[x.date]} me={me} onAnswer={v=>onAnswer(x.date,v)}/></div>)}
        {toConfirm.length>0 && <button className="primary confirm-all" onClick={()=>onAnswerMany(toConfirm)}>Bekräfta förslagen ({toConfirm.length})</button>}
        <p className="muted">Streckad kant = förslag från dina inställningar, inte svarat än.</p>
      </div>
    </>}
    <h2 className="section-title">Dina kommande körningar</h2>
    {myDrives.some(x=>!calc.result[x.date][x.dir].drivers.find(d=>d.name===me)?.confirmed) && <p className="muted">Tryck <b>Bekräfta</b> när du vet att du kan köra, så låses körningen till dig.</p>}
    {myDrives.length
      ? <div className="card my-drives">{myDrives.map(x=>{
          const confirmedDrive=calc.result[x.date][x.dir].drivers.find(d=>d.name===me)?.confirmed;
          return <div key={x.date+x.dir}>
            <span>{fmt(x.date)} <b>{dirLabel[x.dir]}</b></span>
            {confirmedDrive ? <span className="drive-ok">✓ Bekräftad</span> : <button className="small-confirm" onClick={()=>onDrive(x.date,x.dir,"yes")}>Bekräfta</button>}
          </div>;
        })}</div>
      : <div className="card muted">Du har inga fler körningar inplanerade just nu.</div>}
  </div>
}
