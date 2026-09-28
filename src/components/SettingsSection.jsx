import { useState } from "react";
import { adminPin } from "../data.js";
import { AttendanceField, DriveField, SeatsField } from "./FamilyFields.jsx";

function AdminCard({admin,setAdmin}){
  const [pin,setPin]=useState(""), [wrong,setWrong]=useState(false);
  if(admin) return <div className="card me-card"><div><h3>Admin</h3><p className="muted">Admin-läget är upplåst på den här enheten.</p></div><button className="edit-btn" onClick={()=>setAdmin(null)}>Lås</button></div>;
  function unlock(e){e.preventDefault(); if(pin===adminPin){setAdmin("1"); setPin("");} else setWrong(true);}
  return <form className="card" onSubmit={unlock}><h3>Admin</h3><p className="muted">Ange PIN-kod för att hantera inställningar för alla familjer.</p>
    <div className="pin-row"><input type="password" inputMode="numeric" autoComplete="off" placeholder="PIN-kod" value={pin} onChange={e=>{setPin(e.target.value); setWrong(false);}}/><button className="primary" type="submit">Lås upp</button></div>
    {wrong && <p className="pin-error">Fel PIN-kod.</p>}
  </form>;
}

// Man ändrar bara inställningarna för sin egen familj. Admin kan ändra alla under Admin-fliken.
export default function SettingsSection({state,me,onChangeMe,admin,setAdmin,setAtt,setDrive,setSeats}){
  return <div><h2 className="section-title">Inställningar</h2>
    <div className="card me-card"><div><h3>Du är {me}s förälder</h3><p className="muted">Gäller bara den här enheten.</p></div><button className="edit-btn" onClick={onChangeMe}>Byt</button></div>
    <div className="card"><h3>Närvaro</h3><p className="muted">Vilka träningar {me} normalt är med på. "Ibland" räknas inte med automatiskt.</p>
      <AttendanceField value={state.attendance[me]} onChange={(day,v)=>setAtt(me,day,v)}/></div>
    <div className="card"><h3>Kan köra</h3><p className="muted">Körningar ni normalt kan ta.</p>
      <DriveField value={state.drive[me]} onChange={(day,dir,v)=>setDrive(me,day,dir,v)}/></div>
    <div className="card"><h3>Platser i bilen</h3><p className="muted">Hur många barn bilen normalt tar, inklusive {me}. Kan ändras per körning via Ändra.</p>
      <SeatsField value={state.seats[me]} onChange={n=>setSeats(me,n)}/></div>
    <AdminCard admin={admin} setAdmin={setAdmin}/>
  </div>
}
