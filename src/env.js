// Vilken miljö appen körs i. Bara den riktiga adressen räknas som skarp; alla andra publicerade adresser
// (t.ex. Firebase preview channels) blir testversion, så att ett misstag aldrig rör det riktiga schemat.
const mainHosts=["bhk-carpooling.web.app","bhk-carpooling.firebaseapp.com"];

export const isDev=import.meta.env.DEV;
export const isMainSite=!isDev && mainHosts.includes(location.hostname);
export const isPreview=!isDev && !isMainSite;
