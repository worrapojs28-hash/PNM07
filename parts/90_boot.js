// ---------------------------------------------------------------- เริ่มต้นแอป
function resetScreen() {
  destroyMaps();
  $$('.sheet-wrap, .modal-wrap').forEach(x => x.remove());
  document.body.classList.remove('sheet-open');
  lastRoute = '';
}
let signedOutOnce = false;
function boot() {
  if (!firebaseConfig || !firebaseConfig.apiKey) { viewSetup(); return; }
  initFirebase();
  showLoading();
  onAuthStateChanged(auth, u => {
    // เปลี่ยนบัญชี/ออกจากระบบ: ล้างหน้าจอและข้อมูลเดิมทั้งหมด
    stopAll(); resetScreen();
    if (!u) { signedOutOnce = true; viewLogin(); return; }
    // เข้าสู่ระบบใหม่หลังออกจากระบบ: เริ่มที่หน้ารายการเคส (ไม่ค้างหน้าของบัญชีก่อน)
    if (signedOutOnce) history.replaceState(null, '', location.pathname + '#cases');
    S.authUser = u;
    showLoading('กำลังตรวจสอบสิทธิ์…');
    watchMember(u);
  });
  window.addEventListener('hashchange', () => { if (S.started) render(); });
  window.addEventListener('online', updateSync);
  window.addEventListener('offline', updateSync);
  document.addEventListener('click', e => {
    const ph = e.target.closest('[data-photo]');
    if (ph) { e.preventDefault(); openPhoto(ph.dataset.photo, ph.dataset.label); }
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
