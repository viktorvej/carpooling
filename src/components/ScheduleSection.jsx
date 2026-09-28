import DayCard from "./DayCard.jsx";

export default function ScheduleSection({season,calc,onEdit}){
  return <div><h2 className="section-title">Hela körschemat</h2><p className="muted">Grå = passerad · blå = aktuell vecka</p>{season.map(x=><DayCard key={x.date} x={x} calc={calc} onEdit={onEdit}/>)}</div>
}
