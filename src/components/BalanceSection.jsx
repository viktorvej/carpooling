import { useState } from "react";
import { girls } from "../data.js";

const views=[["soFar","Hittills"],["season","Hela säsongen"]];

export default function BalanceSection({calc}){
  const [view,setView]=useState("soFar");
  const {drives,attends}=view==="soFar"?calc.soFar:calc;
  const rows=girls.map(g=>({g,drives:drives[g],attends:attends[g],ratio:attends[g]?drives[g]/attends[g]:0}));
  return <div><h2 className="section-title">Körsaldo</h2>
    <div className="segmented">{views.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</div>
    <p className="muted">{view==="soFar"?"Träningar som redan har varit.":"Hela säsongen enligt körschemat, inklusive planerade körningar."}</p>
    <div className="card"><table><thead><tr><th>Tjej</th><th>Körningar</th><th>Deltagit</th><th>Kör/delt.</th></tr></thead><tbody>{rows.map(r=><tr key={r.g}><td><b>{r.g}</b></td><td>{r.drives}</td><td>{r.attends}</td><td>{r.ratio.toFixed(2)}</td></tr>)}</tbody></table></div>
    <div className="card"><b>Så fungerar automatiken</b><p className="muted">Tidigare körningar jämförs med antal deltagna träningar. Nästa förare väljs bland dem som deltar och kan köra den aktuella vägen.</p></div>
  </div>
}
