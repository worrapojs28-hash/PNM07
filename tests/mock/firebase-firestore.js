// Mock ของ Cloud Firestore สำหรับทดสอบ (ข้อมูลอยู่ใน window.__store และ localStorage)
// มีการจำลองกฎความปลอดภัยให้ตรงกับ firestore.rules เพื่อจับการเขียนที่กฎจริงจะปฏิเสธ
const LS = '__mockstore';
const load = () => { try { return new Map(Object.entries(JSON.parse(localStorage.getItem(LS) || '{}'))); } catch { return new Map(); } };
const store = window.__store = window.__store || load();
const persist = () => { try { localStorage.setItem(LS, JSON.stringify(Object.fromEntries(store))); } catch { /* ignore */ } };
const listeners = new Set();
const pending = new Set(); // path ที่ยังไม่ซิงก์ (โหมดออฟไลน์)
let waiters = [];
window.__offline = window.__offline || false;
window.__denied = window.__denied || [];
window.__goOnline = () => { window.__offline = false; const w = waiters; waiters = []; pending.clear(); w.forEach(f => f()); notify(); };

const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
const err = (code, msg) => Object.assign(new Error(msg || code), { code });

export function initializeFirestore() { return { __db: true }; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
export function serverTimestamp() { return { __serverTimestamp: true }; }
export function doc(db, ...segs) { const path = segs.join('/'); return { type: 'doc', path, id: segs[segs.length - 1] }; }
export function collection(db, ...segs) { return { type: 'col', path: segs.join('/') }; }
export function where(field, op, value) { return { kind: 'where', field, op, value }; }
export function orderBy(field, dir = 'asc') { return { kind: 'orderBy', field, dir }; }
export function limit(n) { return { kind: 'limit', n }; }
export function query(ref, ...cs) { return { type: 'query', path: ref.path, constraints: cs }; }

const resolveTs = d => { const o = clone(d); for (const k in o) if (o[k] && o[k].__serverTimestamp) o[k] = Date.now(); return o; };
const colOf = p => p.split('/').slice(0, -1).join('/');
const idOf = p => p.split('/').pop();
function authUser() { return window.__authCurrent ? window.__authCurrent() : null; }

// ---------- จำลองกฎ ----------
function rules(op, path, after, before, au, view) {
  const g = p => view(p);
  const memberRole = au ? g('members/' + au.uid)?.role : null;
  const isMember = !!(au && memberRole);
  const isAdmin = isMember && memberRole === 'admin';
  const canWrite = isMember && ['admin', 'officer'].includes(memberRole);
  const canRead = isMember && ['admin', 'officer', 'commander'].includes(memberRole);
  const [col, id] = [colOf(path), idOf(path)];
  const date = (d, f) => typeof d?.[f] === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d[f]);
  const stamped = after?.updatedBy === au?.uid;
  const notLocked = !(before && before.locked === true);
  const email = (au?.email || '').toLowerCase();
  if (op === 'read') {
    if (path === 'meta/owner') return !!au;
    if (path === 'meta/settings') return canRead;
    if (col === 'members') return !!au && (au.uid === id || canRead);
    if (col === 'invites') return !!au && (isAdmin || email === id);
    return canRead;
  }
  if (path === 'meta/owner') return op === 'create' && !!au && after.uid === au.uid && view('members/' + au.uid, true)?.role === 'admin';
  if (path === 'meta/settings') return isAdmin;
  if (col === 'members') {
    if (op === 'create') {
      if (!au || au.uid !== id || after.email !== au.email) return false;
      const founder = after.role === 'admin' && view('meta/owner', true)?.uid === au.uid;
      const inv = g('invites/' + email);
      const invited = au.emailVerified === true && inv && after.role === inv.role;
      return founder || invited;
    }
    if (op === 'update') {
      const keys = Object.keys({ ...after, ...before }).filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
      return isAdmin && au.uid !== id && id !== g('meta/owner')?.uid && keys.every(k => ['role', 'roleAt', 'roleBy'].includes(k)) && ['admin', 'officer', 'commander', 'disabled'].includes(after.role);
    }
    return false;
  }
  if (col === 'invites') {
    if (op === 'delete') return isAdmin;
    return isAdmin && id === id.toLowerCase() && ['admin', 'officer', 'commander'].includes(after.role);
  }
  if (col === 'cases') { if (op === 'delete') return false; return canWrite && stamped && date(after, 'date') && (op === 'create' || notLocked || isAdmin); }
  if (col === 'samples') { if (op === 'delete') return false; return canWrite && stamped && date(after, 'caseDate') && (op === 'create' || notLocked || isAdmin); }
  if (col === 'photos') return op === 'create' && canWrite && after.createdBy === au.uid && typeof after.sha256 === 'string' && after.sha256.length === 64;
  if (col === 'custody' || col === 'audit') return op === 'create' && canWrite && after.by === au.uid;
  return false;
}
function checkRead(path) {
  if (!rules('read', path, null, null, authUser(), p => store.get(p))) throw err('permission-denied', 'Missing or insufficient permissions. (read ' + path + ')');
}

// ---------- เขียน ----------
function applyWrites(writes) {
  const au = authUser();
  const after = new Map(store);
  for (const w of writes) {
    if (w.del) after.delete(w.path);
    else after.set(w.path, w.merge ? { ...(after.get(w.path) || {}), ...resolveTs(w.data) } : resolveTs(w.data));
  }
  const view = (p, useAfter) => (useAfter ? after.get(p) : store.get(p));
  for (const w of writes) {
    const before = store.get(w.path);
    const op = w.del ? 'delete' : before ? 'update' : 'create';
    if (!rules(op, w.path, after.get(w.path), before, au, view)) {
      window.__denied.push({ op, path: w.path });
      return Promise.reject(err('permission-denied', `Missing or insufficient permissions. (${op} ${w.path})`));
    }
  }
  for (const [k, v] of after) store.set(k, v);
  for (const k of [...store.keys()]) if (!after.has(k)) store.delete(k);
  persist();
  if (window.__offline) {
    writes.forEach(w => pending.add(w.path));
    notify();
    return new Promise(res => waiters.push(res));
  }
  notify();
  return Promise.resolve();
}
export function setDoc(ref, data, opts = {}) { return applyWrites([{ path: ref.path, data, merge: !!opts.merge }]); }
export function writeBatch() {
  const writes = [];
  return {
    set(ref, data, opts = {}) { writes.push({ path: ref.path, data, merge: !!opts.merge }); return this; },
    delete(ref) { writes.push({ path: ref.path, del: true }); return this; },
    commit() { return applyWrites(writes); },
  };
}

// ---------- อ่าน ----------
function docSnap(path) {
  const d = store.get(path);
  return { id: idOf(path), ref: { path }, exists: () => d !== undefined, data: () => clone(d), metadata: { hasPendingWrites: pending.has(path), fromCache: false } };
}
function runQuery(q) {
  let rows = [...store.keys()].filter(k => colOf(k) === q.path).map(k => ({ path: k, d: store.get(k) }));
  let lim = null;
  for (const c of q.constraints || []) {
    if (c.kind === 'where') rows = rows.filter(({ d }) => {
      const v = d[c.field];
      return c.op === '==' ? v === c.value : c.op === '>=' ? v >= c.value : c.op === '<=' ? v <= c.value : c.op === '<' ? v < c.value : c.op === '>' ? v > c.value : c.op === 'in' ? c.value.includes(v) : true;
    });
    if (c.kind === 'orderBy') rows.sort((a, b) => (a.d[c.field] > b.d[c.field] ? 1 : a.d[c.field] < b.d[c.field] ? -1 : 0) * (c.dir === 'desc' ? -1 : 1));
    if (c.kind === 'limit') lim = c.n;
  }
  if (lim != null) rows = rows.slice(0, lim);
  const docs = rows.map(r => docSnap(r.path));
  return { docs, size: docs.length, empty: !docs.length, metadata: { hasPendingWrites: docs.some(d => d.metadata.hasPendingWrites), fromCache: false } };
}
export async function getDoc(ref) { checkRead(ref.path); return docSnap(ref.path); }
export async function getDocs(q) { checkRead((q.path) + '/__any'); return runQuery(q.type === 'col' ? { path: q.path, constraints: [] } : q); }
function notify() { listeners.forEach(l => { try { l(); } catch (e) { console.error(e); } }); }
export function onSnapshot(ref, a, b, c) {
  let next = a, error = b;
  if (typeof a === 'object' && a && !a.next) { next = b; error = c; }
  let alive = true;
  const fire = () => {
    if (!alive) return;
    try {
      if (ref.type === 'doc') { checkRead(ref.path); next(docSnap(ref.path)); }
      else { checkRead(ref.path + '/__any'); next(runQuery(ref.type === 'col' ? { path: ref.path, constraints: [] } : ref)); }
    } catch (e) { alive = false; listeners.delete(fire); error && error(e); }
  };
  listeners.add(fire);
  setTimeout(fire, 0);
  return () => { alive = false; listeners.delete(fire); };
}
