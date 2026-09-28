import { useRef, useState } from "react";

const ABSENT="__absent";

// Bilarna som rutor med barnen som chips. Chipsen kan dras (mus och touch via pointer events)
// eller tryckas på och sedan flyttas genom att trycka på en ruta.
// onMove(barn, förare) flyttar till en bil, onMove(barn, null) markerar att barnet inte deltar.
export default function CarBoard({cars,unplaced,absent,onMove}){
  const drag=useRef(null);
  const [ghost,setGhost]=useState(null);
  const [over,setOver]=useState(null);
  const [selected,setSelected]=useState(null);

  const canDrop=(kid,target)=>{
    if(target===ABSENT) return true;
    const car=cars.find(c=>c.name===target);
    if(!car || car.kids.includes(kid)) return false;
    if(cars.some(c=>c.name===kid)) return target===kid; // förarens barn åker bara i egen bil
    return car.kids.length<car.seats;
  };
  const drop=(kid,target)=>{
    setSelected(null);
    if(target && canDrop(kid,target)) onMove(kid,target===ABSENT?null:target);
  };
  const targetAt=(x,y)=>document.elementFromPoint(x,y)?.closest("[data-drop]")?.dataset.drop??null;

  const chipHandlers=kid=>({
    onPointerDown:e=>{e.currentTarget.setPointerCapture(e.pointerId); drag.current={kid,x0:e.clientX,y0:e.clientY,active:false};},
    onPointerMove:e=>{
      const d=drag.current; if(!d) return;
      if(!d.active && Math.hypot(e.clientX-d.x0,e.clientY-d.y0)<6) return;
      d.active=true; setGhost({kid,x:e.clientX,y:e.clientY}); setOver(targetAt(e.clientX,e.clientY));
    },
    onPointerUp:e=>{
      const d=drag.current; drag.current=null; setGhost(null); setOver(null);
      if(!d) return;
      if(d.active) drop(kid,targetAt(e.clientX,e.clientY));
      else setSelected(s=>s===kid?null:kid);
    },
    onPointerCancel:()=>{drag.current=null; setGhost(null); setOver(null);},
  });
  const chip=(kid,extra="")=><button key={kid} type="button" className={"chip on draggable"+extra+(selected===kid?" selected":"")+(ghost?.kid===kid?" dragging":"")} {...chipHandlers(kid)}>{kid}</button>;
  const box=(target,className,head,kids)=>{
    const active=ghost||selected, kid=ghost?.kid??selected;
    const state=active&&target!==null ? (canDrop(kid,target)?(over===target?" over":" can-drop"):" no-drop") : "";
    return <div className={"car-box "+className+state} data-drop={target??undefined} onClick={e=>{if(selected && target && !e.target.closest(".chip")) drop(selected,target);}}>
      <div className="car-head">{head}</div>
      <div className="chips">{kids}</div>
    </div>;
  };

  return <div className="cars">
    {cars.map(c=>box(c.name,c.kids.length>=c.seats?"full":"",<><b>{c.name}s bil</b><span>{c.kids.length}/{c.seats}</span></>,c.kids.map(k=>chip(k,k===c.name?" own":""))))}
    {unplaced.length>0 && box(null,"short",<b>Utan plats</b>,unplaced.map(k=>chip(k)))}
    {box(ABSENT,"absent",<b>Deltar inte</b>,absent.length?absent.map(k=>chip(k," off")):<span className="muted">Alla är med</span>)}
    {selected && <p className="muted hint">Tryck på en bil för att flytta {selected}.</p>}
    {ghost && <div className="chip on drag-ghost" style={{left:ghost.x,top:ghost.y}}>{ghost.kid}</div>}
  </div>;
}
