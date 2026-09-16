export const ROUTER = 'https://router.project-osrm.org';
export function validRoute(route) {
  return route && Number.isFinite(route.distance) && route.distance >= 0 && Number.isFinite(route.duration) && route.duration >= 0;
}
export function formatDistance(meters) {
  return `${(meters / 1609.344).toLocaleString('en-US', { maximumFractionDigits: 1 })} mi`;
}
export function formatDuration(seconds) {
  const minutes = seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`;
}
export function rankedOffices(offices, routes, key = 'distance') {
  return offices.filter(o => validRoute(routes?.[o.id])).map(office => ({ office, ...routes[office.id] }))
    .sort((a,b) => a[key] - b[key] || a.duration - b.duration || a.office.city.localeCompare(b.office.city));
}
export function directionsUrl(origin, office) {
  // Coordinates preserve the exact same origin used in the estimates. The destination
  // uses the full postal address so Google can locate the business entrance.
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',origin:`${origin.lat},${origin.lng}`,destination:office.address,travelmode:'driving'});
}
export function tableUrl(origin, offices) {
  const points = [origin, ...offices].map(o => `${o.lng},${o.lat}`).join(';');
  return `${ROUTER}/table/v1/driving/${points}?sources=0&destinations=${offices.map((_,i)=>i+1).join(';')}&annotations=distance,duration`;
}
export function parseTable(payload, offices) {
  if (payload.code !== 'Ok' || payload.distances?.length !== 1 || payload.durations?.length !== 1 || payload.distances[0]?.length !== offices.length || payload.durations[0]?.length !== offices.length) throw new Error('Invalid routing response');
  return Object.fromEntries(offices.map((o,i) => {
    const route = { distance:payload.distances[0][i], duration:payload.durations[0][i] };
    return [o.id, validRoute(route) ? route : null];
  }));
}
