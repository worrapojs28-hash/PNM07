// ---------------------------------------------------------------- ฟอร์ม (แผ่นเลื่อนขึ้น)
const CASE_PHOTO_LABELS = ['ภาพสถานีบริการ', 'ภาพหัวจ่าย/ตู้จ่าย', 'ภาพภาชนะและฉลาก', 'ภาพการปิดผนึก', 'อื่น ๆ'];
const CUSTODY_ACTIONS = ['ส่งมอบ', 'รับมอบ', 'เปิดผนึกเพื่อตรวจ', 'ปิดผนึกใหม่', 'ส่งคืน/จัดเก็บ', 'ทำลาย'];
const optionList = (arr, sel) => arr.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };

// ---------- เคส ----------
function openCaseForm(id) {
  if (!canWrite()) return;
  const c = id ? getCase(id) : null;
  if (id && (!c || !canEditCase(c))) { toast('แก้ไขเคสนี้ไม่ได้', 'error'); return; }
  const thisYear = new Date().getFullYear();
  if (!c && S.year !== thisYear) { S.year = thisYear; subscribeYear(); toast('สลับไปปีปัจจุบันเพื่อรันเลขเคส ลองกดอีกครั้ง'); go('#cases'); return; }
  const date = c?.date || todayISO();
  const d = { id: c?.id || newId(), photos: (c?.photos || []).map(p => ({ ...p })), location: c?.location ? { ...c.location } : null };
  const stations = [...new Set(S.cases.map(x => x.station).filter(Boolean))].sort();
  const sh = sheet(c ? 'แก้ไขข้อมูลเคส' : 'เก็บตัวอย่างใหม่', `
    <form id="case-form" class="form" novalidate>
      <div class="grid2">
        <label class="field"><span>เลขเคส</span><input name="caseNo" class="mono" required value="${esc(c?.caseNo || nextCaseNo(S.cases, casePrefix(), date).caseNo)}" ${c ? '' : 'data-auto="1"'}></label>
        <label class="field"><span>วันที่เก็บ</span><input type="date" name="date" required value="${esc(date)}"></label>
      </div>
      <small class="muted">เลขเคสรันอัตโนมัติ ${esc(casePrefix())}-ปี(พ.ศ.)-เดือน-ลำดับ แก้ไขได้</small>
      <label class="field"><span>ชื่อสถานีบริการ / บริษัท / เลขที่</span><input name="station" list="stations" required value="${esc(c?.station || '')}" placeholder="เช่น ชื่อแบรนด์ ชื่อบริษัท เลขที่ หมู่">
        <datalist id="stations">${stations.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
      <label class="field"><span>จังหวัด</span><select name="province" id="sel-prov"><option value="">— เลือก —</option>${optionList(Object.keys(GEO), c?.province)}</select></label>
      <div class="grid2">
        <label class="field"><span>อำเภอ</span><select name="district" id="sel-dist"></select></label>
        <label class="field"><span>ตำบล</span><select name="subdistrict" id="sel-sub"></select></label>
      </div>
      <fieldset class="gps">
        <legend>พิกัดจุดเก็บ</legend>
        <div class="row between"><small class="muted" id="gps-info">${c?.location?.accuracy ? `ความแม่นยำ ±${c.location.accuracy} ม.` : 'กดใช้ตำแหน่งปัจจุบัน หรือแตะบนแผนที่'}</small>
          <button type="button" class="btn sm primary" id="btn-gps">📍 ใช้ตำแหน่งปัจจุบัน</button></div>
        <div id="pick-map" class="pick-map" aria-label="แผนที่เลือกตำแหน่ง"></div>
        <div class="grid2">
          <label class="field"><span>ละติจูด</span><input name="lat" inputmode="decimal" class="mono" value="${c?.location?.lat ?? ''}" placeholder="13.xxxxxx"></label>
          <label class="field"><span>ลองจิจูด</span><input name="lng" inputmode="decimal" class="mono" value="${c?.location?.lng ?? ''}" placeholder="100.xxxxxx"></label>
        </div>
        <small class="muted">วางพิกัดจาก Google Maps แบบ "13.70, 100.31" ลงช่องละติจูดได้ทั้งคู่</small>
      </fieldset>
      <div class="field"><span>ภาพถ่าย ณ จุดเก็บ</span>
        <div class="photos" id="case-photos"></div>
        <div class="photo-add row"><select id="ph-label" aria-label="ประเภทภาพ">${optionList(CASE_PHOTO_LABELS, CASE_PHOTO_LABELS[0])}</select>
          <label class="btn sm"><input type="file" accept="image/*" capture="environment" hidden id="case-file">📷 ถ่าย/เลือกภาพ</label></div>
        <small class="muted">ระบบย่อภาพและคำนวณค่า SHA-256 ของไฟล์ที่จัดเก็บ</small></div>
      <label class="field"><span>ผู้เก็บตัวอย่าง</span><input name="collector" value="${esc(c?.collector || S.member.name)}"></label>
      <label class="field"><span>หมายเหตุ</span><textarea name="note" rows="2">${esc(c?.note || '')}</textarea></label>
      <button class="btn primary block" type="submit">${c ? 'บันทึกการแก้ไข' : 'บันทึกเคส แล้วเพิ่มตัวอย่าง'}</button>
    </form>`);
  const form = $('#case-form', sh.el);
  const sp = $('#sel-prov', sh.el), sd = $('#sel-dist', sh.el), st = $('#sel-sub', sh.el);
  const fillDist = sel => { sd.innerHTML = `<option value="">— เลือก —</option>${optionList(Object.keys(GEO[sp.value] || {}), sel)}`; };
  const fillSub = sel => { st.innerHTML = `<option value="">— เลือก —</option>${optionList((GEO[sp.value] || {})[sd.value] || [], sel)}`; };
  fillDist(c?.district); fillSub(c?.subdistrict);
  sp.addEventListener('change', () => { fillDist(); fillSub(); });
  sd.addEventListener('change', () => fillSub());
  form.date.addEventListener('change', () => { if (form.caseNo.dataset.auto && form.date.value) form.caseNo.value = nextCaseNo(S.cases, casePrefix(), form.date.value).caseNo; });
  form.caseNo.addEventListener('input', () => { delete form.caseNo.dataset.auto; });

  const setLoc = (lat, lng, extra = {}) => {
    form.lat.value = lat; form.lng.value = lng;
    d.location = { lat, lng, accuracy: extra.accuracy ?? null, source: extra.source || 'map', at: extra.at || Date.now() };
    $('#gps-info', sh.el).textContent = extra.accuracy ? `ความแม่นยำ ±${extra.accuracy} ม.` : 'ปักหมุดจากแผนที่';
    sh.el.dataset.dirty = '1';
  };
  const picker = mapPicker($('#pick-map', sh.el), d.location, (lat, lng) => setLoc(lat, lng, { source: 'map' }));
  setTimeout(() => picker?.refresh(), 260);
  new MutationObserver((_, obs) => { if (!sh.el.isConnected) { picker?.remove(); obs.disconnect(); } }).observe(document.body, { childList: true });
  const syncTyped = () => {
    const lat = parseFloat(form.lat.value), lng = parseFloat(form.lng.value);
    if (!isNaN(lat) && !isNaN(lng)) { d.location = { lat, lng, accuracy: null, source: 'manual' }; picker?.set(lat, lng); }
  };
  form.lat.addEventListener('change', syncTyped); form.lng.addEventListener('change', syncTyped);
  form.lat.addEventListener('paste', e => {
    const m = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/.exec((e.clipboardData || window.clipboardData).getData('text'));
    if (m) { e.preventDefault(); setLoc(+m[1], +m[2], { source: 'manual' }); picker?.set(+m[1], +m[2]); }
  });
  $('#btn-gps', sh.el).addEventListener('click', async ev => {
    const b = ev.currentTarget; b.disabled = true; b.textContent = 'กำลังหาตำแหน่ง…';
    try { const g = await getGPS(); setLoc(g.lat, g.lng, { ...g, source: 'gps' }); picker?.set(g.lat, g.lng); }
    catch (e) { toast(e.message, 'error', 6000); }
    finally { b.disabled = false; b.textContent = '📍 ใช้ตำแหน่งปัจจุบัน'; }
  });

  const drawPhotos = () => {
    const box = $('#case-photos', sh.el);
    box.innerHTML = d.photos.map((p, i) => `<div class="ph-wrap">${photoTile(p, p.label || `ภาพที่ ${i + 1}`)}<button type="button" class="x" data-rm="${i}" aria-label="นำภาพออก">×</button></div>`).join('') || '<p class="muted small">ยังไม่มีภาพ</p>';
    hydratePhotos(box);
  };
  drawPhotos();
  $('#case-photos', sh.el).addEventListener('click', async e => {
    const rm = e.target.closest('[data-rm]'); if (!rm) return;
    if (await confirmBox('นำภาพออกจากเคส', 'ภาพที่ส่งขึ้นระบบแล้วจะยังเก็บไว้ในฐานข้อมูล และมีประวัติการนำออก', 'นำออก', true)) { d.photos.splice(+rm.dataset.rm, 1); drawPhotos(); }
  });
  $('#case-file', sh.el).addEventListener('change', async e => {
    const p = await takePhoto(e.target, 'case', $('#ph-label', sh.el).value);
    if (p) { d.photos.push(p); drawPhotos(); sh.el.dataset.dirty = '1'; }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const caseNo = fd.caseNo.trim();
    if (!caseNo || !fd.date || !fd.station.trim()) { toast('กรอกเลขเคส วันที่ และชื่อสถานีบริการให้ครบ', 'error'); return; }
    if (S.cases.some(x => x.caseNo === caseNo && x.id !== d.id)) { toast(`เลขเคส ${caseNo} มีอยู่แล้ว กรุณาเปลี่ยนลำดับ`, 'error', 6000); return; }
    const lat = parseFloat(fd.lat), lng = parseFloat(fd.lng);
    let location = null;
    if (!isNaN(lat) && !isNaN(lng)) location = d.location && d.location.lat === lat && d.location.lng === lng ? d.location : { lat, lng, accuracy: null, source: 'manual' };
    const base = c ? { ...c } : { createdAt: Date.now(), createdBy: S.member.uid, createdByName: S.member.name, status: STATUS.WAIT, locked: false };
    delete base.id;
    const after = stamp({
      ...base, caseNo, seq: parseCaseNo(caseNo)?.seq ?? null, date: fd.date, station: fd.station.trim(),
      province: fd.province || null, district: fd.district || null, subdistrict: fd.subdistrict || null,
      location, collector: fd.collector.trim() || S.member.name, note: fd.note.trim() || null,
      photos: d.photos.map(photoRef),
    });
    const ops = [{ col: 'cases', id: d.id, data: after }, ...photoOps(d.photos, d.id, null)];
    ops.push(auditOp({ action: c ? 'update' : 'create', col: 'cases', docId: d.id, caseId: d.id, summary: c ? `แก้ไขข้อมูลเคส ${caseNo}` : `สร้างเคส ${caseNo}`, changes: c ? diff(c, after) : {} }));
    if (c && (c.caseNo !== caseNo || c.date !== fd.date)) {
      for (const s of samplesOf(c.id)) { const x = stamp({ ...s, caseNo, caseDate: fd.date }); delete x.id; ops.push({ col: 'samples', id: s.id, data: x }); }
    }
    save(ops, c ? 'บันทึกการแก้ไขแล้ว' : `สร้างเคส ${caseNo} แล้ว`);
    sh.close();
    if (fd.date.slice(0, 4) !== String(S.year)) { S.year = +fd.date.slice(0, 4); subscribeYear(); }
    go(`#case-${d.id}`);
    if (!c) setTimeout(() => openSampleForm(d.id, null), 350);
  });
}

// ---------- ตัวอย่าง ----------
function openSampleForm(caseId, sampleId) {
  if (!canWrite()) return;
  const c = getCase(caseId), s = sampleId ? getSample(sampleId) : null;
  if (!c || !canEditCase(c)) { toast('แก้ไขเคสนี้ไม่ได้', 'error'); return; }
  const siblings = samplesOf(c.id);
  const used = siblings.map(x => x.fuel);
  const d = {
    id: s?.id || newId(),
    fuel: s?.fuel || fuels().map(f => f.name).find(n => !used.includes(n) && /95|B7/.test(n)) || fuels()[0].name,
    photos: { ...(s?.photos || {}) }, newPhotos: [],
  };
  const values = { ...(s?.results || {}) };
  const fuelNames = fuels().map(f => f.name).concat(s && !fuels().some(f => f.name === s.fuel) ? [s.fuel] : []);
  const sh = sheet(s ? `ตัวอย่าง #${s.seq ?? ''} · ${c.caseNo}` : `เพิ่มตัวอย่าง · ${c.caseNo}`, `
    <form id="sample-form" class="form" novalidate>
      <div class="grid2">
        <label class="field"><span>ชนิดน้ำมัน</span><select name="fuel" id="sel-fuel">${optionList(fuelNames, d.fuel)}</select></label>
        <label class="field"><span>ลำดับตัวอย่าง</span><input name="seq" type="number" min="1" inputmode="numeric" value="${s?.seq ?? (Math.max(0, ...siblings.map(x => x.seq || 0)) + 1)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>สีน้ำมัน</span><select name="color"><option value="">— เลือก —</option>${optionList(COLORS.concat(s?.color && !COLORS.includes(s.color) ? [s.color] : []), s?.color)}</select></label>
        <label class="field"><span>เลขซีล <small class="muted">(ถ้ามี)</small></span><input name="sealNo" class="mono" value="${esc(s?.sealNo || '')}" autocomplete="off"></label>
      </div>
      ${pickerHtml('color', 'ภาพสีน้ำมัน', d.photos.color)}
      <h3>ผลการตรวจ</h3>
      <p class="small muted">กรอกเฉพาะรายการที่ตรวจ ถ่ายภาพหน้าจอเครื่องมือประกอบทุกค่า เกณฑ์ที่แสดงคือฉบับที่มีผลในวันที่ ${thDate(c.date)}</p>
      <div id="tests"></div>
      <label class="field"><span>หมายเหตุ</span><textarea name="note" rows="2">${esc(s?.note || '')}</textarea></label>
      <button class="btn primary block" type="submit">บันทึกตัวอย่าง</button>
    </form>`);
  const form = $('#sample-form', sh.el);
  const drawTests = () => {
    const f = fuelDef(d.fuel);
    $('#tests', sh.el).innerHTML = f.tests.filter(t => t !== 'color').map(t => {
      const T = TESTS[t] || { label: t, unit: '', step: 'any' };
      const crit = criterionFor(criteria(), d.fuel, t, c.date);
      return `<div class="test" data-test="${t}">
        <label class="field"><span>${esc(T.label)} ${T.unit ? `<small>(${esc(T.unit)})</small>` : ''} ${crit ? `<small class="muted">· เกณฑ์ ${esc(critText(crit))}</small>` : ''}</span>
        <input name="r_${t}" type="number" step="${T.step || 'any'}" inputmode="decimal" class="mono" value="${values[t] ?? ''}"></label>
        <div class="test-flag"></div>
        ${pickerHtml(t, T.label, d.photos[t])}</div>`;
    }).join('');
    $$('.test', sh.el).forEach(div => {
      const t = div.dataset.test, inp = div.querySelector('input');
      const upd = () => {
        const v = inp.value === '' ? null : +inp.value; values[t] = v;
        const r = evaluate(criteria(), d.fuel, t, v, c.date);
        div.querySelector('.test-flag').innerHTML = verdictBadge(r.state);
        div.classList.toggle('flagged', r.state === 'low' || r.state === 'high');
      };
      inp.addEventListener('input', upd); upd();
    });
    hydratePhotos($('#tests', sh.el));
  };
  drawTests();
  $('#sel-fuel', sh.el).addEventListener('change', e => { d.fuel = e.target.value; drawTests(); });
  form.addEventListener('change', async e => {
    const key = e.target.dataset?.file; if (!key) return;
    const label = key === 'color' ? 'ภาพสีน้ำมัน' : TESTS[key]?.label;
    const p = await takePhoto(e.target, key, label);
    if (!p) return;
    d.photos[key] = p; d.newPhotos.push(p); sh.el.dataset.dirty = '1';
    const box = form.querySelector(`[data-pick="${key}"]`);
    box.querySelector('.pick-preview').innerHTML = photoTile(p, label);
    box.querySelector('.pick-label').textContent = 'ถ่ายใหม่';
    hydratePhotos(box);
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fdata = Object.fromEntries(new FormData(form));
    const f = fuelDef(fdata.fuel);
    const results = {}, photos = {};
    for (const t of f.tests) {
      if (t !== 'color') { const raw = fdata['r_' + t]; if (raw !== undefined && raw !== '') results[t] = r4(raw); }
      if (d.photos[t]) photos[t] = photoRef(d.photos[t]);
    }
    const base = s ? { ...s } : { createdAt: Date.now(), createdBy: S.member.uid, createdByName: S.member.name, locked: false };
    delete base.id;
    const after = stamp({
      ...base, caseId: c.id, caseNo: c.caseNo, caseDate: c.date, seq: fdata.seq ? +fdata.seq : null,
      fuel: fdata.fuel, color: fdata.color || null, sealNo: fdata.sealNo.trim() || null, results, photos, note: fdata.note.trim() || null,
    });
    after.status = sampleHasResults(after) ? STATUS.DONE : STATUS.WAIT;
    const keep = d.newPhotos.filter(p => Object.values(photos).some(x => x.id === p.id));
    const ops = [{ col: 'samples', id: d.id, data: after }, ...photoOps(keep, c.id, d.id)];
    ops.push(auditOp({ action: s ? 'update' : 'create', col: 'samples', docId: d.id, caseId: c.id, summary: s ? `แก้ไขตัวอย่าง #${after.seq} ${after.fuel}` : `เพิ่มตัวอย่าง #${after.seq} ${after.fuel}`, changes: s ? diff(s, after) : {} }));
    save(ops, 'บันทึกตัวอย่างแล้ว');
    sh.close();
  });
}
function pickerHtml(key, label, existing) {
  return `<div class="pick" data-pick="${esc(key)}"><div class="pick-preview">${existing ? photoTile(existing, label) : ''}</div>
    <label class="btn sm ${existing ? 'ghost' : ''}"><input type="file" accept="image/*" capture="environment" hidden data-file="${esc(key)}"><span class="pick-label">${existing ? 'ถ่ายใหม่' : '📷 ถ่ายภาพ'}</span></label></div>`;
}

// ---------- การส่งมอบ ----------
function signaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false, empty = true, last = null;
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
  ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  const pos = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; empty = false; });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  return {
    isEmpty: () => empty,
    clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); empty = true; },
    toDataURL: () => {
      const out = document.createElement('canvas'); out.width = 480; out.height = 160;
      const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, 480, 160); o.drawImage(canvas, 0, 0, 480, 160);
      return out.toDataURL('image/png');
    },
  };
}
function openCustodyForm(caseId) {
  if (!canWrite()) return;
  const c = getCase(caseId); if (!c) return;
  const ss = samplesOf(caseId);
  const sh = sheet(`บันทึกการส่งมอบ · ${c.caseNo}`, `
    <p class="small muted">บันทึกแล้วแก้ไขหรือลบไม่ได้ ถ้าผิดพลาดให้บันทึกรายการใหม่พร้อมหมายเหตุ</p>
    <form id="cus-form" class="form" novalidate>
      <div class="grid2">
        <label class="field"><span>การดำเนินการ</span><select name="action">${optionList(CUSTODY_ACTIONS, 'ส่งมอบ')}</select></label>
        <label class="field"><span>วันที่</span><input type="date" name="date" value="${todayISO()}" required></label>
      </div>
      <div class="field"><span>ตัวอย่างที่เกี่ยวข้อง</span><div class="checks">${ss.map(s => `<label class="check"><input type="checkbox" name="samples" value="${esc(s.id)}" checked> #${s.seq} ${esc(s.fuel)}${s.sealNo ? ` (ซีล ${esc(s.sealNo)})` : ''}</label>`).join('') || '<span class="muted small">ไม่มีตัวอย่าง</span>'}</div></div>
      <label class="field"><span>ผู้ส่งมอบ</span><input name="from" required value="${esc(S.member.name)}"></label>
      <label class="field"><span>ผู้รับมอบ (ชื่อ-ตำแหน่ง)</span><input name="to" required></label>
      <label class="field"><span>สถานที่</span><input name="place" placeholder="เช่น ห้องปฏิบัติการ / จุดตรวจเก็บ"></label>
      <label class="field"><span>สภาพตัวอย่างและการปิดผนึก</span><input name="condition" placeholder="เช่น ซีลสมบูรณ์ ฉลากครบ"></label>
      <label class="field"><span>หมายเหตุ</span><textarea name="note" rows="2"></textarea></label>
      <div class="sig-box"><div class="row between"><span>ลายมือชื่อผู้ส่งมอบ</span><button type="button" class="linkbtn" data-clear="from">ล้าง</button></div><canvas class="sig" id="sig-from"></canvas></div>
      <div class="sig-box"><div class="row between"><span>ลายมือชื่อผู้รับมอบ</span><button type="button" class="linkbtn" data-clear="to">ล้าง</button></div><canvas class="sig" id="sig-to"></canvas></div>
      <button class="btn primary block" type="submit">บันทึกการส่งมอบ</button>
    </form>`);
  let pads = null;
  setTimeout(() => {
    pads = { from: signaturePad($('#sig-from', sh.el)), to: signaturePad($('#sig-to', sh.el)) };
    $$('[data-clear]', sh.el).forEach(b => b.addEventListener('click', () => pads[b.dataset.clear].clear()));
  }, 260);
  $('#cus-form', sh.el).addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!fd.get('from').trim() || !fd.get('to').trim()) { toast('กรอกชื่อผู้ส่งและผู้รับมอบ', 'error'); return; }
    const id = newId();
    const entry = {
      caseId: c.id, caseNo: c.caseNo, date: fd.get('date') || todayISO(), at: Date.now(), action: fd.get('action'), samples: fd.getAll('samples'),
      from: fd.get('from').trim(), to: fd.get('to').trim(), place: fd.get('place').trim() || null,
      condition: fd.get('condition').trim() || null, note: fd.get('note').trim() || null,
      signatureFrom: pads && !pads.from.isEmpty() ? pads.from.toDataURL() : null,
      signatureTo: pads && !pads.to.isEmpty() ? pads.to.toDataURL() : null,
      by: S.member.uid, byName: S.member.name,
    };
    save([{ col: 'custody', id, data: entry }, auditOp({ action: 'custody', col: 'custody', docId: id, caseId: c.id, summary: `${entry.action}: ${entry.from} → ${entry.to}` })], 'บันทึกการส่งมอบแล้ว');
    sh.close();
    setTimeout(() => render(), 300);
  });
}
