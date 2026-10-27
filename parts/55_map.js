// ---------------------------------------------------------------- แผนที่ (Leaflet + OpenStreetMap)
const MAP_CENTER = [13.75, 99.9]; // พื้นที่ภาค 7 (นครปฐม ราชบุรี กาญจนบุรี สุพรรณบุรี ฯลฯ)
let liveMaps = [];
let mainMap = null, mainLayer = null;
const hasLeaflet = () => typeof window.L !== 'undefined';
// เรียก invalidateSize เฉพาะแผนที่ที่ยังอยู่ในหน้า (กันข้อผิดพลาดหลังลบแผนที่)
function safeRefresh(m) { if (m && m._mapPane && m._container && m._container.isConnected) m.invalidateSize({ animate: false }); }
function killMap(m) { try { m.stop(); m.off(); m.remove(); } catch { /* ไม่เป็นไร */ } }
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
function baseTiles() {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; ผู้ร่วมสร้าง <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });
}
function newMap(el, opts = {}, track = true) {
  if (L.Icon?.Default) L.Icon.Default.imagePath = 'vendor/leaflet/images/';
  const m = L.map(el, { zoomControl: true, attributionControl: true, ...opts });
  baseTiles().addTo(m);
  if (track) liveMaps.push(m);
  return m;
}
function destroyMaps() {
  liveMaps.forEach(killMap);
  liveMaps = []; mainMap = null; mainLayer = null;
}
function caseState(c) {
  if (samplesOf(c.id).some(s => sampleFails(s).length)) return 'fail';
  return (c.status || STATUS.WAIT) === STATUS.DONE ? 'done' : 'wait';
}
const STATE_LABEL = { fail: 'มีตัวอย่างไม่เป็นไปตามเกณฑ์', done: 'บันทึกผลแล้ว', wait: 'รอผลการตรวจ' };
const STATE_VAR = { fail: '--bad', done: '--ok', wait: '--warn' };

function viewMap(view, update) {
  if (!hasLeaflet()) { view.innerHTML = '<div class="empty"><p>โหลดแผนที่ไม่ได้ ลองเปิดแอปใหม่ขณะออนไลน์</p></div>'; return; }
  if (update && mainMap && $('#map-main')) { drawMarkers(); return; }
  destroyMaps();
  const focused = document.activeElement?.id === 'q';
  view.innerHTML = `
    <div class="head-row"><h1>แผนที่จุดเก็บตัวอย่าง</h1><select id="year" class="sel-year" aria-label="ปี">${yearOptions()}</select></div>
    ${filterBar()}
    <div class="legend" aria-label="คำอธิบายสัญลักษณ์">${Object.entries(STATE_LABEL).map(([k, v]) => `<span><i class="dot ${k}"></i>${v}</span>`).join('')}</div>
    <div id="map-main" class="map-main" role="region" aria-label="แผนที่"></div>
    <p class="count" id="map-count"></p>
    ${!navigator.onLine ? '<p class="small muted">ออฟไลน์: พื้นหลังแผนที่อาจไม่แสดง แต่ยังเห็นตำแหน่งหมุด</p>' : ''}`;
  mainMap = newMap($('#map-main'));
  mainMap.setView(MAP_CENTER, 8);
  mainLayer = L.featureGroup().addTo(mainMap);
  drawMarkers(true);
  bindFilters(view, () => drawMarkers(true));
  bindYear(view);
  if (focused) $('#q').focus();
}
function drawMarkers(fit = false) {
  if (!mainLayer) return;
  mainLayer.clearLayers();
  const list = filteredCases();
  const withLoc = list.filter(c => c.location && c.location.lat != null);
  const ring = cssVar('--surface');
  for (const c of withLoc) {
    const st = caseState(c);
    const mk = L.circleMarker([c.location.lat, c.location.lng], {
      radius: 9, weight: 2, color: ring, fillColor: cssVar(STATE_VAR[st]), fillOpacity: 0.95,
    });
    const ss = samplesOf(c.id);
    mk.bindPopup(`<div class="pop"><b class="mono">${esc(c.caseNo)}</b><br>${thDate(c.date)}<br>${esc(c.station || '')}<br>
      <span class="small">${esc(placeText(c))}</span><br>${ss.map(s => esc(s.fuel)).join(', ') || 'ยังไม่มีตัวอย่าง'}<br>
      <span class="small">${STATE_LABEL[st]}</span><br><a href="#case-${esc(c.id)}">เปิดเคส ›</a></div>`);
    mk.addTo(mainLayer);
  }
  const cnt = $('#map-count');
  if (cnt) cnt.textContent = `แสดง ${withLoc.length} จาก ${list.length} เคส${list.length - withLoc.length ? ` (${list.length - withLoc.length} เคสไม่มีพิกัด)` : ''}`;
  if (fit && withLoc.length) mainMap.fitBounds(mainLayer.getBounds(), { padding: [30, 30], maxZoom: 15, animate: false });
  setTimeout(() => safeRefresh(mainMap), 50);
}
function caseMiniMap(el, c) {
  if (!hasLeaflet() || !el) return;
  const m = newMap(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
  m.setView([c.location.lat, c.location.lng], 16);
  L.circleMarker([c.location.lat, c.location.lng], { radius: 10, weight: 3, color: cssVar('--surface'), fillColor: cssVar(STATE_VAR[caseState(c)]), fillOpacity: 1 }).addTo(m);
  setTimeout(() => safeRefresh(m), 60);
}
// แผนที่เลือกพิกัดในฟอร์ม: แตะเพื่อวางหมุด หรือลากหมุด
function mapPicker(el, loc, onPick) {
  if (!hasLeaflet() || !el) return null;
  const m = newMap(el, { scrollWheelZoom: false, tap: true }, false); // ไม่ผูกกับหน้าหลัก จึงไม่ถูกลบเมื่อหน้าหลักรีเฟรช
  let marker = null;
  const place = (lat, lng, zoom) => {
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true, autoPan: true }).addTo(m);
      marker.on('dragend', () => { const p = marker.getLatLng(); onPick(+p.lat.toFixed(6), +p.lng.toFixed(6)); });
    } else marker.setLatLng([lat, lng]);
    if (zoom) m.setView([lat, lng], zoom, { animate: false }); else m.panTo([lat, lng], { animate: false });
  };
  if (loc && loc.lat != null) place(loc.lat, loc.lng, 17); else m.setView(MAP_CENTER, 8);
  m.on('click', e => { place(e.latlng.lat, e.latlng.lng); onPick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)); });
  return {
    set: (lat, lng) => place(lat, lng, Math.max(m.getZoom(), 17)),
    refresh: () => safeRefresh(m),
    remove: () => killMap(m),
  };
}
