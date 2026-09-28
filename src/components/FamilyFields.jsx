import { trainingDays } from "../data.js";
import { seatOptions } from "../schedule.js";

const attendanceChoices=[["J","Ja"],["?","Ibland"],["N","Nej"]];

// Kontroller för en familjs normala inställningar. Används i guiden och under Inställningar.
export function AttendanceField({value,onChange}){
  return <div className="ob-rows">{trainingDays.map(day=><div className="ob-row" key={day}><b>{day}</b>
    <div className="segmented">{attendanceChoices.map(([v,label])=><button key={v} className={value[day]===v?"active":""} onClick={()=>onChange(day,v)}>{label}</button>)}</div>
  </div>)}</div>;
}

export function DriveField({value,onChange}){
  return <div className="ob-rows">{trainingDays.map(day=><div className="ob-row" key={day}><b>{day}</b>
    <div className="chips">{["dit","hem"].map(dir=><button key={dir} className={"chip"+(value[day][dir]==="J"?" on":"")} onClick={()=>onChange(day,dir,value[day][dir]==="J"?"N":"J")}>{dir==="dit"?"🚗 Dit":"🏠 Hem"}</button>)}</div>
  </div>)}</div>;
}

export function SeatsField({value,onChange}){
  return <div className="seat-picker">{seatOptions.map(n=><button key={n} className={value===n?"active":""} onClick={()=>onChange(n)}>{n}</button>)}</div>;
}
