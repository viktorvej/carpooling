import { useCallback, useEffect, useState } from "react";

// Flikarna har egna adresser (/korschema osv.) så att man stannar på samma flik vid omladdning
// och tillbaka-knappen fungerar. Hosting skickar alla adresser till index.html.
const paths={home:"/",schedule:"/korschema",balance:"/korsaldo",settings:"/installningar",admin:"/admin"};
const tabFromPath=()=>Object.keys(paths).find(t=>paths[t]===location.pathname.replace(/\/+$/,"")||(t==="home"&&location.pathname==="/"))??"home";

export function useTab(){
  const [tab,setTabState]=useState(tabFromPath);
  useEffect(()=>{
    const onPop=()=>setTabState(tabFromPath());
    addEventListener("popstate",onPop);
    return ()=>removeEventListener("popstate",onPop);
  },[]);
  const setTab=useCallback(t=>{
    if(paths[t]!==location.pathname) history.pushState(null,"",paths[t]+location.search);
    setTabState(t);
    scrollTo(0,0);
  },[]);
  return [tab,setTab];
}
