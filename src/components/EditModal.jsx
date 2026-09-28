import { useState } from "react";
import { girls } from "../data.js";
import { fmt } from "../dates.js";
import { seatOptions, clampSeats, seatsFor } from "../schedule.js";

export default function EditModal({edit,calc,state,onSave,onClose}){
  const r=calc.result[edit.date][edit.dir];
  const [picked,setPicked]=useState(()=>Object.fromEntries(r.drivers.map(d=>[d.name,d.seats])));
  const toggle=g=>setPicked(p=>{const n={...p}; if(g in n) delete n[g]; else n[g]=seatsFor(state,edit.date,edit.dir,g); return n;});
  const capacity=Object.values(picked).reduce((a,b)=>a+b,0), short=capacity<r.needed;
  return <div className="modal-back"><div className="modal"><h3>{fmt(edit.date)} · {edit.dir==="dit"?"DIT":"HEM"}</h3><p className="muted">Välj vilka som kör och hur många platser de har den här gången.</p>
    <div className="modal-drivers">{girls.map(g=><div className={"modal-driver"+(g in picked?" on":"")} key={g}>
      <label><input type="checkbox" checked={g in picked} onChange={()=>toggle(g)}/>{g}</label>
      {g in picked && <select value={picked[g]} onChange={e=>setPicked(p=>({...p,[g]:clampSeats(e.target.value)}))}>{seatOptions.map(n=><option key={n} value={n}>{n} pl</option>)}</select>}
    </div>)}</div>
    <div className={"capacity"+(short?" short":"")}>{r.needed} barn · {capacity} platser{short&&" · resten fylls på automatiskt"}</div>
    <div className="modal-actions"><button className="secondary" onClick={()=>{onSave(edit.date,edit.dir,null);onClose()}}>Automatisk</button><span className="spacer"/><button className="secondary" onClick={onClose}>Avbryt</button><button className="primary" onClick={()=>{onSave(edit.date,edit.dir,picked);onClose()}}>Spara</button></div></div></div>
}
