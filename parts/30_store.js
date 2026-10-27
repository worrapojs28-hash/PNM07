// ---------------------------------------------------------------- Firebase และข้อมูล
const ROLES = { admin: 'แอดมิน', officer: 'เจ้าหน้าที่', commander: 'ผู้บังคับบัญชา', disabled: 'ระงับใช้งาน' };
const ACTIVE_ROLES = ['admin', 'officer', 'commander'];
const STATUS = { WAIT: 'รอผลการตรวจ', DONE: 'บันทึกผลแล้ว' };
const ERR_TH = {
  'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'auth/wrong-password': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'auth/user-not-found': 'ไม่พบบัญชีนี้',
  'auth/email-already-in-use': 'อีเมลนี้มีบัญชีแล้ว ให้กด "เข้าสู่ระบบ" แทน',
  'auth/weak-password': 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร',
  'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
  'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ (เข้าสู่ระบบครั้งแรกต้องออนไลน์)',
  'auth/too-many-requests': 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่',
  'auth/unauthorized-domain': 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (Authentication › Settings › Authorized domains)',
  'permission-denied': 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้',
  'unavailable': 'เชื่อมต่อฐานข้อมูลไม่ได้ในขณะนี้',
};
const errText = e => ERR_TH[e?.code] || e?.message || String(e);

let fbApp = null, auth = null, db = null;
function initFirebase() {
  fbApp = initializeApp(firebaseConfig);
  auth = initializeAuth(fbApp, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  db = initializeFirestore(fbApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
}

// สถานะทั้งแอป
const S = {
  authUser: null, member: null, started: false,
  year: new Date().getFullYear(), cases: [], samples: [], byCase: new Map(),
  settings: null, loaded: false, error: null,
  pendingDocs: 0, outstanding: 0,
  filters: { q: '', month: '', province: '', status: '', flag: false },
  unsub: { member: null, data: null, settings: null },
};
const withId = d => ({ id: d.id, ...d.data() });
const me = () => S.member;
const canWrite = () => ['admin', 'officer'].includes(S.member?.role);
const isAdmin = () => S.member?.role === 'admin';
const fuels = () => (S.settings?.fuels?.length ? S.settings.fuels : DEFAULT_FUELS);
const criteria = () => (Array.isArray(S.settings?.criteria) ? S.settings.criteria : DEFAULT_CRITERIA);
const unitName = () => S.settings?.unitName || 'ศูนย์พิสูจน์หลักฐาน 7';
const casePrefix = () => S.settings?.casePrefix || 'SCDC7';
const fuelDef = name => fuels().find(f => f.name === name)
  || { name, family: /diesel|ดีเซล/i.test(name || '') ? 'diesel' : 'gasoline', tests: /diesel|ดีเซล/i.test(name || '') ? DIESEL_TESTS : GASOLINE_TESTS };

function stopData() {
  if (S.unsub.data) { S.unsub.data(); S.unsub.data = null; }
  if (S.unsub.settings) { S.unsub.settings(); S.unsub.settings = null; }
  S.started = false; S.loaded = false; S.cases = []; S.samples = []; S.byCase = new Map(); S.settings = null;
}
function stopAll() {
  stopData();
  if (S.unsub.member) { S.unsub.member(); S.unsub.member = null; }
  S.member = null; S.authUser = null;
}

// ---------- สมาชิก ----------
function watchMember(u) {
  S.unsub.member = onSnapshot(doc(db, 'members', u.uid), { includeMetadataChanges: true }, snap => {
    // ข้ามสแนปช็อตที่ยังรอเซิร์ฟเวอร์ยืนยัน มิฉะนั้นจะเริ่มฟังข้อมูลก่อนเซิร์ฟเวอร์รู้ว่าเป็นสมาชิก
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists()) { if (S.member) { stopData(); S.member = null; } decideNoMember(u); return; }
    const m = { uid: u.uid, ...snap.data() };
    const prev = S.member;
    S.member = m;
    if (!ACTIVE_ROLES.includes(m.role)) { stopData(); viewBlocked(m); return; }
    if (prev && prev.role !== m.role) { stopData(); }
    if (!S.started) startApp();
    else if (prev && (prev.name !== m.name)) render();
  }, () => decideNoMember(u));
}
async function decideNoMember(u) {
  showLoading('กำลังตรวจสอบสิทธิ์…');
  let owner = null, inv = null;
  try { const s = await getDoc(doc(db, 'meta', 'owner')); owner = s.exists() ? s.data() : null; }
  catch (e) { if (e?.code === 'unavailable') return viewError('ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อตรวจสอบสิทธิ์ครั้งแรก'); }
  if (!owner) return viewClaim(u);
  try { const s = await getDoc(doc(db, 'invites', (u.email || '').toLowerCase())); inv = s.exists() ? s.data() : null; } catch { inv = null; }
  if (!inv) return viewNotInvited(u);
  if (!u.emailVerified) return viewVerify(u, inv);
  return joinWithInvite(u, inv);
}
async function claimOwner(u, name) {
  const b = writeBatch(db);
  b.set(doc(db, 'meta', 'owner'), { uid: u.uid, email: u.email, at: Date.now(), serverAt: serverTimestamp() });
  b.set(doc(db, 'members', u.uid), { role: 'admin', email: u.email, name: name || u.displayName || u.email, founder: true, at: Date.now(), serverAt: serverTimestamp() });
  await b.commit();
}
async function joinWithInvite(u, inv) {
  try {
    await u.reload?.();
    await u.getIdToken(true); // รับโทเค็นใหม่ที่มีสถานะยืนยันอีเมลแล้ว
    await setDoc(doc(db, 'members', u.uid), {
      role: inv.role, email: u.email, name: u.displayName || inv.name || u.email,
      invitedBy: inv.by || null, at: Date.now(), serverAt: serverTimestamp(),
    });
  } catch (e) { viewError('เข้าร่วมไม่สำเร็จ: ' + errText(e)); }
}

// ---------- ข้อมูลรายปี ----------
function setData(cases, samples) {
  S.cases = [...cases].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.caseNo || '').localeCompare(a.caseNo || ''));
  S.samples = samples;
  S.byCase = new Map();
  for (const s of samples) {
    if (!S.byCase.has(s.caseId)) S.byCase.set(s.caseId, []);
    S.byCase.get(s.caseId).push(s);
  }
  for (const arr of S.byCase.values()) arr.sort((a, b) => (a.seq || 0) - (b.seq || 0));
  S.loaded = true; S.error = null;
}
function subscribeYear(attempt = 0) {
  if (S.unsub.data) S.unsub.data();
  S.loaded = false;
  const y = S.year, a = `${y}-01-01`, b = `${y}-12-31`;
  const st = { cases: null, samples: null, pc: 0, ps: 0 };
  let retried = false;
  const onErr = e => {
    if (e?.code === 'permission-denied' && attempt < 5 && !retried) {
      retried = true;
      setTimeout(() => { if (S.started && S.year === y) subscribeYear(attempt + 1); }, 500 * 2 ** attempt);
      return;
    }
    if (!retried) { S.error = errText(e); render(true); }
  };
  const emit = () => {
    if (!st.cases || !st.samples) return;
    S.pendingDocs = st.pc + st.ps;
    setData(st.cases, st.samples);
    updateSync();
    render(true);
  };
  const u1 = onSnapshot(query(collection(db, 'cases'), where('date', '>=', a), where('date', '<=', b), orderBy('date', 'desc')),
    { includeMetadataChanges: true },
    s => { st.cases = s.docs.map(withId); st.pc = s.docs.filter(d => d.metadata.hasPendingWrites).length; emit(); }, onErr);
  const u2 = onSnapshot(query(collection(db, 'samples'), where('caseDate', '>=', a), where('caseDate', '<=', b)),
    { includeMetadataChanges: true },
    s => { st.samples = s.docs.map(withId); st.ps = s.docs.filter(d => d.metadata.hasPendingWrites).length; emit(); }, onErr);
  S.unsub.data = () => { u1(); u2(); };
}
function watchSettings() {
  S.unsub.settings = onSnapshot(doc(db, 'meta', 'settings'), s => {
    S.settings = s.exists() ? s.data() : null;
    updateBrand();
    render(true);
  }, () => {});
}

// ---------- เขียนข้อมูล ----------
// ops: [{ col, id, data }] เขียนทับทั้งเอกสาร; ไม่ต้องรอเซิร์ฟเวอร์ (ออฟไลน์ได้) แต่ต้องดักข้อผิดพลาดเสมอ
function commit(ops) {
  const chunks = [];
  for (let i = 0; i < ops.length; i += 450) chunks.push(ops.slice(i, i + 450));
  return Promise.all(chunks.map(chunk => {
    const batch = writeBatch(db);
    for (const op of chunk) batch.set(doc(db, op.col, op.id), { ...op.data, serverAt: serverTimestamp() });
    S.outstanding++; updateSync();
    return batch.commit().finally(() => { S.outstanding--; updateSync(); });
  }));
}
const store = {
  commit,
  async getPhoto(id) { const s = await getDoc(doc(db, 'photos', id)); return s.exists() ? withId(s) : null; },
  async listByCase(col, caseId) {
    const s = await getDocs(query(collection(db, col), where('caseId', '==', caseId)));
    return s.docs.map(withId).sort((x, y) => (x.at || 0) - (y.at || 0));
  },
  async listMembers() { const s = await getDocs(collection(db, 'members')); return s.docs.map(d => ({ uid: d.id, ...d.data() })); },
  async listInvites() { const s = await getDocs(collection(db, 'invites')); return s.docs.map(withId); },
  async setRole(uid, role) { await setDoc(doc(db, 'members', uid), { role, roleAt: Date.now(), roleBy: S.member.uid }, { merge: true }); },
  async invite(email, role, name) { await setDoc(doc(db, 'invites', email.toLowerCase()), { email: email.toLowerCase(), role, name: name || null, by: S.member.uid, byName: S.member.name, at: Date.now() }); },
  async removeInvite(email) { const b = writeBatch(db); b.delete(doc(db, 'invites', email)); await b.commit(); },
  async listAudit(n = 100) { const s = await getDocs(query(collection(db, 'audit'), orderBy('at', 'desc'), limit(n))); return s.docs.map(withId); },
  async getOwner() { const s = await getDoc(doc(db, 'meta', 'owner')); return s.exists() ? s.data() : null; },
};
