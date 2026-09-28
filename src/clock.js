// Testläge (bara vid lokal utveckling): ?idag=2026-10-12 i adressen låtsas att det är det datumet.
// Testläget sparar i en egen lagring så att den riktiga historiken inte fryses i förväg.
const param=import.meta.env.DEV ? new URLSearchParams(location.search).get("idag") : null;
export const mockToday=/^\d{4}-\d{2}-\d{2}$/.test(param??"") ? param : null;

export function now(){return mockToday ? new Date(mockToday+"T12:00:00") : new Date()}
