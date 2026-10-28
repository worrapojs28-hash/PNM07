// ---------------------------------------------------------------- เข้าสู่ระบบ / ผู้ดูแลคนแรก / คำเชิญ
const brandBlock = () => `<div class="brand big"><img class="brand-logo" src="icons/logo-256.png" alt="ตราหน่วยงาน" width="88" height="101"><span><b>บันทึกตัวอย่างน้ำมัน</b><small>ระบบบันทึกการตรวจเก็บตัวอย่างน้ำมันเชื้อเพลิง</small></span></div>`;

function viewSetup() {
  $('#app').innerHTML = `<main class="center-screen narrow">${brandBlock()}
    <section class="card"><h2>ยังไม่ได้เชื่อมต่อ Firebase</h2>
    <p>เปิดไฟล์ <span class="mono">firebase-config.js</span> ใน GitHub แล้ววางค่า <span class="mono">firebaseConfig</span> จาก Firebase console แทนคำว่า <span class="mono">null</span> จากนั้นรอ 1–2 นาทีแล้วเปิดหน้านี้ใหม่</p></section></main>`;
}

function viewLogin(msg = '') {
  $('#app').innerHTML = `<main class="center-screen narrow">${brandBlock()}
    <form id="login" class="card form" novalidate>
      <h2 id="lg-title">เข้าสู่ระบบ</h2>
      <label class="field" id="name-field" hidden><span>ชื่อ-สกุล / ยศ</span><input name="name" autocomplete="name"></label>
      <label class="field"><span>อีเมล</span><input name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>รหัสผ่าน</span><input name="pw" type="password" autocomplete="current-password" required minlength="6"></label>
      <p class="bad-text small" id="lg-err" role="alert">${esc(msg)}</p>
      <button class="btn primary block" type="submit" id="lg-btn">เข้าสู่ระบบ</button>
      <div class="row between small"><button type="button" class="linkbtn" id="lg-toggle">ยังไม่มีบัญชี? สมัครใช้งาน</button><button type="button" class="linkbtn" id="lg-reset">ลืมรหัสผ่าน</button></div>
    </form></main>`;
  let signup = false;
  const form = $('#login');
  $('#lg-toggle').addEventListener('click', () => {
    signup = !signup;
    $('#name-field').hidden = !signup;
    form.pw.autocomplete = signup ? 'new-password' : 'current-password';
    $('#lg-title').textContent = $('#lg-btn').textContent = signup ? 'สมัครใช้งาน' : 'เข้าสู่ระบบ';
    $('#lg-toggle').textContent = signup ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครใช้งาน';
  });
  $('#lg-reset').addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!email) { $('#lg-err').textContent = 'กรอกอีเมลก่อน แล้วกด "ลืมรหัสผ่าน"'; return; }
    try { await sendPasswordResetEmail(auth, email); toast('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว'); } catch (e) { $('#lg-err').textContent = errText(e); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim(), pw = form.pw.value, name = form.name.value.trim();
    if (!email || !pw || (signup && !name)) { $('#lg-err').textContent = 'กรอกข้อมูลให้ครบ'; return; }
    $('#lg-btn').disabled = true;
    try {
      if (signup) {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await updateProfile(cred.user, { displayName: name });
      } else await signInWithEmailAndPassword(auth, email, pw);
    } catch (err) { $('#lg-err').textContent = errText(err); $('#lg-btn').disabled = false; }
  });
}

function viewClaim(u) {
  $('#app').innerHTML = `<main class="center-screen narrow">${brandBlock()}
    <section class="card form"><h2>เริ่มใช้งานระบบ</h2>
      <p>ยังไม่มีผู้ดูแลระบบ ถ้าคุณเป็นผู้รับผิดชอบระบบนี้ กดปุ่มด้านล่างเพื่อเป็นผู้ดูแลระบบคนแรก (ทำได้ครั้งเดียว) จากนั้นเชิญเจ้าหน้าที่และผู้บังคับบัญชาได้ในหน้า "ตั้งค่า"</p>
      <label class="field"><span>ชื่อที่แสดง</span><input id="claim-name" value="${esc(u.displayName || '')}"></label>
      <p class="small muted">บัญชี: ${esc(u.email)}</p>
      <button class="btn primary block" id="btn-claim">ฉันคือผู้ดูแลระบบ</button>
      <button class="btn ghost block" id="btn-out">ออกจากระบบ</button></section></main>`;
  $('#btn-claim').addEventListener('click', async ev => {
    ev.target.disabled = true;
    try { await claimOwner(u, $('#claim-name').value.trim()); toast('ตั้งเป็นผู้ดูแลระบบแล้ว'); }
    catch (e) { toast('ไม่สำเร็จ: ' + errText(e), 'error', 8000); ev.target.disabled = false; }
  });
  $('#btn-out').addEventListener('click', () => signOut(auth));
}
function viewNotInvited(u) {
  $('#app').innerHTML = `<main class="center-screen narrow">${brandBlock()}
    <section class="card"><h2>ยังไม่ได้รับเชิญ</h2>
      <p>บัญชี <b>${esc(u.email)}</b> ยังไม่มีสิทธิ์ใช้งาน แจ้งผู้ดูแลระบบให้เชิญอีเมลนี้ในหน้า "ตั้งค่า › เชิญผู้ใช้ใหม่" แล้วกดตรวจสอบอีกครั้ง</p>
      <div class="row"><button class="btn primary" id="btn-recheck">ตรวจสอบอีกครั้ง</button><button class="btn ghost" id="btn-out">ออกจากระบบ</button></div></section></main>`;
  $('#btn-recheck').addEventListener('click', () => decideNoMember(u));
  $('#btn-out').addEventListener('click', () => signOut(auth));
}
function viewVerify(u, inv) {
  $('#app').innerHTML = `<main class="center-screen narrow">${brandBlock()}
    <section class="card"><h2>ยืนยันอีเมล</h2>
      <p>คุณได้รับเชิญเป็น <b>${esc(ROLES[inv.role] || inv.role)}</b> ขั้นสุดท้ายคือยืนยันอีเมล <b>${esc(u.email)}</b></p>
      <ol class="small"><li>กด "ส่งอีเมลยืนยัน"</li><li>เปิดอีเมล (ดูในกล่องจดหมายขยะด้วย) แล้วกดลิงก์</li><li>กลับมาที่หน้านี้แล้วกด "ยืนยันแล้ว เข้าใช้งาน"</li></ol>
      <div class="stack"><button class="btn" id="btn-send">ส่งอีเมลยืนยัน</button>
      <button class="btn primary" id="btn-done">ยืนยันแล้ว เข้าใช้งาน</button>
      <button class="btn ghost" id="btn-out">ออกจากระบบ</button></div></section></main>`;
  $('#btn-send').addEventListener('click', async ev => {
    try { await sendEmailVerification(u); toast('ส่งอีเมลยืนยันแล้ว'); ev.target.disabled = true; } catch (e) { toast(errText(e), 'error'); }
  });
  $('#btn-done').addEventListener('click', async () => {
    try { await u.reload(); } catch { /* ออฟไลน์ */ }
    if (!auth.currentUser?.emailVerified) { toast('ยังไม่พบการยืนยัน กดลิงก์ในอีเมลก่อน', 'error'); return; }
    joinWithInvite(auth.currentUser, inv);
  });
  $('#btn-out').addEventListener('click', () => signOut(auth));
}
function viewBlocked(m) {
  $('#app').innerHTML = `<main class="center-screen narrow">${brandBlock()}
    <section class="card"><h2>บัญชีถูกระงับการใช้งาน</h2><p>บัญชี ${esc(m.email || '')} ใช้งานไม่ได้ในขณะนี้ ติดต่อผู้ดูแลระบบ</p>
    <button class="btn" id="btn-out">ออกจากระบบ</button></section></main>`;
  $('#btn-out').addEventListener('click', () => signOut(auth));
}
