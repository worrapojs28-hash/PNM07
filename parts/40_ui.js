// ---------------------------------------------------------------- ส่วนประกอบหน้าจอ
const getCase = id => S.cases.find(c => c.id === id);
const getSample = id => S.samples.find(s => s.id === id);
const samplesOf = caseId => S.byCase.get(caseId) || [];
const canEditCase = c => canWrite() && (!c.locked || isAdmin());
const sampleHasResults = s => Object.values(s.results || {}).some(v => v != null && v !== '');
const placeText = c => [c.subdistrict && 'ต.' + c.subdistrict, c.district && 'อ.' + c.district, c.province && 'จ.' + c.province].filter(Boolean).join(' ');
const isoOfMs = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function sampleEval(s) {
  const f = fuelDef(s.fuel);
  return f.tests.filter(t => t !== 'color').map(t => ({ test: t, value: s.results?.[t], ...evaluate(criteria(), s.fuel, t, s.results?.[t], s.caseDate) }));
}
const sampleFails = s => sampleEval(s).filter(e => e.state === 'low' || e.state === 'high');

function stamp(d) { return { ...d, updatedAt: Date.now(), updatedBy: S.member.uid, updatedByName: S.member.name }; }
function auditOp(a) { return { col: 'audit', id: newId(), data: { ...a, at: Date.now(), by: S.member.uid, byName: S.member.name } }; }
function save(ops, okMsg = 'บันทึกแล้ว') {
  const p = commit(ops);
  p.catch(e => toast('บันทึกไม่สำเร็จ: ' + errText(e), 'error', 9000));
  toast(navigator.onLine ? okMsg : okMsg + ' · เก็บไว้ในเครื่อง จะส่งเมื่อมีสัญญาณ');
  return p;
}

function toast(msg, kind = 'info', ms = 3200) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + kind; el.setAttribute('role', 'status'); el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}
function modal(html, { wide = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  return { el: wrap, close };
}
function confirmBox(title, body, okLabel = 'ยืนยัน', danger = false) {
  return new Promise(res => {
    const m = modal(`<h3>${esc(title)}</h3><p class="muted">${body}</p>
      <div class="row end"><button class="btn ghost" data-close>ยกเลิก</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button></div>`);
    m.el.addEventListener('click', e => {
      if (e.target.closest('[data-ok]')) { m.close(); res(true); }
      else if (e.target.closest('[data-close]') || e.target === m.el) res(false);
    });
  });
}
// แผ่นฟอร์มเลื่อนขึ้นจากด้านล่าง
function sheet(title, html) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="btn ghost sm" data-sheet-close>ปิด</button></header>
    <div class="sheet-body">${html}</div></section>`;
  document.body.appendChild(wrap);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => wrap.classList.add('in'));
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    wrap.classList.remove('in');
    setTimeout(() => { wrap.remove(); if (!$('.sheet-wrap')) document.body.classList.remove('sheet-open'); }, 220);
  };
  wrap.addEventListener('click', async e => {
    if (e.target.closest('[data-sheet-close]') || e.target === wrap) {
      if (wrap.dataset.dirty && !await confirmBox('ปิดฟอร์ม', 'ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก', 'ปิดโดยไม่บันทึก', true)) return;
      close();
    }
  });
  wrap.addEventListener('input', () => { wrap.dataset.dirty = '1'; });
  return { el: wrap, body: wrap.querySelector('.sheet-body'), close };
}

function updateSync() {
  const el = $('#sync'); if (!el) return;
  const n = Math.max(S.outstanding, S.pendingDocs);
  let cls = 'ok', txt = 'ซิงก์แล้ว';
  if (!navigator.onLine) { cls = 'off'; txt = n ? `ออฟไลน์ · รอส่ง ${n}` : 'ออฟไลน์'; }
  else if (n) { cls = 'wait'; txt = `รอส่ง ${n}`; }
  el.className = 'sync ' + cls; el.textContent = txt;
}
function updateBrand() { const el = $('#brand-unit'); if (el) el.textContent = unitName(); }

function showLoading(msg = 'กำลังโหลด…') {
  $('#app').innerHTML = `<main class="center-screen"><div class="brand big"><img class="brand-logo" src="icons/logo-256.png" alt="ตราหน่วยงาน" width="88" height="101"><span><b>บันทึกตัวอย่างน้ำมัน</b></span></div><p class="muted">${esc(msg)}</p></main>`;
}
function viewError(msg) {
  $('#app').innerHTML = `<main class="center-screen"><h2>ใช้งานไม่ได้ในขณะนี้</h2><p>${esc(msg)}</p>
    <div class="row"><button class="btn primary" onclick="location.reload()">ลองอีกครั้ง</button><button class="btn ghost" id="err-out">ออกจากระบบ</button></div></main>`;
  $('#err-out').addEventListener('click', () => signOut(auth));
}

function statusPill(c) {
  const done = c.status === STATUS.DONE;
  return `<span class="pill ${done ? 'done' : 'wait'}">${done ? '✓ ' : '◷ '}${esc(c.status || STATUS.WAIT)}</span>`;
}
function fuelChip(s, withFlag = true) {
  const f = fuelDef(s.fuel);
  const bad = withFlag && sampleFails(s).length;
  const dye = { 'ส้ม': 'orange', 'เหลือง': 'yellow', 'เขียว': 'green' }[s.color || f.dye] || 'none';
  return `<span class="fuel ${dye}">${esc(s.fuel || '—')}${bad ? ' <b class="flag-dot" title="ไม่เป็นไปตามเกณฑ์">!</b>' : ''}</span>`;
}
function verdictBadge(state) {
  if (state === 'pass') return '<span class="vb pass">✓ ตามเกณฑ์</span>';
  if (state === 'low') return '<span class="vb fail">▼ ต่ำกว่าเกณฑ์</span>';
  if (state === 'high') return '<span class="vb fail">▲ สูงกว่าเกณฑ์</span>';
  return '';
}
function sampleVerdict(s) {
  const ev = sampleEval(s).filter(e => e.state !== 'none');
  if (!ev.length) return '<span class="muted small">ยังไม่มีค่าที่เทียบเกณฑ์ได้</span>';
  const bad = ev.filter(e => e.state !== 'pass');
  return bad.length
    ? `<span class="verdict fail">✗ ไม่เป็นไปตามเกณฑ์ ${bad.length} รายการ</span>`
    : `<span class="verdict pass">✓ เป็นไปตามเกณฑ์ทุกรายการที่ตรวจ (${ev.length})</span>`;
}
function mapLink(loc) {
  if (!loc || loc.lat == null) return '<span class="muted">ไม่มีพิกัด</span>';
  return `<a href="https://www.google.com/maps?q=${loc.lat},${loc.lng}" target="_blank" rel="noopener" class="mono">${Number(loc.lat).toFixed(6)}, ${Number(loc.lng).toFixed(6)}</a>${loc.accuracy ? ` <span class="muted">±${loc.accuracy} ม.</span>` : ''}`;
}

// ---------- ภาพหลักฐาน ----------
const photoCache = new Map();
function photoTile(ref, label) {
  if (!ref) return '';
  return `<button type="button" class="ph" data-photo="${esc(ref.id)}" data-label="${esc(label || ref.label || '')}">
    <img alt="${esc(label || 'ภาพหลักฐาน')}" data-img="${esc(ref.id)}"><em>${esc(label || ref.label || '')}</em><code>${esc((ref.sha256 || '').slice(0, 10))}</code></button>`;
}
async function loadPhoto(id) {
  if (photoCache.has(id)) return photoCache.get(id);
  const p = await store.getPhoto(id).catch(() => null);
  if (p) photoCache.set(id, p);
  return p;
}
function hydratePhotos(root = document) {
  $$('img[data-img]', root).forEach(async img => {
    if (img.getAttribute('src')) return;
    const p = await loadPhoto(img.dataset.img);
    if (p) img.src = p.data; else img.closest('.ph')?.classList.add('missing');
  });
}
async function openPhoto(id, label) {
  const p = await loadPhoto(id);
  if (!p) { toast('ยังโหลดภาพนี้ไม่ได้ (อาจยังไม่ซิงก์ หรือออฟไลน์)', 'error'); return; }
  const m = modal(`<div class="row between"><h3>${esc(label || p.label || 'ภาพหลักฐาน')}</h3><button class="btn ghost sm" data-close>ปิด</button></div>
    <img class="photo-full" src="${p.data}" alt="${esc(label || '')}">
    <dl class="kv small">
      <dt>SHA-256</dt><dd class="mono break">${esc(p.sha256)}</dd>
      <dt>ขนาด</dt><dd>${p.width}×${p.height} px · ${(p.bytes / 1024).toFixed(0)} KB</dd>
      <dt>วันที่บันทึก</dt><dd>${thDate(isoOfMs(p.takenAt || p.createdAt))}</dd>
      <dt>ผู้บันทึก</dt><dd>${esc(p.createdByName || '—')}</dd>
      ${p.originalName ? `<dt>ไฟล์ต้นฉบับ</dt><dd>${esc(p.originalName)}${p.originalBytes ? ` · ${(p.originalBytes / 1024).toFixed(0)} KB` : ''}</dd>` : ''}
    </dl>
    <div class="row"><button class="btn" data-verify>ตรวจสอบค่า Hash</button><span class="verify-out"></span></div>`, { wide: true });
  m.el.querySelector('[data-verify]').addEventListener('click', async () => {
    const h = await sha256Hex(dataUrlToBytes(p.data));
    m.el.querySelector('.verify-out').innerHTML = h === p.sha256
      ? '<span class="ok-text">✓ ตรงกับค่าที่บันทึกไว้ ภาพไม่ถูกแก้ไข</span>'
      : '<span class="bad-text">✗ ไม่ตรงกับค่าที่บันทึกไว้</span>';
  });
}
async function takePhoto(input, slot, label) {
  const file = input.files?.[0];
  if (!file) return null;
  const box = input.closest('.pick, .photo-add');
  box?.classList.add('busy');
  try {
    const p = await compressImage(file, 1280, 0.72);
    Object.assign(p, { id: newId(), isNew: true, takenAt: Date.now(), slot, label });
    photoCache.set(p.id, { id: p.id, data: p.dataUrl, sha256: p.sha256, bytes: p.bytes, width: p.width, height: p.height, takenAt: p.takenAt, createdByName: S.member.name, originalName: p.originalName, originalBytes: p.originalBytes });
    return p;
  } catch (e) { toast(errText(e), 'error'); return null; }
  finally { box?.classList.remove('busy'); input.value = ''; }
}
function photoOps(list, caseId, sampleId) {
  return list.filter(p => p.isNew).map(p => ({
    col: 'photos', id: p.id, data: {
      data: p.dataUrl, sha256: p.sha256, bytes: p.bytes, width: p.width, height: p.height, mime: 'image/jpeg',
      originalName: p.originalName, originalBytes: p.originalBytes, originalModified: p.originalModified,
      caseId, sampleId: sampleId || null, slot: p.slot, label: p.label || null, takenAt: p.takenAt,
      createdAt: Date.now(), createdBy: S.member.uid, createdByName: S.member.name,
    },
  }));
}
const photoRef = p => ({ id: p.id, sha256: p.sha256, slot: p.slot, label: p.label || null, takenAt: p.takenAt });
