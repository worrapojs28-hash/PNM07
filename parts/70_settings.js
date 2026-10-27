// ---------------------------------------------------------------- ตั้งค่า บัญชี และผู้ดูแลระบบ
function currentSettings() {
  return { ...(S.settings || {}), unitName: unitName(), casePrefix: casePrefix(), fuels: clone(fuels()), criteria: clone(criteria()) };
}
function saveSettings(patch, summary) {
  const next = stamp({ ...currentSettings(), ...patch });
  delete next.serverAt;
  S.settings = next; // แสดงผลทันที
  save([{ col: 'meta', id: 'settings', data: next }, auditOp({ action: 'settings', col: 'meta', docId: 'settings', summary })], 'บันทึกการตั้งค่าแล้ว');
}

function viewSettings(view, update) {
  if (update && $('#settings-root')) { updateBrand(); return; } // ไม่รีเฟรชขณะกำลังแก้ไข
  const m = S.member;
  view.innerHTML = `<div id="settings-root" class="stack">
    <h1>ตั้งค่า</h1>
    <section class="card"><h2>บัญชีของฉัน</h2>
      <dl class="kv"><dt>ชื่อ</dt><dd>${esc(m.name)}</dd><dt>อีเมล</dt><dd>${esc(m.email)}</dd><dt>สิทธิ์</dt><dd>${esc(ROLES[m.role] || m.role)}</dd></dl>
      <div class="actions"><button class="btn" id="btn-csv">ส่งออก CSV ปี ${beYear(S.year)}</button>${isAdmin() ? '<button class="btn" id="btn-backup">สำรองข้อมูล (JSON)</button>' : ''}<button class="btn ghost" id="btn-logout">ออกจากระบบ</button></div>
    </section>
    ${isAdmin() ? `
    <section class="card"><h2>หน่วยงาน</h2>
      <form id="unit-form" class="form">
        <label class="field"><span>ชื่อหน่วยงาน (แสดงบนหัวแอปและรายงาน)</span><input name="unitName" value="${esc(unitName())}"></label>
        <label class="field"><span>คำนำหน้าเลขเคส</span><input name="casePrefix" class="mono" value="${esc(casePrefix())}" pattern="[A-Za-z0-9]+"></label>
        <button class="btn primary" type="submit">บันทึก</button>
      </form></section>
    <section class="card"><h2>ผู้ใช้งาน</h2><div id="members"><p class="muted small">กำลังโหลด…</p></div>
      <h3>เชิญผู้ใช้ใหม่</h3>
      <form id="invite-form" class="form">
        <label class="field"><span>อีเมล</span><input name="email" type="email" required autocomplete="off"></label>
        <div class="grid2"><label class="field"><span>ชื่อ (ไม่บังคับ)</span><input name="name"></label>
        <label class="field"><span>สิทธิ์</span><select name="role"><option value="officer">${ROLES.officer}</option><option value="commander">${ROLES.commander}</option><option value="admin">${ROLES.admin}</option></select></label></div>
        <button class="btn primary" type="submit">เชิญ</button>
        <p class="small muted">ผู้ถูกเชิญเปิดแอป กด "สมัครใช้งาน" ด้วยอีเมลนี้ แล้วกดลิงก์ยืนยันในอีเมล จากนั้นจะเข้าใช้ได้ตามสิทธิ์ที่กำหนด</p>
      </form>
      <div id="invites"></div></section>` : ''}
    <section class="card"><div class="row between"><h2>เกณฑ์ตามประกาศกรมธุรกิจพลังงาน</h2>${isAdmin() ? '<button class="btn sm primary" id="crit-add">+ เพิ่มเกณฑ์</button>' : ''}</div>
      <p class="small muted">ระบบเลือกเกณฑ์ที่มีผลในวันที่เก็บตัวอย่าง: เกณฑ์ที่ระบุช่วงวันที่จะใช้แทนเกณฑ์หลักในช่วงนั้น เมื่อมีประกาศฉบับใหม่ให้เพิ่มเกณฑ์พร้อมวันที่เริ่มมีผล ไม่ต้องลบของเดิม เพื่อให้เคสเก่ายังเทียบกับฉบับที่ใช้ในวันนั้น</p>
      <div id="crit-list"></div></section>
    ${isAdmin() ? `<section class="card"><h2>ชนิดน้ำมันและรายการตรวจ</h2><div id="fuel-list"></div>
      <form id="fuel-add" class="row"><input name="name" placeholder="ชื่อชนิดน้ำมันใหม่" required><select name="family"><option value="gasoline">กลุ่มเบนซิน/แก๊สโซฮอล์</option><option value="diesel">กลุ่มดีเซล</option></select><button class="btn sm" type="submit">เพิ่ม</button></form>
      <button class="btn primary" id="fuel-save">บันทึกรายการตรวจ</button></section>
    <section class="card"><h2>ประวัติการแก้ไขล่าสุด</h2><div id="audit-all"><button class="btn sm" id="load-audit">โหลด 100 รายการล่าสุด</button></div></section>` : ''}
    <section class="card"><h2>ติดตั้งบนโทรศัพท์</h2>
      <p class="small">iPhone: เปิดใน Safari › ปุ่มแชร์ › <b>เพิ่มไปยังหน้าจอโฮม</b><br>Android: เปิดใน Chrome › เมนู ⋮ › <b>ติดตั้งแอป</b></p>
      <p class="small muted">บันทึกได้แม้ไม่มีสัญญาณ ข้อมูลจะส่งเองเมื่อออนไลน์ อย่าออกจากระบบขณะแถบบนยังขึ้น "รอส่ง" · เมื่อมีเวอร์ชันใหม่ ให้ปิดแอปให้สนิทแล้วเปิดใหม่</p>
      <p class="small muted">เวอร์ชัน ${esc(APP_VERSION)}</p></section>
  </div>`;

  $('#btn-logout').addEventListener('click', async () => {
    if (Math.max(S.outstanding, S.pendingDocs) && !await confirmBox('ยังมีข้อมูลรอส่ง', 'ถ้าออกจากระบบตอนนี้ ข้อมูลที่ยังไม่ส่งขึ้นระบบอาจหาย', 'ออกจากระบบ', true)) return;
    signOut(auth);
  });
  $('#btn-csv').addEventListener('click', exportYearCSV);
  $('#btn-backup')?.addEventListener('click', backupJSON);
  drawCriteria();
  if (!isAdmin()) return;

  $('#unit-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    if (!/^[A-Za-z0-9]+$/.test(fd.casePrefix.trim())) { toast('คำนำหน้าเลขเคสใช้ได้เฉพาะตัวอักษรอังกฤษและตัวเลข', 'error'); return; }
    saveSettings({ unitName: fd.unitName.trim() || unitName(), casePrefix: fd.casePrefix.trim() }, 'แก้ไขข้อมูลหน่วยงาน');
    updateBrand();
  });
  drawMembers();
  $('#invite-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const email = fd.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('รูปแบบอีเมลไม่ถูกต้อง', 'error'); return; }
    try { await store.invite(email, fd.role, fd.name.trim()); toast(`เชิญ ${email} แล้ว`); e.target.reset(); drawMembers(); }
    catch (err) { toast(errText(err), 'error'); }
  });

  const fl = clone(fuels());
  const drawFuels = () => {
    $('#fuel-list').innerHTML = fl.map((f, i) => `<details class="fuel-ed"><summary><b>${esc(f.name)}</b> <span class="muted small">${f.family === 'diesel' ? 'ดีเซล' : 'เบนซิน/แก๊สโซฮอล์'}</span></summary>
      <div class="checks">${TEST_KEYS.map(t => `<label class="check"><input type="checkbox" data-f="${i}" data-t="${t}" ${f.tests.includes(t) ? 'checked' : ''}> ${esc(TESTS[t].label)}</label>`).join('')}</div>
      <button type="button" class="linkbtn bad-text" data-rmfuel="${i}">ลบชนิดน้ำมันนี้</button></details>`).join('');
  };
  drawFuels();
  $('#fuel-list').addEventListener('change', e => {
    const el = e.target; if (!el.dataset.f) return;
    const f = fl[+el.dataset.f];
    f.tests = el.checked ? TEST_KEYS.filter(t => f.tests.includes(t) || t === el.dataset.t) : f.tests.filter(x => x !== el.dataset.t);
  });
  $('#fuel-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-rmfuel]'); if (!b) return;
    if (await confirmBox('ลบชนิดน้ำมัน', `ลบ "${esc(fl[+b.dataset.rmfuel].name)}" ออกจากรายการ (ตัวอย่างที่บันทึกแล้วไม่หาย)`, 'ลบ', true)) { fl.splice(+b.dataset.rmfuel, 1); drawFuels(); }
  });
  $('#fuel-add').addEventListener('submit', e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const name = fd.name.trim(); if (!name || fl.some(f => f.name === name)) return;
    fl.push({ name, family: fd.family, dye: '', tests: fd.family === 'diesel' ? [...DIESEL_TESTS] : [...GASOLINE_TESTS] });
    e.target.reset(); drawFuels();
  });
  $('#fuel-save').addEventListener('click', () => saveSettings({ fuels: fl }, 'แก้ไขชนิดน้ำมันและรายการตรวจ'));
  $('#crit-add').addEventListener('click', () => openCriterionForm(null));
  $('#load-audit').addEventListener('click', async () => {
    const list = await store.listAudit(100).catch(e => { toast(errText(e), 'error'); return []; });
    $('#audit-all').innerHTML = `<ul class="audit">${list.map(a => `<li><span class="mono small">${thDateTime(a.at)}</span> <b>${esc(a.byName || '')}</b> — ${a.caseId ? `<a href="#case-${esc(a.caseId)}">${esc(a.summary || a.action)}</a>` : esc(a.summary || a.action)}</li>`).join('') || '<li class="muted">ไม่มีประวัติ</li>'}</ul>`;
  });
}

function drawCriteria() {
  const box = $('#crit-list'); if (!box) return;
  const crit = criteria();
  const byFuel = {};
  crit.forEach(c => { (byFuel[c.fuel] = byFuel[c.fuel] || []).push(c); });
  const names = [...new Set([...fuels().map(f => f.name), ...Object.keys(byFuel)])];
  box.innerHTML = names.map(n => {
    const rows = (byFuel[n] || []).sort((a, b) => TEST_KEYS.indexOf(a.test) - TEST_KEYS.indexOf(b.test) || (a.from || '').localeCompare(b.from || ''));
    return `<h3>${esc(n)}</h3>${rows.length ? `<div class="tbl-wrap"><table class="crit">
      <thead><tr><th>รายการ</th><th class="num">เกณฑ์</th><th>มีผล</th><th>อ้างอิง</th></tr></thead><tbody>
      ${rows.map(c => `<tr ${isAdmin() ? `data-crit="${esc(c.id)}" class="clickable" tabindex="0"` : ''}>
        <td>${esc(TESTS[c.test]?.label || c.test)}</td><td class="num mono">${esc(critText(c))} <span class="unit">${esc(TESTS[c.test]?.unit || '')}</span></td>
        <td class="small">${c.from || c.to ? `${c.from ? thDate(c.from) : '…'} – ${c.to ? thDate(c.to) : 'ปัจจุบัน'}` : 'เกณฑ์หลัก'}</td>
        <td class="small">${esc(c.ref || '')}${isAdmin() && !c.verified ? ' <span class="pill wait">รอตรวจทาน</span>' : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted small">ยังไม่มีเกณฑ์</p>'}`;
  }).join('');
  if (isAdmin()) $$('[data-crit]', box).forEach(tr => {
    const open = () => openCriterionForm(tr.dataset.crit);
    tr.addEventListener('click', open);
    tr.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  });
}
function openCriterionForm(id) {
  const list = clone(criteria());
  const c = id ? list.find(x => x.id === id) : null;
  const sh = sheet(c ? 'แก้ไขเกณฑ์' : 'เพิ่มเกณฑ์', `
    <form id="crit-form" class="form" novalidate>
      <div class="grid2">
        <label class="field"><span>ชนิดน้ำมัน</span><select name="fuel">${optionList(fuels().map(f => f.name), c?.fuel)}</select></label>
        <label class="field"><span>รายการตรวจ</span><select name="test">${TEST_KEYS.filter(t => t !== 'color').map(t => `<option value="${t}" ${c?.test === t ? 'selected' : ''}>${esc(TESTS[t].label)}</option>`).join('')}</select></label>
      </div>
      <div class="grid2">
        <label class="field"><span>ต่ำสุด (ไม่ต่ำกว่า)</span><input name="min" type="number" step="any" inputmode="decimal" value="${c?.min ?? ''}"></label>
        <label class="field"><span>สูงสุด (ไม่สูงกว่า)</span><input name="max" type="number" step="any" inputmode="decimal" value="${c?.max ?? ''}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>มีผลตั้งแต่ <small class="muted">(เว้นว่าง = เกณฑ์หลัก)</small></span><input name="from" type="date" value="${c?.from || ''}"></label>
        <label class="field"><span>ถึงวันที่ <small class="muted">(เว้นว่าง = ยังมีผล)</small></span><input name="to" type="date" value="${c?.to || ''}"></label>
      </div>
      <label class="field"><span>อ้างอิงประกาศ (ชื่อ/ฉบับที่/ปี)</span><input name="ref" value="${esc(c?.ref || '')}" placeholder="เช่น ประกาศ ธพ. เรื่อง กำหนดลักษณะและคุณภาพของน้ำมันดีเซล (ฉบับที่ ..) พ.ศ. ...."></label>
      <label class="check"><input type="checkbox" name="verified" ${c?.verified ? 'checked' : ''}> ตรวจทานกับประกาศฉบับจริงแล้ว</label>
      <button class="btn primary block" type="submit">บันทึกเกณฑ์</button>
      ${c ? '<button type="button" class="btn danger block" id="crit-del">ลบเกณฑ์นี้</button>' : ''}
    </form>`);
  $('#crit-form', sh.el).addEventListener('submit', e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const row = {
      id: c?.id || newId(10), fuel: fd.fuel, test: fd.test,
      min: fd.min === '' ? null : r4(fd.min), max: fd.max === '' ? null : r4(fd.max),
      from: fd.from || '', to: fd.to || '', ref: fd.ref.trim(), verified: !!fd.verified,
    };
    if (row.min == null && row.max == null) { toast('ระบุค่าต่ำสุดหรือสูงสุดอย่างน้อยหนึ่งค่า', 'error'); return; }
    if (row.from && row.to && row.to < row.from) { toast('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม', 'error'); return; }
    const next = c ? list.map(x => (x.id === c.id ? row : x)) : [...list, row];
    saveSettings({ criteria: next }, `${c ? 'แก้ไข' : 'เพิ่ม'}เกณฑ์ ${row.fuel} · ${TESTS[row.test].label} ${critText(row)}`);
    sh.close(); drawCriteria();
  });
  $('#crit-del', sh.el)?.addEventListener('click', async () => {
    if (!await confirmBox('ลบเกณฑ์', 'เคสที่อยู่ในช่วงวันที่ของเกณฑ์นี้จะไม่มีเกณฑ์เทียบ (ถ้าประกาศถูกแทนที่ ให้ใส่วันที่สิ้นสุดแทนการลบ)', 'ลบ', true)) return;
    saveSettings({ criteria: list.filter(x => x.id !== c.id) }, `ลบเกณฑ์ ${c.fuel} · ${TESTS[c.test]?.label}`);
    sh.close(); drawCriteria();
  });
}

async function drawMembers() {
  const box = $('#members'); if (!box) return;
  try {
    const [members, invites, owner] = await Promise.all([store.listMembers(), store.listInvites(), store.getOwner()]);
    box.innerHTML = `<ul class="users">${members.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(u => {
      const locked = u.uid === S.member.uid || u.uid === owner?.uid;
      return `<li><div><b>${esc(u.name || u.email)}</b>${u.uid === owner?.uid ? ' <span class="pill done">ผู้ก่อตั้ง</span>' : ''}<br><span class="small muted">${esc(u.email || '')}</span></div>
        <select data-uid="${esc(u.uid)}" ${locked ? 'disabled title="เปลี่ยนสิทธิ์ตัวเองหรือผู้ก่อตั้งไม่ได้"' : ''} aria-label="สิทธิ์ของ ${esc(u.name || u.email)}">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></li>`;
    }).join('')}</ul>`;
    $$('select[data-uid]', box).forEach(sel => sel.addEventListener('change', async () => {
      try { await store.setRole(sel.dataset.uid, sel.value); toast('ปรับสิทธิ์แล้ว'); }
      catch (e) { toast(errText(e), 'error'); }
    }));
    const pending = invites.filter(i => !members.some(m => (m.email || '').toLowerCase() === i.id));
    $('#invites').innerHTML = pending.length ? `<h3>รอเข้าร่วม</h3><ul class="users">${pending.map(i => `<li><div>${esc(i.name || i.id)}<br><span class="small muted">${esc(i.id)} · ${esc(ROLES[i.role] || i.role)}</span></div><button class="btn sm ghost" data-uninvite="${esc(i.id)}">ยกเลิกคำเชิญ</button></li>`).join('')}</ul>` : '';
    $$('[data-uninvite]').forEach(b => b.addEventListener('click', async () => {
      try { await store.removeInvite(b.dataset.uninvite); toast('ยกเลิกคำเชิญแล้ว'); drawMembers(); } catch (e) { toast(errText(e), 'error'); }
    }));
  } catch (e) { box.innerHTML = `<p class="bad-text small">${esc(errText(e))}</p>`; }
}

function exportYearCSV() {
  const be = beYear(S.year);
  const cRows = [['เลขเคส', 'วันที่', 'ชื่อสถานี', 'จังหวัด', 'อำเภอ', 'ตำบล', 'ละติจูด', 'ลองจิจูด', 'ผู้เก็บ', 'จำนวนตัวอย่าง', 'สถานะ', 'หมายเหตุ']];
  S.cases.forEach(c => cRows.push([c.caseNo, thDate(c.date), c.station, c.province, c.district, c.subdistrict, c.location?.lat ?? '', c.location?.lng ?? '', c.collector, samplesOf(c.id).length, c.status, c.note]));
  const tests = TEST_KEYS.filter(t => t !== 'color');
  const sRows = [['เลขเคส', 'วันที่', 'ลำดับ', 'ชื่อสถานี', 'ชนิดน้ำมัน', 'สี', 'เลขซีล', ...tests.map(t => `${TESTS[t].label}${TESTS[t].unit ? ' (' + TESTS[t].unit + ')' : ''}`), 'รายการไม่เป็นไปตามเกณฑ์', 'สถานะ']];
  S.samples.forEach(s => { const c = getCase(s.caseId); sRows.push([s.caseNo, thDate(s.caseDate), s.seq, c?.station, s.fuel, s.color, s.sealNo, ...tests.map(t => s.results?.[t] ?? ''), sampleFails(s).map(f => TESTS[f.test].label).join('; '), s.status]); });
  downloadText(`เคส-${be}.csv`, toCSV(cRows));
  setTimeout(() => downloadText(`ตัวอย่าง-${be}.csv`, toCSV(sRows)), 700);
}
async function backupJSON() {
  try {
    const custody = (await getDocs(collection(db, 'custody'))).docs.map(withId).filter(x => S.cases.some(c => c.id === x.caseId));
    const strip = o => { const x = { ...o }; delete x.serverAt; return x; };
    const data = { format: 'pnm07-backup/1', year: S.year, exportedAt: new Date().toISOString(), by: S.member.email, settings: strip(currentSettings()), cases: S.cases.map(strip), samples: S.samples.map(strip), custody: custody.map(strip), note: 'ไม่รวมไฟล์ภาพ (ภาพอยู่ใน Firestore คอลเลกชัน photos)' };
    downloadText(`สำรองข้อมูล-${beYear(S.year)}-${todayISO()}.json`, JSON.stringify(data, null, 1), 'application/json');
  } catch (e) { toast('สำรองข้อมูลไม่สำเร็จ: ' + errText(e), 'error'); }
}
