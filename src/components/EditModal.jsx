import { useState } from "react";
import { girls } from "../data.js";
import { fmt } from "../dates.js";
import { key, seatOptions, clampSeats, seatsFor, assignCars } from "../schedule.js";
import CarBoard from "./CarBoard.jsx";

export default function EditModal({edit,calc,state,onSave,onClose}){
  const day=calc.result[edit.date], r=day[edit.dir], frozen=day.frozen;
  const [picked,setPicked]=useState(()=>Object.fromEntries(r.drivers.map(d=>[d.name,d.seats])));
  const [attending,setAttending]=useState(day.attending);
  // Förarna låses bara som manuella om användaren faktiskt ändrat dem (eller de redan var manuella).
  const [touched,setTouched]=useState(false);
  const toggle=g=>{setTouched(true); setPicked(p=>{const n={...p}; if(g in n) delete n[g]; else n[g]=seatsFor(state,edit.date,edit.dir,g); return n;});};
  const lockDrivers=frozen||touched||r.drivers.some(d=>d.manual);
  const needed=attending.length;
  const capacity=Object.values(picked).reduce((a,b)=>a+b,0), short=capacity<needed;
  const [moves,setMoves]=useState(()=>state.carOverride[key(edit.date,edit.dir)]||{});
  const {cars,unplaced,moved}=assignCars(Object.entries(picked).map(([name,seats])=>({name,seats})),attending,moves);
  const keptMoves=()=>Object.fromEntries(Object.entries(moves).filter(([kid,car])=>attending.includes(kid) && car in picked));
  // Samma förare, platser och placering även åt andra hållet. Då låses förarna så att båda blir lika.
  const other=edit.dir==="dit"?"hem":"dit";
  const [both,setBoth]=useState(false);
  function save(drivers,moves,resetAttendance=false){
    onSave(edit.date,edit.dir,drivers,attending,moves,resetAttendance);
    if(both) onSave(edit.date,other,drivers,attending,moves,resetAttendance);
    onClose();
  }
  // Automatisk tar bort alla manuella ändringar: förare, platser, flyttade barn och ändrad närvaro
  // (svar från "Ibland"-familjer ligger kvar).
  const reset=()=>save(null,{},true);
  // car === null betyder att barnet inte deltar.
  function moveKid(kid,car){
    setAttending(a=>car===null ? a.filter(x=>x!==kid) : a.includes(kid) ? a : girls.filter(x=>x===kid||a.includes(x)));
    setMoves(m=>{const n={...m}; if(car===null) delete n[kid]; else n[kid]=car; return n;});
  }
  return <div className="modal-back"><div className="modal"><h3>{fmt(edit.date)} · {edit.dir==="dit"?"DIT":"HEM"}</h3><p className="muted">{frozen?"Träningen har varit. Ange vilka som faktiskt körde och vilka som var med, så räknas körsaldot om.":"Ange vilka som kör och vilka som är med den här gången."}</p>
    <h4 className="modal-subtitle">{frozen?"Körde":"Kör"}</h4>
    <div className="modal-drivers">{girls.map(g=><div className={"modal-driver"+(g in picked?" on":"")} key={g}>
      <label><input type="checkbox" checked={g in picked} onChange={()=>toggle(g)}/>{g}</label>
      {g in picked && <select value={picked[g]} onChange={e=>{setTouched(true); setPicked(p=>({...p,[g]:clampSeats(e.target.value)}));}}>{seatOptions.map(n=><option key={n} value={n}>{n} pl</option>)}</select>}
    </div>)}</div>
    <div className={"capacity"+(short?" short":"")}>{needed} barn · {capacity} platser{short&&(frozen?` · ${needed-capacity} saknas`:" · resten fylls på automatiskt")}</div>
    <h4 className="modal-subtitle">{frozen?"Vem åkte med vem":"Vem åker med vem"} <span>dra barnen mellan bilarna · deltar-ändringar gäller både dit och hem</span></h4>
    <CarBoard cars={cars} unplaced={unplaced} moved={moved} absent={girls.filter(g=>!attending.includes(g))} onMove={moveKid}/>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>Avbryt</button>{!frozen&&<button className="secondary" onClick={reset}>Automatisk</button>}<span className="spacer"/>
      <span className="save-group"><label className="toggle"><input type="checkbox" checked={both} onChange={e=>setBoth(e.target.checked)}/><span className="switch"/>Gäller även {other.toUpperCase()}</label><button className="primary" onClick={()=>save(lockDrivers||both?picked:null,keptMoves())}>Spara</button></span></div></div></div>
}
