export const girls = ["Edda","Freja","Signe","Lo","Tyra","Lykke","Alma"];
// Bor inom ett par hundra meter från varandra. Åker i samma bil när en av dem kör och alla som är med
// får plats (se assignCars).
export const neighbours = ["Edda","Signe","Lo","Freja","Tyra"];
export const trainingDays = ["Måndag","Tisdag","Torsdag"];
export const attendanceDefaults = {
  Edda:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Freja:{Måndag:"J",Tisdag:"?",Torsdag:"N"},
  Signe:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Lo:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Tyra:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Lykke:{Måndag:"J",Tisdag:"J",Torsdag:"J"},
  Alma:{Måndag:"N",Tisdag:"J",Torsdag:"J"},
};
export const driveDefaults = Object.fromEntries(girls.map((name)=>[name,{
  Måndag:{dit:"N",hem:"N"},Tisdag:{dit:"N",hem:"N"},Torsdag:{dit:"N",hem:"N"}
}]));
Object.assign(driveDefaults,{
  Edda:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Freja:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"N",hem:"N"},Torsdag:{dit:"N",hem:"N"}},
  Signe:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Lo:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Tyra:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Lykke:{Måndag:{dit:"J",hem:"J"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
  Alma:{Måndag:{dit:"N",hem:"N"},Tisdag:{dit:"J",hem:"J"},Torsdag:{dit:"J",hem:"J"}},
});

// Låser upp admin-läget. Inte en säkerhetsspärr, bara för att hålla vyn undan för vanliga användare.
export const adminPin="2015";

export const dayNames={0:"Söndag",1:"Måndag",2:"Tisdag",3:"Onsdag",4:"Torsdag",5:"Fredag",6:"Lördag"};
export const scheduledWeekdays = new Set([1,2,4]);
export const trainingTimes = {
  Måndag:{start:"16:30",end:"18:00"},
  Tisdag:{start:"17:00",end:"18:30"},
  Torsdag:{start:"16:45",end:"18:00"},
};
export const seasonStart = new Date(2026,8,28);
export const seasonEnd = new Date(2027,4,31);
