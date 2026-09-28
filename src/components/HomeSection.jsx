import DayCard from "./DayCard.jsx";

export default function HomeSection({weeks,calc,onEdit}){
  return <div><div className="hero"><h2>Vem kör?</h2><p>Tryck <b>Ändra</b> när någon vill ta över en körning.</p></div>{weeks.map(([title,dates])=><div key={title}><h2 className="section-title">{title}</h2>{dates.map(x=><DayCard key={x.date} x={x} calc={calc} onEdit={onEdit}/>)}</div>)}</div>
}
