import { useState } from "react";
import { girls } from "../data.js";
import { AttendanceField, DriveField, SeatsField } from "./FamilyFields.jsx";

// Guide första gången (eller vid byte av barn): vem man är och familjens normala inställningar.
export default function Onboarding({state,me,onDone,onCancel}){
  const [step,setStep]=useState(0);
  const [child,setChild]=useState(me);
  const [attendance,setAttendance]=useState(()=>me?{...state.attendance[me]}:null);
  const [drive,setDrive]=useState(()=>me?structuredClone(state.drive[me]):null);
  const [seats,setSeats]=useState(()=>me?state.seats[me]:null);

  function pickChild(g){
    setChild(g); setAttendance({...state.attendance[g]}); setDrive(structuredClone(state.drive[g])); setSeats(state.seats[g]);
    setStep(1);
  }
  const steps=[
    {title:"Vem är du?",text:"Välj ditt barn. Det sparas bara på den här enheten.",body:
      <div className="chips big">{girls.map(g=><button key={g} className={"chip"+(child===g?" on":"")} onClick={()=>pickChild(g)}>{g}</button>)}</div>},
    {title:`Vilka träningar brukar ${child} vara med på?`,text:"\"Ibland\" räknas inte med automatiskt – då anmäler du per träning. Allt kan ändras för en enskild träning senare.",body:
      attendance && <AttendanceField value={attendance} onChange={(day,v)=>setAttendance(a=>({...a,[day]:v}))}/>},
    {title:"Vilka träningar kan ni köra till?",text:"Markera de körningar ni normalt kan ta.",body:
      drive && <DriveField value={drive} onChange={(day,dir,v)=>setDrive(d=>({...d,[day]:{...d[day],[dir]:v}}))}/>},
    {title:"Hur många barn får plats i bilen?",text:`Räkna med ${child} själv. Kan ändras för en enskild körning.`,body:
      <SeatsField value={seats} onChange={setSeats}/>},
  ];
  const last=step===steps.length-1, s=steps[step];

  return <div className="onboarding"><div className="ob-inner">
    <div className="ob-progress">{steps.map((_,i)=><span key={i} className={i<=step?"done":""}/>)}</div>
    <h2>{s.title}</h2><p className="muted">{s.text}</p>
    {s.body}
    <div className="modal-actions">
      {step>0 ? <button className="secondary" onClick={()=>setStep(step-1)}>Tillbaka</button> : onCancel && <button className="secondary" onClick={onCancel}>Avbryt</button>}
      <span className="spacer"/>
      {step>0 && <button className="primary" onClick={()=>last?onDone(child,{attendance,drive,seats}):setStep(step+1)}>{last?"Klar":"Nästa"}</button>}
    </div>
  </div></div>;
}
