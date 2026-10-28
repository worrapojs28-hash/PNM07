// ---------------------------------------------------------------- โครงหน้าแอปและหน้าหลัก
function shell() {
  $('#app').innerHTML = `
  <header class="top"><div class="top-in">
    <a href="#cases" class="brand"><img class="brand-logo" src="icons/logo-96.png" alt="ตราหน่วยงาน" width="36" height="41"><span><b>บันทึกตัวอย่างน้ำมัน</b><small id="brand-unit">${esc(unitName())}</small></span></a>
    <span id="sync" class="sync">…</span>
  </div></header>
  <main id="view" class="wrap"></main>
  <button type="button" id="fab" class="fab" hidden><span aria-hidden="true">+</span><b id="fab-label"></b></button>
  <nav class="tabs" aria-label="เมนูหลัก">
    <a href="#cases" data-tab="cases"><i class="ic ic-list"></i>เคส</a>
    <a href="#map" data-tab="map"><i class="ic ic-map"></i>แผนที่</a>
    <a href="#stats" data-tab="stats"><i class="ic ic-chart"></i>สถิติ</a>
    <a href="#settings" data-tab="settings"><i class="ic ic-gear"></i>ตั้งค่า</a>
  </nav>`;
  $('#fab').addEventListener('click', () => {
    const r = location.hash.slice(1) || 'cases';
    const m = r.match(/^case-(.+)$/);
    if (m) openSampleForm(m[1], null); else openCaseForm(null);
  });
  updateSync();
}
function startApp() {
  S.started = true;
  shell();
  watchSettings();
  subscribeYear();
  render();
}

let lastRoute = '';
function render(fromData = false) {
  const view = $('#view');
  if (!view || !S.started) return;
  const route = location.hash.slice(1) || 'cases';
  const routeChanged = route !== lastRoute;
  lastRoute = route;
  const tab = route.startsWith('case-') || route.startsWith('report-') ? 'cases' : route;
  $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  // ปุ่มลอย: เปลี่ยนการทำงานตามหน้า
  const fab = $('#fab'), cm = route.match(/^case-(.+)$/);
  let fabLabel = '';
  if (canWrite() && (route === 'cases' || route === 'map')) fabLabel = 'เก็บตัวอย่างใหม่';
  else if (canWrite() && cm && getCase(cm[1]) && canEditCase(getCase(cm[1]))) fabLabel = 'เพิ่มตัวอย่าง';
  fab.hidden = !fabLabel; $('#fab-label').textContent = fabLabel;

  if (S.error) { view.innerHTML = `<div class="empty"><h2>โหลดข้อมูลไม่สำเร็จ</h2><p>${esc(S.error)}</p><button class="btn" onclick="location.reload()">ลองอีกครั้ง</button></div>`; return; }
  if (!S.loaded && route !== 'settings') { view.innerHTML = '<div class="empty"><p class="muted">กำลังโหลดข้อมูล…</p></div>'; return; }
  if (route === 'map') { viewMap(view, fromData && !routeChanged); return; }
  destroyMaps();
  const y = window.scrollY;
  const m = route.match(/^(case|report)-(.+)$/);
  if (route === 'cases') viewList(view);
  else if (route === 'stats') viewStats(view);
  else if (route === 'settings') viewSettings(view, fromData && !routeChanged);
  else if (m && m[1] === 'case') viewCase(view, m[2]);
  else if (m && m[1] === 'report') viewReport(view, m[2]);
  else viewList(view);
  hydratePhotos(view);
  if (!routeChanged) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
function notFound(view) {
  view.innerHTML = `<div class="empty"><h2>ไม่พบเคสในปี ${beYear(S.year)}</h2><p class="muted">ข้อมูลอาจอยู่ในปีอื่น หรือยังซิงก์ไม่เสร็จ</p><a class="btn" href="#cases">กลับไปหน้ารายการ</a></div>`;
}
function yearOptions() {
  const now = new Date().getFullYear(), ys = [];
  for (let y = now; y >= now - 4; y--) ys.push(y);
  return ys.map(y => `<option value="${y}" ${y === S.year ? 'selected' : ''}>พ.ศ. ${beYear(y)}</option>`).join('');
}
function bindYear(view) {
  $('#year', view)?.addEventListener('change', e => { S.year = +e.target.value; S.filters.month = ''; subscribeYear(); render(); });
}

// ---------- ตัวกรอง (ใช้ร่วมกันระหว่างรายการและแผนที่) ----------
function filteredCases() {
  const f = S.filters, q = f.q.trim().toLowerCase();
  return S.cases.filter(c => {
    if (f.month && !(c.date || '').startsWith(f.month)) return false;
    if (f.province && c.province !== f.province) return false;
    if (f.status && (c.status || STATUS.WAIT) !== f.status) return false;
    const ss = samplesOf(c.id);
    if (f.flag && !ss.some(s => sampleFails(s).length)) return false;
    if (q) {
      const hay = [c.caseNo, c.station, c.province, c.district, c.subdistrict, c.collector, ...ss.map(s => s.fuel + ' ' + (s.sealNo || ''))].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
function filterBar() {
  const months = [...new Set(S.cases.map(c => (c.date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  const provinces = [...new Set([...Object.keys(GEO), ...S.cases.map(c => c.province).filter(Boolean)])];
  const f = S.filters;
  return `<div class="search"><input id="q" type="search" placeholder="ค้นหาเลขเคส ชื่อสถานี อำเภอ ชนิดน้ำมัน เลขซีล" value="${esc(f.q)}" autocomplete="off" aria-label="ค้นหา"></div>
    <div class="filters">
      <select id="f-month" aria-label="เดือน"><option value="">ทุกเดือน</option>${months.map(m => `<option value="${m}" ${f.month === m ? 'selected' : ''}>${thMonth(m)}</option>`).join('')}</select>
      <select id="f-prov" aria-label="จังหวัด"><option value="">ทุกจังหวัด</option>${provinces.map(p => `<option ${f.province === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
      <select id="f-status" aria-label="สถานะ"><option value="">ทุกสถานะ</option>${Object.values(STATUS).map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" id="f-flag" ${f.flag ? 'checked' : ''}> ไม่เป็นไปตามเกณฑ์</label>
    </div>`;
}
function bindFilters(view, onChange) {
  const f = S.filters;
  $('#q', view).addEventListener('input', e => { f.q = e.target.value; onChange(); });
  $('#f-month', view).addEventListener('change', e => { f.month = e.target.value; onChange(); });
  $('#f-prov', view).addEventListener('change', e => { f.province = e.target.value; onChange(); });
  $('#f-status', view).addEventListener('change', e => { f.status = e.target.value; onChange(); });
  $('#f-flag', view).addEventListener('change', e => { f.flag = e.target.checked; onChange(); });
}

// ---------- รายการเคส ----------
function viewList(view) {
  const focused = document.activeElement?.id === 'q';
  view.innerHTML = `
    <div class="head-row"><h1>เคสตรวจเก็บตัวอย่าง</h1><select id="year" class="sel-year" aria-label="ปี">${yearOptions()}</select></div>
    ${filterBar()}
    <div id="results"></div>`;
  const draw = () => {
    const list = filteredCases();
    const nS = list.reduce((n, c) => n + samplesOf(c.id).length, 0);
    const nWait = list.filter(c => (c.status || STATUS.WAIT) === STATUS.WAIT).length;
    const dup = new Map(); S.cases.forEach(c => dup.set(c.caseNo, (dup.get(c.caseNo) || 0) + 1));
    $('#results').innerHTML = `<p class="count">${list.length} เคส · ${nS} ตัวอย่าง · รอผล ${nWait} เคส</p>
      ${list.length ? `<ul class="cases">${list.map(c => {
        const ss = samplesOf(c.id);
        return `<li><a class="case" href="#case-${esc(c.id)}">
          <div class="c-top"><span class="caseno mono">${esc(c.caseNo)}</span>${dup.get(c.caseNo) > 1 ? '<span class="pill bad">เลขเคสซ้ำ</span>' : ''}<span class="c-date">${thDate(c.date)}</span></div>
          <div class="c-station">${esc(c.station || '(ไม่ระบุชื่อสถานี)')}</div>
          <div class="c-place muted">${esc(placeText(c))}${c.location ? ' · 📍' : ''}</div>
          <div class="c-foot"><span class="fuels">${ss.map(s => fuelChip(s)).join('') || '<span class="muted small">ยังไม่มีตัวอย่าง</span>'}</span>${statusPill(c)}</div>
        </a></li>`;
      }).join('')}</ul>` : `<div class="empty"><p>${S.cases.length ? 'ไม่พบเคสตามเงื่อนไข' : `ยังไม่มีเคสในปี ${beYear(S.year)}`}</p>${canWrite() ? '<p class="muted small">กดปุ่ม + เก็บตัวอย่างใหม่ ด้านล่างเพื่อเริ่ม</p>' : ''}</div>`}`;
  };
  draw();
  bindFilters(view, draw);
  bindYear(view);
  if (focused) { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}

// ---------- รายละเอียดเคส ----------
function viewCase(view, id) {
  const c = getCase(id);
  if (!c) return notFound(view);
  const ss = samplesOf(id);
  const editable = canEditCase(c);
  const allResults = ss.length && ss.every(sampleHasResults);
  view.innerHTML = `
    <a href="#cases" class="back">‹ รายการเคส</a>
    <div class="case-head">
      <div><div class="caseno big mono">${esc(c.caseNo)}</div><div class="muted">${thDate(c.date, true)}</div></div>
      ${statusPill(c)}
    </div>
    ${c.locked ? '<p class="lock-note">🔒 ยืนยันบันทึกผลแล้ว แก้ไขได้เฉพาะแอดมิน และทุกการแก้ไขถูกบันทึกประวัติ</p>' : ''}
    <div class="actions">
      ${editable ? '<button class="btn" id="btn-edit">แก้ไขข้อมูลเคส</button>' : ''}
      <a class="btn" href="#report-${esc(id)}">รายงาน</a>
    </div>
    <section class="card">
      <h2>สถานที่ตรวจเก็บ</h2>
      <dl class="kv">
        <dt>สถานีบริการ</dt><dd>${esc(c.station || '—')}</dd>
        <dt>ที่ตั้ง</dt><dd>${esc(placeText(c) || '—')}</dd>
        <dt>พิกัด</dt><dd>${mapLink(c.location)}</dd>
        <dt>ผู้เก็บตัวอย่าง</dt><dd>${esc(c.collector || c.createdByName || '—')}</dd>
        ${c.note ? `<dt>หมายเหตุ</dt><dd>${esc(c.note)}</dd>` : ''}
      </dl>
      ${c.location ? '<div class="minimap" id="case-map" aria-label="แผนที่ตำแหน่งเคส"></div>' : ''}
      <div class="photos">${(c.photos || []).map((p, i) => photoTile(p, p.label || `ภาพที่ ${i + 1}`)).join('') || '<p class="muted small">ไม่มีภาพประกอบ</p>'}</div>
    </section>
    <section class="card">
      <h2>ตัวอย่างน้ำมัน (${ss.length})</h2>
      ${ss.length ? ss.map(s => {
        const ev = sampleEval(s);
        return `<article class="sample">
          <div class="row between"><div class="row"><span class="seq">#${s.seq ?? '–'}</span>${fuelChip(s, false)}<span class="muted small">สี ${esc(s.color || '—')}${s.sealNo ? ` · ซีล <span class="mono">${esc(s.sealNo)}</span>` : ''}</span></div>
            ${editable ? `<button class="btn sm ghost" data-edit-sample="${esc(s.id)}">${sampleHasResults(s) ? 'แก้ไข' : 'บันทึกผล'}</button>` : ''}</div>
          <div>${sampleVerdict(s)}</div>
          <div class="tbl-wrap"><table class="results">
            <thead><tr><th>รายการ</th><th class="num">ผล</th><th class="num">เกณฑ์</th><th>ภาพ</th></tr></thead>
            <tbody>${ev.map(e => {
              const T = TESTS[e.test] || { label: e.test }, ph = s.photos?.[e.test];
              return `<tr class="${e.state === 'low' || e.state === 'high' ? 'flagged' : ''}"><td>${esc(T.label)}</td>
                <td class="num mono">${fmtNum(e.value, T.step)} <span class="unit">${e.value != null ? esc(T.unit || '') : ''}</span>${verdictBadge(e.state) ? '<br>' + verdictBadge(e.state) : ''}</td>
                <td class="num muted">${esc(critText(e.crit)) || '—'}</td>
                <td>${ph ? `<button class="linkbtn" data-photo="${esc(ph.id)}" data-label="${esc(T.label)}">ดูภาพ</button>` : '<span class="muted">—</span>'}</td></tr>`;
            }).join('')}</tbody></table></div>
          ${s.photos?.color ? `<div class="photos">${photoTile(s.photos.color, 'ภาพสีน้ำมัน')}</div>` : ''}
          ${s.note ? `<p class="small muted">หมายเหตุ: ${esc(s.note)}</p>` : ''}
        </article>`;
      }).join('') : `<p class="muted">ยังไม่มีตัวอย่าง${editable ? ' กดปุ่ม + เพิ่มตัวอย่าง ด้านล่าง' : ''}</p>`}
    </section>
    <section class="card">
      <div class="row between"><h2>การส่งมอบตัวอย่าง</h2>${canWrite() ? '<button class="btn sm" id="btn-custody">+ บันทึกการส่งมอบ</button>' : ''}</div>
      <div id="custody-list"><p class="muted small">กำลังโหลด…</p></div>
    </section>
    <details class="card" id="audit-box"><summary><h2>ประวัติการแก้ไข</h2></summary><div id="audit-list"><p class="muted small">กำลังโหลด…</p></div></details>
    ${canWrite() && !c.locked ? `<div class="lock-zone"><button class="btn primary block" id="btn-lock" ${allResults ? '' : 'disabled'}>ยืนยันบันทึกผลและล็อกเคส</button>
      ${allResults ? '' : '<p class="small muted center">ใช้ได้เมื่อทุกตัวอย่างมีผลตรวจแล้ว</p>'}</div>` : ''}
    ${c.locked && isAdmin() ? '<div class="lock-zone"><button class="btn block" id="btn-unlock">ปลดล็อกเคส (แอดมิน)</button></div>' : ''}`;

  if (c.location) caseMiniMap($('#case-map'), c);
  $('#btn-edit')?.addEventListener('click', () => openCaseForm(id));
  $('#btn-custody')?.addEventListener('click', () => openCustodyForm(id));
  $$('[data-edit-sample]', view).forEach(b => b.addEventListener('click', () => openSampleForm(id, b.dataset.editSample)));

  store.listByCase('custody', id).then(list => {
    const el = $('#custody-list'); if (!el) return;
    el.innerHTML = list.length ? `<ol class="timeline">${list.map(e => `<li>
      <div class="t-when">${thDate(e.date || isoOfMs(e.at))}</div>
      <div><b>${esc(e.action)}</b> ${esc(e.from || '')} → ${esc(e.to || '')}</div>
      <div class="small muted">${esc([e.place && 'สถานที่: ' + e.place, e.condition && 'สภาพ: ' + e.condition, e.note].filter(Boolean).join(' · '))}</div>
      <div class="sigs">${e.signatureFrom ? `<figure><img src="${e.signatureFrom}" alt="ลายมือชื่อผู้ส่ง"><figcaption>ผู้ส่ง</figcaption></figure>` : ''}${e.signatureTo ? `<figure><img src="${e.signatureTo}" alt="ลายมือชื่อผู้รับ"><figcaption>ผู้รับ</figcaption></figure>` : ''}</div>
      <div class="small muted">บันทึกโดย ${esc(e.byName || '')}</div></li>`).join('')}</ol>` : '<p class="muted small">ยังไม่มีบันทึกการส่งมอบ</p>';
  }).catch(e => { const el = $('#custody-list'); if (el) el.innerHTML = `<p class="bad-text small">${esc(errText(e))}</p>`; });

  $('#audit-box').addEventListener('toggle', async ev => {
    if (!ev.target.open) return;
    const list = await store.listByCase('audit', id).catch(() => []);
    $('#audit-list').innerHTML = list.length ? `<ul class="audit">${list.reverse().map(a => `<li><span class="mono small">${thDateTime(a.at)}</span> <b>${esc(a.byName || '')}</b> — ${esc(a.summary || a.action)}
      ${a.changes && Object.keys(a.changes).length ? `<details><summary class="small">ดูรายละเอียด</summary><pre class="changes">${esc(Object.entries(a.changes).map(([k, [o, n]]) => `${k}: ${JSON.stringify(o)} → ${JSON.stringify(n)}`).join('\n'))}</pre></details>` : ''}</li>`).join('')}</ul>` : '<p class="muted small">ไม่มีประวัติ</p>';
  }, { once: true });

  $('#btn-lock')?.addEventListener('click', async () => {
    if (!await confirmBox('ยืนยันบันทึกผล', `เปลี่ยนสถานะเคส <b>${esc(c.caseNo)}</b> เป็น "บันทึกผลแล้ว" และล็อกข้อมูล หลังจากนี้แก้ไขได้เฉพาะแอดมิน`, 'ยืนยันและล็อก')) return;
    lockCase(c, true);
  });
  $('#btn-unlock')?.addEventListener('click', () => {
    const m = modal(`<h3>ปลดล็อกเคส ${esc(c.caseNo)}</h3><label class="field"><span>เหตุผล (บันทึกในประวัติ)</span><textarea id="unlock-why" rows="3"></textarea></label>
      <div class="row end"><button class="btn ghost" data-close>ยกเลิก</button><button class="btn danger" id="unlock-ok">ปลดล็อก</button></div>`);
    $('#unlock-ok', m.el).addEventListener('click', () => {
      const why = $('#unlock-why', m.el).value.trim();
      if (!why) { toast('กรุณาระบุเหตุผล', 'error'); return; }
      m.close(); lockCase(c, false, why);
    });
  });
}
function lockCase(c, lock, reason = '') {
  const after = stamp({ ...c, locked: lock, status: lock ? STATUS.DONE : STATUS.WAIT }); delete after.id;
  const ops = [{ col: 'cases', id: c.id, data: after }];
  for (const s of samplesOf(c.id)) { const d = stamp({ ...s, locked: lock }); delete d.id; ops.push({ col: 'samples', id: s.id, data: d }); }
  ops.push(auditOp({ action: lock ? 'lock' : 'unlock', col: 'cases', docId: c.id, caseId: c.id, summary: lock ? `ยืนยันบันทึกผลและล็อกเคส ${c.caseNo}` : `ปลดล็อกเคส ${c.caseNo} — เหตุผล: ${reason}`, changes: diff(c, after) }));
  save(ops, lock ? 'ล็อกเคสแล้ว' : 'ปลดล็อกแล้ว');
}

// ---------- รายงานรายเคส ----------
async function fingerprint(c, ss) {
  const strip = o => { const x = { ...o }; delete x.serverAt; return x; };
  return sha256Hex(new TextEncoder().encode(JSON.stringify({ case: strip(c), samples: ss.map(strip) })));
}
function viewReport(view, id) {
  const c = getCase(id);
  if (!c) return notFound(view);
  const ss = samplesOf(id);
  const usedCrit = new Map();
  const allPhotos = [...(c.photos || []).map((p, i) => ({ ...p, label: p.label || `ภาพที่ ${i + 1}` })),
    ...ss.flatMap(s => Object.entries(s.photos || {}).map(([t, p]) => ({ ...p, label: `#${s.seq} ${s.fuel} · ${TESTS[t]?.label || t}` })))];
  view.innerHTML = `
    <div class="no-print row between"><a href="#case-${esc(id)}" class="back">‹ กลับไปเคส</a><button class="btn primary" id="btn-print">พิมพ์ / บันทึก PDF</button></div>
    <article class="report">
      <header class="r-head"><img class="r-logo" src="icons/logo-256.png" alt=""><b>${esc(unitName())}</b><h1>บันทึกการตรวจเก็บตัวอย่างน้ำมันเชื้อเพลิง</h1></header>
      <table class="r-tbl"><tbody>
        <tr><th>เลขเคส</th><td class="mono">${esc(c.caseNo)}</td><th>สถานะ</th><td>${esc(c.status || STATUS.WAIT)}${c.locked ? ' (ล็อก)' : ''}</td></tr>
        <tr><th>วันที่เก็บ</th><td>${thDate(c.date, true)}</td><th>ผู้เก็บ</th><td>${esc(c.collector || c.createdByName || '—')}</td></tr>
        <tr><th>สถานีบริการ</th><td colspan="3">${esc(c.station || '—')}</td></tr>
        <tr><th>ที่ตั้ง</th><td colspan="3">${esc(placeText(c) || '—')}</td></tr>
        <tr><th>พิกัด</th><td colspan="3" class="mono">${c.location ? `${c.location.lat}, ${c.location.lng}${c.location.accuracy ? ` (±${c.location.accuracy} ม.)` : ''}` : '—'}</td></tr>
      </tbody></table>
      <h2>ผลการตรวจเทียบเกณฑ์</h2>
      ${ss.map(s => {
        const ev = sampleEval(s);
        ev.forEach(e => { if (e.crit) usedCrit.set(e.crit.ref, e.crit.ref); });
        return `<h3>ตัวอย่าง #${s.seq ?? ''} — ${esc(s.fuel)} · สี ${esc(s.color || '—')}${s.sealNo ? ` · เลขซีล ${esc(s.sealNo)}` : ''}</h3>
        <table class="r-tbl"><thead><tr><th>รายการ</th><th>ผล</th><th>หน่วย</th><th>เกณฑ์</th><th>ผลเทียบเกณฑ์</th></tr></thead><tbody>
        ${ev.map(e => `<tr><td>${esc(TESTS[e.test]?.label || e.test)}</td><td class="num mono">${fmtNum(e.value, TESTS[e.test]?.step)}</td><td>${esc(TESTS[e.test]?.unit || '')}</td><td>${esc(critText(e.crit)) || '—'}</td>
          <td>${{ pass: 'เป็นไปตามเกณฑ์', low: 'ต่ำกว่าเกณฑ์', high: 'สูงกว่าเกณฑ์', none: '—' }[e.state]}</td></tr>`).join('')}
        </tbody></table>`;
      }).join('') || '<p>ไม่มีตัวอย่าง</p>'}
      ${usedCrit.size ? `<p class="r-note">เกณฑ์อ้างอิง (ฉบับที่มีผลในวันที่เก็บตัวอย่าง): ${[...usedCrit.keys()].map(esc).join('; ')}</p>` : ''}
      <h2>ภาพหลักฐาน</h2>
      <div class="r-photos">${allPhotos.map(p => `<figure><img data-img="${esc(p.id)}" alt="${esc(p.label)}"><figcaption>${esc(p.label)}<br><span class="mono">SHA-256: ${esc(p.sha256)}</span></figcaption></figure>`).join('') || '<p>ไม่มีภาพ</p>'}</div>
      <h2>การส่งมอบตัวอย่าง</h2>
      <div id="r-custody"><p class="muted">กำลังโหลด…</p></div>
      <footer class="r-foot">
        <div>ลายนิ้วมือข้อมูล (SHA-256 ของข้อมูลเคสและผลตรวจ): <span class="mono break" id="r-fp">…</span></div>
        <div>พิมพ์เมื่อ ${thDate(todayISO(), true)} โดย ${esc(S.member.name)}</div>
      </footer>
    </article>`;
  fingerprint(c, ss).then(h => { const el = $('#r-fp'); if (el) el.textContent = h; });
  store.listByCase('custody', id).then(list => {
    const el = $('#r-custody'); if (!el) return;
    el.innerHTML = list.length ? `<table class="r-tbl"><thead><tr><th>วันที่</th><th>การดำเนินการ</th><th>ผู้ส่ง</th><th>ผู้รับ</th><th>สภาพ/สถานที่</th></tr></thead><tbody>
      ${list.map(e => `<tr><td>${thDate(e.date || isoOfMs(e.at))}</td><td>${esc(e.action)}</td>
        <td>${esc(e.from)}${e.signatureFrom ? `<br><img class="r-sig" src="${e.signatureFrom}" alt="">` : ''}</td>
        <td>${esc(e.to)}${e.signatureTo ? `<br><img class="r-sig" src="${e.signatureTo}" alt="">` : ''}</td>
        <td>${esc([e.condition, e.place].filter(Boolean).join(' / '))}</td></tr>`).join('')}</tbody></table>` : '<p>ยังไม่มีบันทึกการส่งมอบ</p>';
  }).catch(() => {});
  $('#btn-print').addEventListener('click', () => window.print());
}

// ---------- สถิติ ----------
function viewStats(view) {
  const cases = S.cases, samples = S.samples;
  const months = {};
  for (const c of cases) {
    const m = (c.date || '').slice(0, 7); if (!m) continue;
    months[m] = months[m] || { cases: 0, samples: 0, wait: 0, fail: 0, fuels: {} };
    months[m].cases++;
    if ((c.status || STATUS.WAIT) === STATUS.WAIT) months[m].wait++;
  }
  for (const s of samples) {
    const m = (s.caseDate || '').slice(0, 7); if (!months[m]) continue;
    months[m].samples++;
    months[m].fuels[s.fuel] = (months[m].fuels[s.fuel] || 0) + 1;
    if (sampleFails(s).length) months[m].fail++;
  }
  const fuelNames = [...new Set(samples.map(s => s.fuel))].sort();
  const mKeys = Object.keys(months).sort();
  const maxCases = Math.max(1, ...mKeys.map(k => months[k].cases));
  const byProv = {};
  cases.forEach(c => { const p = c.province || 'ไม่ระบุ'; byProv[p] = (byProv[p] || 0) + 1; });
  const provs = Object.entries(byProv).sort((a, b) => b[1] - a[1]);
  const maxProv = Math.max(1, ...provs.map(p => p[1]));
  const failSamples = samples.filter(s => sampleFails(s).length);
  const testStats = fuelNames.map(fn => {
    const rows = fuelDef(fn).tests.filter(t => t !== 'color').map(t => {
      const items = samples.filter(s => s.fuel === fn && s.results?.[t] != null);
      if (!items.length) return null;
      const vals = items.map(s => s.results[t]);
      const out = items.filter(s => ['low', 'high'].includes(evaluate(criteria(), fn, t, s.results[t], s.caseDate).state)).length;
      return { t, n: vals.length, min: Math.min(...vals), max: Math.max(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length, out };
    }).filter(Boolean);
    return { fn, rows };
  }).filter(x => x.rows.length);

  view.innerHTML = `
    <div class="head-row"><h1>สถิติ</h1><select id="year" class="sel-year" aria-label="ปี">${yearOptions()}</select></div>
    <div class="kpis">
      <div><b>${cases.length}</b><span>เคส</span></div>
      <div><b>${samples.length}</b><span>ตัวอย่าง</span></div>
      <div><b>${cases.filter(c => (c.status || STATUS.WAIT) === STATUS.WAIT).length}</b><span>เคสรอผล</span></div>
      <div class="${failSamples.length ? 'alert' : ''}"><b>${failSamples.length}</b><span>ตัวอย่างไม่เป็นไปตามเกณฑ์</span></div>
    </div>
    <section class="card">
      <div class="row between"><h2>รายเดือน</h2><button class="btn sm" id="csv-month">ส่งออก CSV</button></div>
      <div class="tbl-wrap"><table class="stats">
        <thead><tr><th>เดือน</th><th class="bar-col">เคส</th><th class="num">ตัวอย่าง</th>${fuelNames.map(f => `<th class="num">${esc(f)}</th>`).join('')}<th class="num">รอผล</th><th class="num">ไม่ตามเกณฑ์</th></tr></thead>
        <tbody>${mKeys.map(k => { const r = months[k]; return `<tr><td>${thMonth(k)}</td>
          <td class="bar-col"><span class="bar" style="--w:${(r.cases / maxCases * 100).toFixed(1)}%" title="${r.cases} เคส"></span><span class="mono">${r.cases}</span></td>
          <td class="num mono">${r.samples}</td>${fuelNames.map(f => `<td class="num mono">${r.fuels[f] || ''}</td>`).join('')}
          <td class="num mono">${r.wait || ''}</td><td class="num mono ${r.fail ? 'bad-text' : ''}">${r.fail || ''}</td></tr>`; }).join('') || `<tr><td colspan="${5 + fuelNames.length}" class="muted">ยังไม่มีข้อมูลในปีนี้</td></tr>`}</tbody>
      </table></div>
    </section>
    <section class="card">
      <h2>แยกตามจังหวัด</h2>
      ${provs.length ? `<div class="tbl-wrap"><table class="stats"><tbody>${provs.map(([p, n]) => `<tr><td>${esc(p)}</td><td class="bar-col wide"><span class="bar" style="--w:${(n / maxProv * 100).toFixed(1)}%" title="${n} เคส"></span><span class="mono">${n}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">ยังไม่มีข้อมูล</p>'}
    </section>
    <section class="card">
      <h2>สรุปผลตรวจตามชนิดน้ำมัน</h2>
      ${testStats.map(x => `<h3>${esc(x.fn)}</h3><div class="tbl-wrap"><table class="stats">
        <thead><tr><th>รายการ</th><th class="num">จำนวน</th><th class="num">ต่ำสุด</th><th class="num">เฉลี่ย</th><th class="num">สูงสุด</th><th class="num">ไม่ตามเกณฑ์</th></tr></thead>
        <tbody>${x.rows.map(r => `<tr><td>${esc(TESTS[r.t]?.label || r.t)}</td><td class="num mono">${r.n}</td><td class="num mono">${fmtNum(r.min, TESTS[r.t]?.step)}</td><td class="num mono">${fmtNum(r.mean, TESTS[r.t]?.step)}</td><td class="num mono">${fmtNum(r.max, TESTS[r.t]?.step)}</td><td class="num mono ${r.out ? 'bad-text' : ''}">${r.out || ''}</td></tr>`).join('')}</tbody>
      </table></div>`).join('') || '<p class="muted">ยังไม่มีผลตรวจ</p>'}
      <p class="small muted">เทียบกับเกณฑ์ตามประกาศกรมธุรกิจพลังงานที่มีผลในวันที่เก็บตัวอย่างแต่ละเคส</p>
    </section>
    ${failSamples.length ? `<section class="card"><h2>ตัวอย่างที่ไม่เป็นไปตามเกณฑ์</h2><ul class="flag-list">${failSamples.map(s => {
      const c = getCase(s.caseId);
      return `<li><a href="#case-${esc(s.caseId)}"><span class="mono">${esc(s.caseNo)}</span> #${s.seq} ${esc(s.fuel)} — ${sampleFails(s).map(f => `${esc(TESTS[f.test]?.label)} ${fmtNum(f.value, TESTS[f.test]?.step)} ${f.state === 'low' ? '▼' : '▲'}`).join(', ')}<br><span class="small muted">${esc(c?.station || '')}</span></a></li>`;
    }).join('')}</ul></section>` : ''}`;
  bindYear(view);
  $('#csv-month').addEventListener('click', () => {
    const rows = [['เดือน', 'เคส', 'ตัวอย่าง', ...fuelNames, 'รอผล', 'ไม่เป็นไปตามเกณฑ์']];
    mKeys.forEach(k => { const r = months[k]; rows.push([thMonth(k), r.cases, r.samples, ...fuelNames.map(f => r.fuels[f] || 0), r.wait, r.fail]); });
    downloadText(`สถิติรายเดือน-${beYear(S.year)}.csv`, toCSV(rows));
  });
}
