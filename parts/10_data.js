// ---------------------------------------------------------------- รายการทดสอบ ชนิดน้ำมัน เกณฑ์
const TESTS = {
  color:        { label: 'สี',                     unit: '',      step: null },
  api:          { label: 'ค่า API (ความหนาแน่น)',   unit: 'kg/L',  step: '0.0001' },
  ron:          { label: 'ค่า RON',                 unit: '',      step: '0.1' },
  ethanol:      { label: 'เอทานอล',                 unit: '% v/v', step: '0.01' },
  methanol:     { label: 'เมทานอล',                 unit: '% v/v', step: '0.01' },
  distillation: { label: 'ค่าการกลั่น',             unit: '°C',    step: '0.1' },
  flash:        { label: 'จุดวาบไฟ',                unit: '°C',    step: '0.1' },
  sulfur:       { label: 'กำมะถัน',                 unit: 'mg/kg', step: '0.01' },
  fame:         { label: 'เมทิลเอสเตอร์ (FAME)',    unit: '% v/v', step: '0.01' },
};
const TEST_KEYS = Object.keys(TESTS);
const COLORS = ['ส้ม', 'เหลือง', 'เขียว', 'แดง', 'ฟ้า', 'ม่วง', 'ใส', 'อื่น ๆ'];
const GASOLINE_TESTS = ['color', 'ron', 'ethanol', 'methanol', 'distillation'];
const DIESEL_TESTS = ['color', 'api', 'distillation', 'flash', 'sulfur', 'fame'];

const DEFAULT_FUELS = [
  { name: 'Gasohol 91',    family: 'gasoline', dye: 'เขียว',  tests: GASOLINE_TESTS },
  { name: 'Gasohol 95',    family: 'gasoline', dye: 'ส้ม',    tests: GASOLINE_TESTS },
  { name: 'Gasohol (E20)', family: 'gasoline', dye: 'เขียว',  tests: GASOLINE_TESTS },
  { name: 'Gasohol (E85)', family: 'gasoline', dye: '',       tests: GASOLINE_TESTS },
  { name: 'Diesel (B7)',   family: 'diesel',   dye: 'เหลือง', tests: DIESEL_TESTS },
  { name: 'Diesel (B20)',  family: 'diesel',   dye: 'เหลือง', tests: DIESEL_TESTS },
];

// เกณฑ์ตามประกาศกรมธุรกิจพลังงาน (ธพ.) — แต่ละแถวมีช่วงวันที่มีผลบังคับ
// แถวที่ไม่มีวันที่ = เกณฑ์หลัก; แถวที่มีวันที่จะถูกใช้แทนเกณฑ์หลักเมื่อวันที่เก็บตัวอย่างอยู่ในช่วงนั้น
// verified=false หมายถึงผู้ดูแลระบบควรตรวจทานกับประกาศฉบับจริงแล้วกดยืนยันในหน้าตั้งค่า
const REF_GASOHOL = 'ประกาศ ธพ. เรื่อง กำหนดลักษณะและคุณภาพของน้ำมันแก๊สโซฮอล์ (แก้ไขถึงฉบับที่ 3 พ.ศ. 2567)';
const REF_DIESEL = 'ประกาศ ธพ. เรื่อง กำหนดลักษณะและคุณภาพของน้ำมันดีเซล พ.ศ. 2567 และฉบับแก้ไข';
const DEFAULT_CRITERIA = [
  { id: 'g91-ron',  fuel: 'Gasohol 91',    test: 'ron',     min: 91,   max: null, from: '', to: '', ref: REF_GASOHOL, verified: false },
  { id: 'g91-eth',  fuel: 'Gasohol 91',    test: 'ethanol', min: 9,    max: 10,   from: '', to: '', ref: REF_GASOHOL, verified: false },
  { id: 'g95-ron',  fuel: 'Gasohol 95',    test: 'ron',     min: 95,   max: null, from: '', to: '', ref: REF_GASOHOL, verified: false },
  { id: 'g95-eth',  fuel: 'Gasohol 95',    test: 'ethanol', min: 9,    max: 10,   from: '', to: '', ref: REF_GASOHOL, verified: false },
  { id: 'e20-ron',  fuel: 'Gasohol (E20)', test: 'ron',     min: 95,   max: null, from: '', to: '', ref: REF_GASOHOL, verified: false },
  { id: 'e20-eth',  fuel: 'Gasohol (E20)', test: 'ethanol', min: 19,   max: 21,   from: '', to: '', ref: REF_GASOHOL, verified: false },
  { id: 'e85-eth',  fuel: 'Gasohol (E85)', test: 'ethanol', min: 75,   max: 85,   from: '', to: '', ref: REF_GASOHOL, verified: false },
  { id: 'b7-den',   fuel: 'Diesel (B7)',   test: 'api',     min: 0.81, max: 0.87, from: '', to: '', ref: REF_DIESEL, verified: false },
  { id: 'b7-flash', fuel: 'Diesel (B7)',   test: 'flash',   min: 52,   max: null, from: '', to: '', ref: REF_DIESEL, verified: false },
  { id: 'b7-s',     fuel: 'Diesel (B7)',   test: 'sulfur',  min: null, max: 10,   from: '', to: '', ref: REF_DIESEL + ' (มาตรฐานยูโร 5)', verified: false },
  { id: 'b7-fame',  fuel: 'Diesel (B7)',   test: 'fame',    min: 5,    max: 7,    from: '', to: '', ref: REF_DIESEL + ' (ฉบับที่ 3 พ.ศ. 2567)', verified: false },
  { id: 'b7-fame-2569a', fuel: 'Diesel (B7)', test: 'fame', min: 6.6,  max: 7,    from: '2026-03-14', to: '2026-06-13', ref: 'ประกาศ ธพ. ปรับสัดส่วนเมทิลเอสเตอร์ชั่วคราว 14 มี.ค.–13 มิ.ย. 2569', verified: false },
  { id: 'b7-fame-2569b', fuel: 'Diesel (B7)', test: 'fame', min: 6.6,  max: 7,    from: '2026-06-14', to: '2026-09-13', ref: 'มติ กบง. คงสัดส่วน B7 14 มิ.ย.–13 ก.ย. 2569', verified: false },
  { id: 'b20-flash', fuel: 'Diesel (B20)', test: 'flash',   min: 52,   max: null, from: '', to: '', ref: REF_DIESEL, verified: false },
  { id: 'b20-s',    fuel: 'Diesel (B20)',  test: 'sulfur',  min: null, max: 10,   from: '', to: '', ref: REF_DIESEL + ' (มาตรฐานยูโร 5)', verified: false },
];

// เลือกเกณฑ์ที่มีผลในวันที่เก็บตัวอย่าง: แถวที่ระบุช่วงวันที่ (ล่าสุด) ชนะแถวเกณฑ์หลัก
function criterionFor(criteria, fuel, test, date) {
  const rows = (criteria || []).filter(c => c.fuel === fuel && c.test === test
    && (!c.from || !date || date >= c.from) && (!c.to || !date || date <= c.to));
  if (!rows.length) return null;
  rows.sort((a, b) => (b.from ? 1 : 0) - (a.from ? 1 : 0) || (b.from || '').localeCompare(a.from || ''));
  return rows[0];
}
// คืน { state: 'pass'|'low'|'high'|'none', crit }
function evaluate(criteria, fuel, test, value, date) {
  const crit = criterionFor(criteria, fuel, test, date);
  if (value == null || value === '' || !crit) return { state: 'none', crit };
  if (crit.min != null && value < crit.min) return { state: 'low', crit };
  if (crit.max != null && value > crit.max) return { state: 'high', crit };
  return { state: 'pass', crit };
}
function critText(c) {
  if (!c) return '';
  if (c.min != null && c.max != null) return `${c.min}–${c.max}`;
  if (c.min != null) return `≥ ${c.min}`;
  if (c.max != null) return `≤ ${c.max}`;
  return '';
}
