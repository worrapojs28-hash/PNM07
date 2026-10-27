// ---------------------------------------------------------------- เครื่องมือทั่วไป
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function newId(len = 20) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const buf = crypto.getRandomValues(new Uint8Array(len));
  return [...buf].map(b => chars[b % chars.length]).join('');
}

function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

// ---------- วันที่ (เก็บ ค.ศ. 'YYYY-MM-DD', แสดง พ.ศ.) ----------
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function thDate(iso, full = false) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${(full ? TH_MONTHS_FULL : TH_MONTHS)[m - 1]} ${y + 543}`;
}
function thMonth(ym) { // '2026-08'
  const [y, m] = ym.split('-').map(Number);
  return `${TH_MONTHS_FULL[m - 1]} ${y + 543}`;
}
function thDateTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${thDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
const beYear = ceYear => ceYear + 543;

// ---------- เลขเคส: PREFIX-YY(พ.ศ.)-MM-NNN ----------
function parseCaseNo(no) {
  const m = /^([A-Za-z0-9]+)-(\d{2})-(\d{1,2})-(\d{1,4})$/.exec(no || '');
  return m ? { prefix: m[1], yy: +m[2], mm: +m[3], seq: +m[4] } : null;
}
function formatCaseNo(prefix, isoDate, seq) {
  const [y, m] = isoDate.split('-').map(Number);
  return `${prefix}-${String((y + 543) % 100).padStart(2, '0')}-${String(m).padStart(2, '0')}-${String(seq).padStart(3, '0')}`;
}
function nextCaseNo(cases, prefix, isoDate) {
  const [y, m] = isoDate.split('-').map(Number);
  const yy = (y + 543) % 100;
  let max = 0;
  for (const c of cases) {
    const p = parseCaseNo(c.caseNo);
    if (p && p.prefix === prefix && p.yy === yy && p.mm === m) max = Math.max(max, p.seq);
  }
  return { caseNo: formatCaseNo(prefix, isoDate, max + 1), seq: max + 1 };
}

// ---------- หลักฐานดิจิทัล ----------
async function sha256Hex(bytes) {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ย่อภาพให้ด้านยาวไม่เกิน maxPx แล้วบีบอัด JPEG (ค่า hash คิดจากไฟล์ที่จัดเก็บจริง)
async function compressImage(file, maxPx = 1280, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('เปิดไฟล์ภาพไม่ได้ ลองถ่ายใหม่หรือเลือกไฟล์ JPG/PNG'));
      i.src = url;
    });
    const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const bytes = dataUrlToBytes(dataUrl);
    return {
      dataUrl, width: w, height: h, bytes: bytes.length,
      sha256: await sha256Hex(bytes),
      originalName: file.name || null, originalBytes: file.size || null,
      originalModified: file.lastModified || null,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getGPS(timeout = 15000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('อุปกรณ์นี้ไม่รองรับ GPS'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), accuracy: Math.round(p.coords.accuracy), at: Date.now() }),
      e => reject(new Error(e.code === 1 ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — เปิดสิทธิ์ตำแหน่งให้เบราว์เซอร์ หรือพิมพ์พิกัดเอง' : 'หาตำแหน่งไม่สำเร็จ ลองอีกครั้งในที่โล่ง หรือพิมพ์พิกัดเอง')),
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}

// ---------- ส่งออก ----------
function toCSV(rows) {
  const cell = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}
function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// เปรียบเทียบข้อมูลก่อน/หลัง สำหรับบันทึก audit
function diff(before, after, skip = ['updatedAt', 'updatedBy', 'updatedByName']) {
  const out = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    if (skip.includes(k)) continue;
    const a = JSON.stringify(before?.[k] ?? null), b = JSON.stringify(after?.[k] ?? null);
    if (a !== b) out[k] = [before?.[k] ?? null, after?.[k] ?? null];
  }
  return out;
}

function fmtNum(v, step) {
  if (v == null || v === '') return '—';
  const dec = step && step.includes('.') ? step.split('.')[1].length : 2;
  return Number(v).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

const r4 = v => v == null || v === '' || isNaN(v) ? null : Math.round(Number(v) * 1e4) / 1e4;
