import { girls } from "../data.js";

export default function BalanceSection({calc}){
  const rows=girls.map(g=>({g,drives:calc.drives[g],attends:calc.attends[g],ratio:calc.attends[g]?calc.drives[g]/calc.attends[g]:0}));
  return <div><h2 className="section-title">Körsaldo</h2><div className="card"><table><thead><tr><th>Tjej</th><th>Körningar</th><th>Deltagit</th><th>Kör/delt.</th></tr></thead><tbody>{rows.map(r=><tr key={r.g}><td><b>{r.g}</b></td><td>{r.drives}</td><td>{r.attends}</td><td>{r.ratio.toFixed(2)}</td></tr>)}</tbody></table></div><div className="card"><b>Så fungerar automatiken</b><p className="muted">Tidigare körningar jämförs med antal deltagna träningar. Nästa förare väljs bland dem som deltar och kan köra den aktuella vägen.</p></div></div>
}
