// Mock ของ Firebase Auth สำหรับทดสอบ: ผู้ใช้อยู่ใน localStorage
const UK = '__mockusers', CK = '__mockcurrent';
const users = () => { try { return JSON.parse(localStorage.getItem(UK) || '{}'); } catch { return {}; } };
const saveUsers = u => localStorage.setItem(UK, JSON.stringify(u));
const err = code => Object.assign(new Error(code), { code });
let current = null;
const cbs = new Set();
function makeUser(rec) {
  return {
    uid: rec.uid, email: rec.email, displayName: rec.displayName || null, emailVerified: !!rec.emailVerified,
    async reload() { const r = users()[rec.email]; if (r) { this.emailVerified = !!r.emailVerified; this.displayName = r.displayName || null; } },
    async getIdToken() { return 'token-' + rec.uid; },
  };
}
function setCurrent(rec) {
  current = rec ? makeUser(rec) : null;
  if (rec) localStorage.setItem(CK, rec.email); else localStorage.removeItem(CK);
  authObj.currentUser = current;
  setTimeout(() => cbs.forEach(cb => cb(current)), 0);
}
window.__authCurrent = () => current && { uid: current.uid, email: current.email, emailVerified: !!users()[current.email]?.emailVerified && current.emailVerified };
window.__mockVerify = email => { const u = users(); if (u[email]) { u[email].emailVerified = true; saveUsers(u); } };
window.__verifySent = [];
const authObj = { currentUser: null };
export const indexedDBLocalPersistence = {}, browserLocalPersistence = {};
export function initializeAuth() {
  const e = localStorage.getItem(CK);
  const rec = e && users()[e];
  current = rec ? makeUser(rec) : null;
  authObj.currentUser = current;
  return authObj;
}
export function onAuthStateChanged(auth, cb) { cbs.add(cb); setTimeout(() => cb(current), 0); return () => cbs.delete(cb); }
export async function createUserWithEmailAndPassword(auth, email, pw) {
  const u = users();
  if (u[email]) throw err('auth/email-already-in-use');
  if ((pw || '').length < 6) throw err('auth/weak-password');
  u[email] = { uid: 'u' + Math.random().toString(36).slice(2, 10), email, pw, emailVerified: false };
  saveUsers(u); setCurrent(u[email]);
  return { user: current };
}
export async function signInWithEmailAndPassword(auth, email, pw) {
  const r = users()[email];
  if (!r || r.pw !== pw) throw err('auth/invalid-credential');
  setCurrent(r); return { user: current };
}
export async function signOut() { setCurrent(null); }
export async function updateProfile(user, { displayName }) {
  const u = users(); if (u[user.email]) { u[user.email].displayName = displayName; saveUsers(u); }
  user.displayName = displayName;
}
export async function sendEmailVerification(user) { window.__verifySent.push(user.email); }
export async function sendPasswordResetEmail() {}
