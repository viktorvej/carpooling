import { AttendanceField, DriveField, SeatsField } from "./FamilyFields.jsx";

// Man ändrar bara inställningarna för sin egen familj.
export default function SettingsSection({state,me,onChangeMe,setAtt,setDrive,setSeats}){
  return <div><h2 className="section-title">Inställningar</h2>
    <div className="card me-card"><div><h3>Du är {me}s förälder</h3><p className="muted">Gäller bara den här enheten.</p></div><button className="edit-btn" onClick={onChangeMe}>Byt</button></div>
    <div className="card"><h3>Närvaro</h3><p className="muted">Vilka träningar {me} normalt är med på. "Ibland" räknas inte med automatiskt.</p>
      <AttendanceField value={state.attendance[me]} onChange={(day,v)=>setAtt(me,day,v)}/></div>
    <div className="card"><h3>Kan köra</h3><p className="muted">Körningar ni normalt kan ta.</p>
      <DriveField value={state.drive[me]} onChange={(day,dir,v)=>setDrive(me,day,dir,v)}/></div>
    <div className="card"><h3>Platser i bilen</h3><p className="muted">Hur många barn bilen normalt tar, inklusive {me}. Kan ändras per körning via Ändra.</p>
      <SeatsField value={state.seats[me]} onChange={n=>setSeats(me,n)}/></div>
  </div>
}
