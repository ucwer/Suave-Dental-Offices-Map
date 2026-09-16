import { ROUTER, validRoute, formatDistance, formatDuration, rankedOffices, directionsUrl, tableUrl, parseTable } from './routing.js';
const $ = id => document.getElementById(id);
const from = $('from-city'), to = $('to-office'), results = $('results');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let locations, snapshot, offices, origins, map, markers = {}, originMarker, routeLayer;
let tableController, routeController, originVersion = 0, routeVersion = 0;
const fresh = new Map(), geometryCache = new Map();
const origin = () => origins.find(o => o.id === from.value);
const destination = () => offices.find(o => o.id === to.value);
const currentRoutes = () => fresh.get(from.value)?.routes ?? snapshot?.routes?.[from.value];
const status = message => { $('map-status').textContent = message; $('map-status').hidden = !message; };
async function fetchJSON(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
function optionGroup(label, items, target) {
  const group = document.createElement('optgroup'); group.label = label;
  [...items].sort((a,b) => a.city.localeCompare(b.city)).forEach(o => group.append(new Option(o.city, o.id)));
  target.append(group);
}
function initializeMap() {
  if (!window.L) { status('Map could not load. Office comparisons and directions are still available.'); return; }
  map = L.map('map', { zoomControl:false }).setView([37.8,-121.1],8);
  L.control.zoom({position:'topright'}).addTo(map);
  const tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {maxZoom:18,attribution:'Tiles © Esri — Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), NOSTRA, © OpenStreetMap contributors, and the GIS User Community'}).addTo(map);
  tiles.on('tileerror', () => status('Some map tiles could not load. Directions and office details remain available.'));
  offices.forEach(o => {
    const icon = L.divIcon({className:'office-pin',html:`<div class="pin-body" style="--pin:${o.color}"></div>`,iconSize:[30,38],iconAnchor:[15,34]});
    const marker = L.marker([o.lat,o.lng], {icon,title:o.city,alt:`${o.city} office`}).addTo(map);
    marker.bindTooltip(o.city, {permanent:true,direction:'right',offset:[12,-16],className:'office-label'});
    marker.bindPopup(`<strong>${escape(o.city)}</strong><br>${escape(o.address)}<br><a href="tel:${o.phone}">${o.phone}</a>`);
    marker.on('click', () => { to.value=o.id; render(); drawRoute(); });
    markers[o.id]=marker;
  });
  fitOffices();
}
function fitOffices() { if(map) map.fitBounds(offices.map(o=>[o.lat,o.lng]), {padding:[55,65]}); }
function clearRoute() { routeVersion++; routeController?.abort(); if(routeLayer){map?.removeLayer(routeLayer);routeLayer=null;} }
function selectOffice(id) {
  to.value=id;render();drawRoute();
  const o=destination();if(map && o && !origin()) map.setView([o.lat,o.lng],14);
  markers[id]?.openPopup();
}
function renderDirectory() {
  const query=$('office-search').value.trim().toLowerCase();
  const visible=offices.filter(o=>(o.city+' '+o.address).toLowerCase().includes(query)).sort((a,b)=>a.city.localeCompare(b.city));
  $('office-count').textContent=`${visible.length} offices`;
  $('office-list').innerHTML=visible.length ? visible.map(o=>`<article class="office"><div class="office-heading"><i class="dot" style="background:${o.color}" aria-hidden="true"></i><h3>${escape(o.city)}</h3></div><p>${escape(o.address)}</p><div class="office-actions"><a href="tel:${o.phone}">${o.phone}</a><button type="button" data-office="${o.id}" aria-label="Show ${escape(o.city)} office on map">View on map ↗</button></div>${o.fax?`<p>Fax: ${o.fax}</p>`:''}${o.note?`<p class="warning">${escape(o.note)}</p>`:''}</article>`).join('') : '<p class="hint">No offices match your search.</p>';
}
function render() {
  const start=origin(),end=destination(),routes=currentRoutes();
  $('refresh').disabled=!start || !!tableController;
  $('origin-note').textContent=start ? (start.kind==='office'?'Office starting point: ':'City starting point: ')+start.address+(start.kind==='city'?` · ${start.note}`:'') : 'City starting points are approximate, not a patient’s address.';
  if(!start){$('closest-results').textContent='Select a starting location above.';$('route-status').textContent='';}
  else {
    const ranked=rankedOffices(offices,routes,$('sort-by').value).slice(0,3);
    $('closest-results').innerHTML=ranked.length ? ranked.map((r,i)=>`<button class="nearby-card ${to.value===r.office.id?'selected':''}" data-office="${r.office.id}"><span class="rank">${i+1}</span><span class="nearby-name"><strong>${escape(r.office.city)}</strong><small>${start.id===r.office.id?'Your starting office':formatDuration(r.duration)+' estimated drive'}</small></span><span class="nearby-distance">${formatDistance(r.distance)}</span></button>`).join('') : 'No road estimates available. Choose an office for Google Maps directions.';
    if(!tableController) $('route-status').textContent=fresh.has(start.id)?'Refreshed road estimates · no live traffic':snapshot?`Saved road estimates · ${snapshot.generatedAt.slice(0,10)} · no live traffic`:'Road estimates unavailable.';
  }
  if(!start || !end){results.textContent=start?'Choose a destination, or select a nearby office below.':'Choose a starting location to compare offices.';return;}
  const data=routes?.[end.id];
  results.innerHTML=`<p class="route-title">${escape(start.city)} → ${escape(end.city)}</p>${validRoute(data)?`<div class="metrics"><div class="metric"><strong>${formatDistance(data.distance)}</strong><span>DRIVING DISTANCE</span></div><div class="metric"><strong>${formatDuration(data.duration)}</strong><span>ESTIMATED DRIVE</span></div></div>`:'<p>Road estimate unavailable for this route.</p>'}${start.id===end.id?'<p>You selected the same office as your starting point.</p>':''}<a class="directions" href="${escape(directionsUrl(start,end))}" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a>`;
}
async function refreshEstimates() {
  const start=origin();if(!start || tableController)return;
  const version=originVersion,controller=new AbortController();tableController=controller;
  const timeout=setTimeout(()=>controller.abort(),12000);render();$('route-status').textContent='Refreshing road estimates…';
  try {
    const payload=await fetchJSON(tableUrl(start,offices),controller.signal);
    if(version!==originVersion)return;
    fresh.set(start.id,{routes:parseTable(payload,offices)});
    tableController=null;render();drawRoute();
  } catch(error) {
    if(version!==originVersion)return;
    tableController=null;render();$('route-status').textContent=snapshot?'Refresh unavailable. Showing saved estimates from '+snapshot.generatedAt.slice(0,10)+'.':'Refresh unavailable. Use Google Maps for directions.';
  } finally {clearTimeout(timeout);if(tableController===controller)tableController=null;}
}
async function drawRoute() {
  clearRoute();const start=origin(),end=destination();if(!map || !start || !end)return;
  if(start.id===end.id){map.setView([end.lat,end.lng],14);return;}
  const version=routeVersion,key=`${start.id}:${end.id}`,controller=new AbortController();routeController=controller;
  const timeout=setTimeout(()=>controller.abort(),12000);
  map.fitBounds([[start.lat,start.lng],[end.lat,end.lng]],{padding:[60,80],maxZoom:13});
  try {
    let geometry=geometryCache.get(key);
    if(!geometry){
      const payload=await fetchJSON(`${ROUTER}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,controller.signal);
      if(payload.code!=='Ok' || payload.routes?.[0]?.geometry?.type!=='LineString')throw new Error('Route unavailable');
      geometry=payload.routes[0].geometry;geometryCache.set(key,geometry);
    }
    if(version!==routeVersion)return;
    routeLayer=L.geoJSON(geometry,{style:{color:'#007681',weight:5,opacity:.85}}).addTo(map);
    map.fitBounds(routeLayer.getBounds(),{padding:[60,80],maxZoom:13});status('');
  } catch(error) {if(version===routeVersion)status('Route line unavailable. Use Google Maps for turn-by-turn directions.');}
  finally {clearTimeout(timeout);}
}
function changeOrigin() {
  originVersion++;tableController?.abort();tableController=null;clearRoute();status('');
  if(originMarker){map?.removeLayer(originMarker);originMarker=null;}
  const start=origin();if(map && start){originMarker=L.circleMarker([start.lat,start.lng],{radius:8,color:'#fff',weight:3,fillColor:'#203c40',fillOpacity:1}).addTo(map).bindTooltip(`${start.city} · starting point`);if(!destination())map.setView([start.lat,start.lng],10);}
  render();drawRoute();
}
async function init() {
  try {
    [locations,snapshot]=await Promise.all([fetchJSON('./data/locations.json'),fetchJSON('./data/routes.json').catch(()=>null)]);
    offices=locations.offices;origins=[...offices,...locations.cities];
    optionGroup('Cities · reference starting points',locations.cities,from);optionGroup('Suave Dental offices',offices,from);optionGroup('Suave Dental offices',offices,to);
    from.disabled=false;to.disabled=false;
    renderDirectory();render();initializeMap();
    from.addEventListener('change',changeOrigin);to.addEventListener('change',()=>{render();drawRoute();});
    $('sort-by').addEventListener('change',render);$('office-search').addEventListener('input',renderDirectory);
    $('refresh').addEventListener('click',refreshEstimates);
    for(const id of ['office-list','closest-results']) $(id).addEventListener('click',event=>{const button=event.target.closest('[data-office]');if(button)selectOffice(button.dataset.office);});
    $('reset').addEventListener('click',()=>{from.value='';to.value='';changeOrigin();map?.closePopup();fitOffices();});
  } catch(error) {results.textContent='Office information could not load. Please reload the page or visit suavedental.net/locations/.';status('Office data unavailable. Please reload to try again.');}
}
init();
