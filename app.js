// ไฟล์นี้สร้างอัตโนมัติจาก parts/ ด้วย build.py — อย่าแก้ไขโดยตรง
// ===== บันทึกตัวอย่างน้ำมัน (PNM07) =====
// ไฟล์ app.js สร้างจากโฟลเดอร์ parts/ ด้วย build.py — แก้ที่ parts/ แล้วรัน python3 build.py
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, signOut, updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, getDoc, getDocs, setDoc, onSnapshot, query, where, orderBy, limit,
  writeBatch, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const APP_VERSION = '2026.10.28-0731';

// จังหวัด > อำเภอ > ตำบล (จากชีต 'ตำบล' ของ AppSheet) — แก้ไข/เพิ่มได้
const GEO = {"ราชบุรี": {"เมืองราชบุรี": ["หน้าเมือง", "เจดีย์หัก", "ดอนตะโก", "หนองกลางนา", "ห้วยไผ่", "คุ้งน้ำวน", "คุ้งกระถิน", "อ่างทอง", "โคกหม้อ", "สามเรือน", "พิกุลทอง", "น้ำพุ", "ดอนแร่", "หินกอง", "เขาแร้ง", "เกาะพลับพลา", "หลุมดิน", "บางป่า", "พงสวาย", "คูบัว", "ท่าราบ", "บ้านไร่"], "จอมบึง": ["จอมบึง", "ปากช่อง", "เบิกไพร", "ด่านทับตะโก", "แก้มอ้น", "รางบัว"], "สวนผึ้ง": ["สวนผึ้ง", "ป่าหวาย", "ท่าเคย", "ตะนาวศรี"], "ดำเนินสะดวก": ["ดำเนินสะดวก", "ประสาทสิทธิ์", "ศรีสุราษฎร์", "ตาหลวง", "ดอนกรวย", "ดอนคลัง", "บัวงาม", "บ้านไร่", "แพงพวย", "สี่หมื่น", "ท่านัด", "ขุนพิทักษ์", "ดอนไผ่"], "บ้านโป่ง": ["บ้านโป่ง", "ท่าผา", "กรับใหญ่", "ปากแรต", "หนองกบ", "หนองอ้อ", "ดอนกระเบื้อง", "สวนกล้วย", "นครชุมน์", "บ้านม่วง", "คุ้งพยอม", "หนองปลาหมอ", "เขาขลุง", "เบิกไพร", "ลาดบัวขาว"], "บางแพ": ["บางแพ", "วังเย็น", "หัวโพ", "วัดแก้ว", "ดอนใหญ่", "ดอนคา", "โพหัก"], "โพธาราม": ["โพธาราม", "ดอนกระเบื้อง", "หนองโพ", "บ้านเลือก", "คลองตาคต", "บ้านฆ้อง", "บ้านสิงห์", "ดอนทราย", "เจ็ดเสมียน", "คลองข่อย", "ชำแระ", "สร้อยฟ้า", "ท่าชุมพล", "บางโตนด", "เตาปูน", "นางแก้ว", "ธรรมเสน", "เขาชะงุ้ม", "หนองกวาง"], "ปากท่อ": ["ทุ่งหลวง", "วังมะนาว", "ดอนทราย", "หนองกระทุ่ม", "ปากท่อ", "ป่าไก่", "วัดยางงาม", "อ่างหิน", "บ่อกระดาน", "ยางหัก", "วันดาว", "ห้วยยางโทน"], "วัดเพลง": ["เกาะศาลพระ", "จอมประทัด", "วัดเพลง"], "บ้านคา": ["บ้านคา", "บ้านบึง", "หนองพันจันทร์"]}, "กาญจนบุรี": {"เมืองกาญจนบุรี": ["บ้านเหนือ", "บ้านใต้", "ปากแพรก", "ท่ามะขาม", "แก่งเสี้ยน", "หนองบัว", "ลาดหญ้า", "วังด้ง", "ช่องสะเดา", "หนองหญ้า", "เกาะสำโรง", "บ้านเก่า", "วังเย็น"], "ไทรโยค": ["ลุ่มสุ่ม", "ท่าเสา", "สิงห์", "ไทรโยค", "วังกระแจะ", "ศรีมงคล", "บ้องตี้"], "บ่อพลอย": ["บ่อพลอย", "หนองกุ่ม", "หนองรี", "หลุมรัง", "ช่องด่าน", "หนองกร่าง"], "ศรีสวัสดิ์": ["นาสวน", "ด่านแม่แฉลบ", "หนองเป็ด", "ท่ากระดาน", "เขาโจด", "แม่กระบุง"], "ท่ามะกา": ["พงตึก", "ยางม่วง", "ดอนชะเอม", "ท่าไม้", "ตะคร้ำเอน", "ท่ามะกา", "ท่าเรือ", "โคกตะบอง", "ดอนขมิ้น", "อุโลกสี่หมื่น", "เขาสามสิบหาบ", "พระแท่น", "หวายเหนียว", "แสนตอ", "สนามแย้", "ท่าเสา", "หนองลาน"], "ท่าม่วง": ["ท่าม่วง", "วังขนาย", "วังศาลา", "ท่าล้อ", "หนองขาว", "ทุ่งทอง", "เขาน้อย", "ม่วงชุม", "บ้านใหม่", "พังตรุ", "ท่าตะคร้อ", "รางสาลี่", "หนองตากยา"], "ทองผาภูมิ": ["ท่าขนุน", "ปิล๊อก", "หินดาด", "ลิ่นถิ่น", "ชะแล", "ห้วยเขย่ง", "สหกรณ์นิคม"], "สังขละบุรี": ["หนองลู", "ปรังเผล", "ไล่โว่"], "พนมทวน": ["พนมทวน", "หนองโรง", "ทุ่งสมอ", "ดอนเจดีย์", "พังตรุ", "รางหวาย", "หนองสาหร่าย", "ดอนตาเพชร"], "เลาขวัญ": ["เลาขวัญ", "หนองโสน", "หนองประดู่", "หนองปลิง", "หนองนกแก้ว", "ทุ่งกระบ่ำ", "หนองฝ้าย"], "ด่านมะขามเตี้ย": ["ด่านมะขามเตี้ย", "กลอนโด", "จรเข้เผือก", "หนองไผ่"], "หนองปรือ": ["หนองปรือ", "หนองปลาไหล", "สมเด็จเจริญ"], "ห้วยกระเจา": ["ห้วยกระเจา", "วังไผ่", "ดอนแสลบ", "สระลงเรือ"]}, "สุพรรณบุรี": {"เมืองสุพรรณบุรี": ["ท่าพี่เลี้ยง", "รั้วใหญ่", "ทับตีเหล็ก", "ท่าระหัด", "ไผ่ขวาง", "โคกโคเฒ่า", "ดอนตาล", "ดอนมะสังข์", "พิหารแดง", "ดอนกำยาน", "ดอนโพธิ์ทอง", "บ้านโพธิ์", "สระแก้ว", "ตลิ่งชัน", "บางกุ้ง", "ศาลาขาว", "สวนแตง", "สนามชัย", "โพธิ์พระยา", "สนามคลี"], "เดิมบางนางบวช": ["เขาพระ", "เดิมบาง", "นางบวช", "เขาดิน", "ปากน้ำ", "ทุ่งคลี", "โคกช้าง", "หัวเขา", "หัวนา", "บ่อกรุ", "วังศรีราช", "ป่าสะแก", "ยางนอน", "หนองกระทุ่ม"], "ด่านช้าง": ["หนองมะค่าโมง", "ด่านช้าง", "ห้วยขมิ้น", "องค์พระ", "วังคัน", "นิคมกระเสียว", "วังยาว"], "บางปลาม้า": ["โคกคราม", "บางปลาม้า", "ตะค่า", "บางใหญ่", "กฤษณา", "สาลี", "ไผ่กองดิน", "องครักษ์", "จรเข้ใหญ่", "บ้านแหลม", "มะขามล้ม", "วังน้ำเย็น", "วัดโบสถ์", "วัดดาว"], "ศรีประจันต์": ["ศรีประจันต์", "บ้านกร่าง", "มดแดง", "บางงาม", "ดอนปรู", "ปลายนา", "วังหว้า", "วังน้ำซับ", "วังยาง"], "ดอนเจดีย์": ["ดอนเจดีย์", "หนองสาหร่าย", "ไร่รถ", "สระกระโจม", "ทะเลบก"], "สองพี่น้อง": ["สองพี่น้อง", "บางเลน", "บางตาเถร", "บางตะเคียน", "บ้านกุ่ม", "หัวโพธิ์", "บางพลับ", "เนินพระปรางค์", "บ้านช้าง", "ต้นตาล", "ศรีสำราญ", "ทุ่งคอก", "หนองบ่อ", "บ่อสุพรรณ", "ดอนมะนาว"], "สามชุก": ["ย่านยาว", "วังลึก", "สามชุก", "หนองผักนาก", "บ้านสระ", "หนองสะเดา", "กระเสียว"], "อู่ทอง": ["อู่ทอง", "สระยายโสม", "จรเข้สามพัน", "บ้านดอน", "ยุ้งทะลาย", "ดอนมะเกลือ", "หนองโอ่ง", "ดอนคา", "พลับพลาไชย", "บ้านโข้ง", "เจดีย์", "สระพังลาน", "กระจัน"], "หนองหญ้าไซ": ["หนองหญ้าไซ", "หนองราชวัตร", "หนองโพธิ์", "แจงงาม", "หนองขาม", "ทัพหลวง"]}, "นครปฐม": {"เมืองนครปฐม": ["พระปฐมเจดีย์", "บางแขม", "พระประโทน", "ธรรมศาลา", "ตาก้อง", "มาบแค", "สนามจันทร์", "ดอนยายหอม", "ถนนขาด", "บ่อพลับ", "นครปฐม", "วังตะกู", "หนองปากโลง", "สามควายเผือก", "ทุ่งน้อย", "หนองดินแดง", "วังเย็น", "โพรงมะเดื่อ", "ลำพยา", "สระกะเทียม", "สวนป่าน", "ห้วยจรเข้", "ทัพหลวง", "หนองงูเหลือม", "บ้านยาง"], "กำแพงแสน": ["ทุ่งกระพังโหม", "กระตีบ", "ทุ่งลูกนก", "ห้วยขวาง", "ทุ่งขวาง", "สระสี่มุม", "ทุ่งบัว", "ดอนข่อย", "สระพัฒนา", "ห้วยหมอนทอง", "ห้วยม่วง", "กำแพงแสน", "รางพิกุล", "หนองกระทุ่ม", "วังน้ำเขียว"], "นครชัยศรี": ["นครชัยศรี", "บางกระเบา", "วัดแค", "ท่าตำหนัก", "บางแก้ว", "ท่ากระชับ", "ขุนแก้ว", "ท่าพระยา", "พะเนียด", "บางระกำ", "โคกพระเจดีย์", "ศรีษะทอง", "แหลมบัว", "ศรีมหาโพธิ์", "สัมปทวน", "วัดสำโรง", "ดอนแฝก", "ห้วยพลู", "วัดละมุด", "บางพระ", "บางแก้วฟ้า", "ลานตากฟ้า", "งิ้วราย", "ไทยาวาส"], "ดอนตูม": ["สามง่าม", "ห้วยพระ", "ลำเหย", "ดอนพุทรา", "บ้านหลวง", "ดอนรวก", "ห้วยด้วน", "ลำลูกบัว"], "บางเลน": ["บางเลน", "บางปลา", "บางหลวง", "บางภาษี", "บางระกำ", "บางไทรป่า", "หินมูล", "ไทรงาม", "ดอนตูม", "นิลเพชร", "บัวปากท่า", "คลองนกกระทุง", "นราภิรมย์", "ลำพญา", "ไผ่หูช้าง"], "สามพราน": ["ท่าข้าม", "ทรงคนอง", "หอมเกร็ด", "บางกระทึก", "บางเตย", "สามพราน", "บางช้าง", "ไร่ขิง", "ท่าตลาด", "กระทุ่มล้ม", "คลองใหม่", "ตลาดจินดา", "คลองจินดา", "ยายชา", "บ้านใหม่", "อ้อมใหญ่"], "พุทธมณฑล": ["ศาลายา", "คลองโยง", "มหาสวัสดิ์"]}, "สมุทรสาคร": {"เมืองสมุทรสาคร": ["มหาชัย", "ท่าฉลอม", "โกรกกราก", "บ้านบ่อ", "บางโทรัด", "กาหลง", "นาโคก", "ท่าจีน", "นาดี", "ท่าทราย", "คอกกระบือ", "บางน้ำจืด", "พันท้ายนรสิงห์", "โคกขาม", "บ้านเกาะ", "บางกระเจ้า", "บางหญ้าแพรก", "ชัยมงคล"], "กระทุ่มแบน": ["ตลาดกระทุ่มแบน", "อ้อมน้อย", "ท่าไม้", "สวนหลวง", "บางยาง", "คลองมะเดื่อ", "หนองนกไข่", "ดอนไก่ดี", "แคราย", "ท่าเสา"], "บ้านแพ้ว": ["บ้านแพ้ว", "หลักสาม", "ยกกระบัตร", "โรงเข้", "หนองสองห้อง", "หนองบัว", "หลักสอง", "เจ็ดริ้ว", "คลองตัน", "อำแพง", "สวนส้ม", "เกษตรพัฒนา"]}, "สมุทรสงคราม": {"เมืองสมุทรสงคราม": ["แม่กลอง", "บางขันแตก", "ลาดใหญ่", "บ้านปรก", "บางแก้ว", "ท้ายหาด", "แหลมใหญ่", "คลองเขิน", "คลองโคน", "นางตะเคียน", "บางจะเกร็ง"], "บางคนที": ["กระดังงา", "บางสะแก", "บางยี่รงค์", "โรงหีบ", "บางคนที", "ดอนมะโนรา", "บางพรม", "บางกุ้ง", "จอมปลวก", "บางนกแขวก", "ยายแพง", "บางกระบือ", "บ้านปราโมทย์"], "อัมพวา": ["อัมพวา", "สวนหลวง", "ท่าคา", "วัดประดู่", "เหมืองใหม่", "บางช้าง", "แควอ้อม", "ปลายโพงพาง", "บางแค", "แพรกหนามแดง", "ยี่สาร", "บางนางลี่"]}, "เพชรบุรี": {"เมืองเพชรบุรี": ["ท่าราบ", "คลองกระแชง", "บางจาน", "นาพันสาม", "ธงชัย", "บ้านกุ่ม", "หนองโสน", "ไร่ส้ม", "เวียงคอย", "บางจาก", "บ้านหม้อ", "ต้นมะม่วง", "ช่องสะแก", "นาวุ้ง", "สำมะโรง", "โพพระ", "หาดเจ้าสำราญ", "หัวสะพาน", "ต้นมะพร้าว", "วังตะโก", "โพไร่หวาน", "ดอนยาง", "หนองขนาน", "หนองพลับ"], "เขาย้อย": ["เขาย้อย", "สระพัง", "บางเค็ม", "ทับคาง", "หนองปลาไหล", "หนองปรง", "หนองชุมพล", "ห้วยโรง", "ห้วยท่าช้าง", "หนองชุมพลเหนือ"], "หนองหญ้าปล้อง": ["หนองหญ้าปล้อง", "ยางน้ำกลัดเหนือ", "ยางน้ำกลัดใต้", "ท่าตะคร้อ"], "ชะอำ": ["ชะอำ", "บางเก่า", "นายาง", "เขาใหญ่", "หนองศาลา", "ห้วยทรายเหนือ", "ไร่ใหม่พัฒนา", "สามพระยา", "ดอนขุนห้วย"], "ท่ายาง": ["ท่ายาง", "ท่าคอย", "ยางหย่อง", "หนองจอก", "มาบปลาเค้า", "ท่าไม้รวก", "วังไคร้", "กลัดหลวง", "ปึกเตียน", "เขากระปุก", "ท่าแลง", "บ้านในดง"], "บ้านลาด": ["บ้านลาด", "บ้านหาด", "บ้านทาน", "ตำหรุ", "สมอพลือ", "ไร่มะขาม", "ท่าเสน", "หนองกระเจ็ด", "หนองกะปุ", "ลาดโพธิ์", "สะพานไกร", "ไร่โคก", "โรงเข้", "ไร่สะท้อน", "ห้วยข้อง", "ท่าช้าง", "ถ้ำรงค์", "ห้วยลึก"], "บ้านแหลม": ["บ้านแหลม", "บางขุนไทร", "ปากทะเล", "บางแก้ว", "แหลมผักเบี้ย", "บางตะบูน", "บางตะบูนออก", "บางครก", "ท่าแร้ง", "ท่าแร้งออก"], "แก่งกระจาน": ["แก่งกระจาน", "สองพี่น้อง", "วังจันทร์", "ป่าเด็ง", "พุสวรรค์", "ห้วยแม่เพรียง"]}, "ประจวบคีรีขันธ์": {"เมืองประจวบคีรีขันธ์": ["ประจวบคีรีขันธ์", "เกาะหลัก", "คลองวาฬ", "ห้วยทราย", "อ่าวน้อย", "บ่อนอก"], "กุยบุรี": ["กุยบุรี", "กุยเหนือ", "เขาแดง", "ดอนยายหนู", "สามกระทาย", "หาดขาม"], "ทับสะแก": ["ทับสะแก", "อ่างทอง", "นาหูกวาง", "เขาล้าน", "ห้วยยาง", "แสงอรุณ"], "บางสะพาน": ["กำเนิดนพคุณ", "พงศ์ประศาสน์", "ร่อนทอง", "ธงชัย", "ชัยเกษม", "ทองมงคล", "แม่รำพึง"], "บางสะพานน้อย": ["ปากแพรก", "บางสะพาน", "ทรายทอง", "ช้างแรก", "ไชยราช"], "ปราณบุรี": ["ปราณบุรี", "เขาน้อย", "ปากน้ำปราณ", "หนองตาแต้ม", "วังก์พง", "เขาจ้าว"], "หัวหิน": ["หัวหิน", "หนองแก", "หินเหล็กไฟ", "หนองพลับ", "ทับใต้", "ห้วยสัตว์ใหญ่", "บึงนคร"], "สามร้อยยอด": ["สามร้อยยอด", "ศิลาลอย", "ไร่เก่า", "ศาลาลัย", "ไร่ใหม่"]}};

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

// ---------------------------------------------------------------- แผนที่ (Leaflet + OpenStreetMap)
const MAP_CENTER = [13.75, 99.9]; // พื้นที่ภาค 7 (นครปฐม ราชบุรี กาญจนบุรี สุพรรณบุรี ฯลฯ)
let liveMaps = [];
let mainMap = null, mainLayer = null;
const hasLeaflet = () => typeof window.L !== 'undefined';
// เรียก invalidateSize เฉพาะแผนที่ที่ยังอยู่ในหน้า (กันข้อผิดพลาดหลังลบแผนที่)
function safeRefresh(m) { if (m && m._mapPane && m._container && m._container.isConnected) m.invalidateSize({ animate: false }); }
function killMap(m) { try { m.stop(); m.off(); m.remove(); } catch { /* ไม่เป็นไร */ } }
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
function baseTiles() {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; ผู้ร่วมสร้าง <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });
}
function newMap(el, opts = {}, track = true) {
  if (L.Icon?.Default) L.Icon.Default.imagePath = 'vendor/leaflet/images/';
  const m = L.map(el, { zoomControl: true, attributionControl: true, ...opts });
  baseTiles().addTo(m);
  if (track) liveMaps.push(m);
  return m;
}
function destroyMaps() {
  liveMaps.forEach(killMap);
  liveMaps = []; mainMap = null; mainLayer = null;
}
function caseState(c) {
  if (samplesOf(c.id).some(s => sampleFails(s).length)) return 'fail';
  return (c.status || STATUS.WAIT) === STATUS.DONE ? 'done' : 'wait';
}
const STATE_LABEL = { fail: 'มีตัวอย่างไม่เป็นไปตามเกณฑ์', done: 'บันทึกผลแล้ว', wait: 'รอผลการตรวจ' };
const STATE_VAR = { fail: '--bad', done: '--ok', wait: '--warn' };

function viewMap(view, update) {
  if (!hasLeaflet()) { view.innerHTML = '<div class="empty"><p>โหลดแผนที่ไม่ได้ ลองเปิดแอปใหม่ขณะออนไลน์</p></div>'; return; }
  if (update && mainMap && $('#map-main')) { drawMarkers(); return; }
  destroyMaps();
  const focused = document.activeElement?.id === 'q';
  view.innerHTML = `
    <div class="head-row"><h1>แผนที่จุดเก็บตัวอย่าง</h1><select id="year" class="sel-year" aria-label="ปี">${yearOptions()}</select></div>
    ${filterBar()}
    <div class="legend" aria-label="คำอธิบายสัญลักษณ์">${Object.entries(STATE_LABEL).map(([k, v]) => `<span><i class="dot ${k}"></i>${v}</span>`).join('')}</div>
    <div id="map-main" class="map-main" role="region" aria-label="แผนที่"></div>
    <p class="count" id="map-count"></p>
    ${!navigator.onLine ? '<p class="small muted">ออฟไลน์: พื้นหลังแผนที่อาจไม่แสดง แต่ยังเห็นตำแหน่งหมุด</p>' : ''}`;
  mainMap = newMap($('#map-main'));
  mainMap.setView(MAP_CENTER, 8);
  mainLayer = L.featureGroup().addTo(mainMap);
  drawMarkers(true);
  bindFilters(view, () => drawMarkers(true));
  bindYear(view);
  if (focused) $('#q').focus();
}
function drawMarkers(fit = false) {
  if (!mainLayer) return;
  mainLayer.clearLayers();
  const list = filteredCases();
  const withLoc = list.filter(c => c.location && c.location.lat != null);
  const ring = cssVar('--surface');
  for (const c of withLoc) {
    const st = caseState(c);
    const mk = L.circleMarker([c.location.lat, c.location.lng], {
      radius: 9, weight: 2, color: ring, fillColor: cssVar(STATE_VAR[st]), fillOpacity: 0.95,
    });
    const ss = samplesOf(c.id);
    mk.bindPopup(`<div class="pop"><b class="mono">${esc(c.caseNo)}</b><br>${thDate(c.date)}<br>${esc(c.station || '')}<br>
      <span class="small">${esc(placeText(c))}</span><br>${ss.map(s => esc(s.fuel)).join(', ') || 'ยังไม่มีตัวอย่าง'}<br>
      <span class="small">${STATE_LABEL[st]}</span><br><a href="#case-${esc(c.id)}">เปิดเคส ›</a></div>`);
    mk.addTo(mainLayer);
  }
  const cnt = $('#map-count');
  if (cnt) cnt.textContent = `แสดง ${withLoc.length} จาก ${list.length} เคส${list.length - withLoc.length ? ` (${list.length - withLoc.length} เคสไม่มีพิกัด)` : ''}`;
  if (fit && withLoc.length) mainMap.fitBounds(mainLayer.getBounds(), { padding: [30, 30], maxZoom: 15, animate: false });
  setTimeout(() => safeRefresh(mainMap), 50);
}
function caseMiniMap(el, c) {
  if (!hasLeaflet() || !el) return;
  const m = newMap(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
  m.setView([c.location.lat, c.location.lng], 16);
  L.circleMarker([c.location.lat, c.location.lng], { radius: 10, weight: 3, color: cssVar('--surface'), fillColor: cssVar(STATE_VAR[caseState(c)]), fillOpacity: 1 }).addTo(m);
  setTimeout(() => safeRefresh(m), 60);
}
// แผนที่เลือกพิกัดในฟอร์ม: แตะเพื่อวางหมุด หรือลากหมุด
function mapPicker(el, loc, onPick) {
  if (!hasLeaflet() || !el) return null;
  const m = newMap(el, { scrollWheelZoom: false, tap: true }, false); // ไม่ผูกกับหน้าหลัก จึงไม่ถูกลบเมื่อหน้าหลักรีเฟรช
  let marker = null;
  const place = (lat, lng, zoom) => {
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true, autoPan: true }).addTo(m);
      marker.on('dragend', () => { const p = marker.getLatLng(); onPick(+p.lat.toFixed(6), +p.lng.toFixed(6)); });
    } else marker.setLatLng([lat, lng]);
    if (zoom) m.setView([lat, lng], zoom, { animate: false }); else m.panTo([lat, lng], { animate: false });
  };
  if (loc && loc.lat != null) place(loc.lat, loc.lng, 17); else m.setView(MAP_CENTER, 8);
  m.on('click', e => { place(e.latlng.lat, e.latlng.lng); onPick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)); });
  return {
    set: (lat, lng) => place(lat, lng, Math.max(m.getZoom(), 17)),
    refresh: () => safeRefresh(m),
    remove: () => killMap(m),
  };
}

// ---------------------------------------------------------------- ฟอร์ม (แผ่นเลื่อนขึ้น)
const CASE_PHOTO_LABELS = ['ภาพสถานีบริการ', 'ภาพหัวจ่าย/ตู้จ่าย', 'ภาพภาชนะและฉลาก', 'ภาพการปิดผนึก', 'อื่น ๆ'];
const CUSTODY_ACTIONS = ['ส่งมอบ', 'รับมอบ', 'เปิดผนึกเพื่อตรวจ', 'ปิดผนึกใหม่', 'ส่งคืน/จัดเก็บ', 'ทำลาย'];
const optionList = (arr, sel) => arr.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };

// ---------- เคส ----------
function openCaseForm(id) {
  if (!canWrite()) return;
  const c = id ? getCase(id) : null;
  if (id && (!c || !canEditCase(c))) { toast('แก้ไขเคสนี้ไม่ได้', 'error'); return; }
  const thisYear = new Date().getFullYear();
  if (!c && S.year !== thisYear) { S.year = thisYear; subscribeYear(); toast('สลับไปปีปัจจุบันเพื่อรันเลขเคส ลองกดอีกครั้ง'); go('#cases'); return; }
  const date = c?.date || todayISO();
  const d = { id: c?.id || newId(), photos: (c?.photos || []).map(p => ({ ...p })), location: c?.location ? { ...c.location } : null };
  const stations = [...new Set(S.cases.map(x => x.station).filter(Boolean))].sort();
  const sh = sheet(c ? 'แก้ไขข้อมูลเคส' : 'เก็บตัวอย่างใหม่', `
    <form id="case-form" class="form" novalidate>
      <div class="grid2">
        <label class="field"><span>เลขเคส</span><input name="caseNo" class="mono" required value="${esc(c?.caseNo || nextCaseNo(S.cases, casePrefix(), date).caseNo)}" ${c ? '' : 'data-auto="1"'}></label>
        <label class="field"><span>วันที่เก็บ</span><input type="date" name="date" required value="${esc(date)}"></label>
      </div>
      <small class="muted">เลขเคสรันอัตโนมัติ ${esc(casePrefix())}-ปี(พ.ศ.)-เดือน-ลำดับ แก้ไขได้</small>
      <label class="field"><span>ชื่อสถานีบริการ / บริษัท / เลขที่</span><input name="station" list="stations" required value="${esc(c?.station || '')}" placeholder="เช่น ชื่อแบรนด์ ชื่อบริษัท เลขที่ หมู่">
        <datalist id="stations">${stations.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
      <label class="field"><span>จังหวัด</span><select name="province" id="sel-prov"><option value="">— เลือก —</option>${optionList(Object.keys(GEO), c?.province)}</select></label>
      <div class="grid2">
        <label class="field"><span>อำเภอ</span><select name="district" id="sel-dist"></select></label>
        <label class="field"><span>ตำบล</span><select name="subdistrict" id="sel-sub"></select></label>
      </div>
      <fieldset class="gps">
        <legend>พิกัดจุดเก็บ</legend>
        <div class="row between"><small class="muted" id="gps-info">${c?.location?.accuracy ? `ความแม่นยำ ±${c.location.accuracy} ม.` : 'กดใช้ตำแหน่งปัจจุบัน หรือแตะบนแผนที่'}</small>
          <button type="button" class="btn sm primary" id="btn-gps">📍 ใช้ตำแหน่งปัจจุบัน</button></div>
        <div id="pick-map" class="pick-map" aria-label="แผนที่เลือกตำแหน่ง"></div>
        <div class="grid2">
          <label class="field"><span>ละติจูด</span><input name="lat" inputmode="decimal" class="mono" value="${c?.location?.lat ?? ''}" placeholder="13.xxxxxx"></label>
          <label class="field"><span>ลองจิจูด</span><input name="lng" inputmode="decimal" class="mono" value="${c?.location?.lng ?? ''}" placeholder="100.xxxxxx"></label>
        </div>
        <small class="muted">วางพิกัดจาก Google Maps แบบ "13.70, 100.31" ลงช่องละติจูดได้ทั้งคู่</small>
      </fieldset>
      <div class="field"><span>ภาพถ่าย ณ จุดเก็บ</span>
        <div class="photos" id="case-photos"></div>
        <div class="photo-add row"><select id="ph-label" aria-label="ประเภทภาพ">${optionList(CASE_PHOTO_LABELS, CASE_PHOTO_LABELS[0])}</select>
          <label class="btn sm"><input type="file" accept="image/*" capture="environment" hidden id="case-file">📷 ถ่าย/เลือกภาพ</label></div>
        <small class="muted">ระบบย่อภาพและคำนวณค่า SHA-256 ของไฟล์ที่จัดเก็บ</small></div>
      <label class="field"><span>ผู้เก็บตัวอย่าง</span><input name="collector" value="${esc(c?.collector || S.member.name)}"></label>
      <label class="field"><span>หมายเหตุ</span><textarea name="note" rows="2">${esc(c?.note || '')}</textarea></label>
      <button class="btn primary block" type="submit">${c ? 'บันทึกการแก้ไข' : 'บันทึกเคส แล้วเพิ่มตัวอย่าง'}</button>
    </form>`);
  const form = $('#case-form', sh.el);
  const sp = $('#sel-prov', sh.el), sd = $('#sel-dist', sh.el), st = $('#sel-sub', sh.el);
  const fillDist = sel => { sd.innerHTML = `<option value="">— เลือก —</option>${optionList(Object.keys(GEO[sp.value] || {}), sel)}`; };
  const fillSub = sel => { st.innerHTML = `<option value="">— เลือก —</option>${optionList((GEO[sp.value] || {})[sd.value] || [], sel)}`; };
  fillDist(c?.district); fillSub(c?.subdistrict);
  sp.addEventListener('change', () => { fillDist(); fillSub(); });
  sd.addEventListener('change', () => fillSub());
  form.date.addEventListener('change', () => { if (form.caseNo.dataset.auto && form.date.value) form.caseNo.value = nextCaseNo(S.cases, casePrefix(), form.date.value).caseNo; });
  form.caseNo.addEventListener('input', () => { delete form.caseNo.dataset.auto; });

  const setLoc = (lat, lng, extra = {}) => {
    form.lat.value = lat; form.lng.value = lng;
    d.location = { lat, lng, accuracy: extra.accuracy ?? null, source: extra.source || 'map', at: extra.at || Date.now() };
    $('#gps-info', sh.el).textContent = extra.accuracy ? `ความแม่นยำ ±${extra.accuracy} ม.` : 'ปักหมุดจากแผนที่';
    sh.el.dataset.dirty = '1';
  };
  const picker = mapPicker($('#pick-map', sh.el), d.location, (lat, lng) => setLoc(lat, lng, { source: 'map' }));
  setTimeout(() => picker?.refresh(), 260);
  new MutationObserver((_, obs) => { if (!sh.el.isConnected) { picker?.remove(); obs.disconnect(); } }).observe(document.body, { childList: true });
  const syncTyped = () => {
    const lat = parseFloat(form.lat.value), lng = parseFloat(form.lng.value);
    if (!isNaN(lat) && !isNaN(lng)) { d.location = { lat, lng, accuracy: null, source: 'manual' }; picker?.set(lat, lng); }
  };
  form.lat.addEventListener('change', syncTyped); form.lng.addEventListener('change', syncTyped);
  form.lat.addEventListener('paste', e => {
    const m = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/.exec((e.clipboardData || window.clipboardData).getData('text'));
    if (m) { e.preventDefault(); setLoc(+m[1], +m[2], { source: 'manual' }); picker?.set(+m[1], +m[2]); }
  });
  $('#btn-gps', sh.el).addEventListener('click', async ev => {
    const b = ev.currentTarget; b.disabled = true; b.textContent = 'กำลังหาตำแหน่ง…';
    try { const g = await getGPS(); setLoc(g.lat, g.lng, { ...g, source: 'gps' }); picker?.set(g.lat, g.lng); }
    catch (e) { toast(e.message, 'error', 6000); }
    finally { b.disabled = false; b.textContent = '📍 ใช้ตำแหน่งปัจจุบัน'; }
  });

  const drawPhotos = () => {
    const box = $('#case-photos', sh.el);
    box.innerHTML = d.photos.map((p, i) => `<div class="ph-wrap">${photoTile(p, p.label || `ภาพที่ ${i + 1}`)}<button type="button" class="x" data-rm="${i}" aria-label="นำภาพออก">×</button></div>`).join('') || '<p class="muted small">ยังไม่มีภาพ</p>';
    hydratePhotos(box);
  };
  drawPhotos();
  $('#case-photos', sh.el).addEventListener('click', async e => {
    const rm = e.target.closest('[data-rm]'); if (!rm) return;
    if (await confirmBox('นำภาพออกจากเคส', 'ภาพที่ส่งขึ้นระบบแล้วจะยังเก็บไว้ในฐานข้อมูล และมีประวัติการนำออก', 'นำออก', true)) { d.photos.splice(+rm.dataset.rm, 1); drawPhotos(); }
  });
  $('#case-file', sh.el).addEventListener('change', async e => {
    const p = await takePhoto(e.target, 'case', $('#ph-label', sh.el).value);
    if (p) { d.photos.push(p); drawPhotos(); sh.el.dataset.dirty = '1'; }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const caseNo = fd.caseNo.trim();
    if (!caseNo || !fd.date || !fd.station.trim()) { toast('กรอกเลขเคส วันที่ และชื่อสถานีบริการให้ครบ', 'error'); return; }
    if (S.cases.some(x => x.caseNo === caseNo && x.id !== d.id)) { toast(`เลขเคส ${caseNo} มีอยู่แล้ว กรุณาเปลี่ยนลำดับ`, 'error', 6000); return; }
    const lat = parseFloat(fd.lat), lng = parseFloat(fd.lng);
    let location = null;
    if (!isNaN(lat) && !isNaN(lng)) location = d.location && d.location.lat === lat && d.location.lng === lng ? d.location : { lat, lng, accuracy: null, source: 'manual' };
    const base = c ? { ...c } : { createdAt: Date.now(), createdBy: S.member.uid, createdByName: S.member.name, status: STATUS.WAIT, locked: false };
    delete base.id;
    const after = stamp({
      ...base, caseNo, seq: parseCaseNo(caseNo)?.seq ?? null, date: fd.date, station: fd.station.trim(),
      province: fd.province || null, district: fd.district || null, subdistrict: fd.subdistrict || null,
      location, collector: fd.collector.trim() || S.member.name, note: fd.note.trim() || null,
      photos: d.photos.map(photoRef),
    });
    const ops = [{ col: 'cases', id: d.id, data: after }, ...photoOps(d.photos, d.id, null)];
    ops.push(auditOp({ action: c ? 'update' : 'create', col: 'cases', docId: d.id, caseId: d.id, summary: c ? `แก้ไขข้อมูลเคส ${caseNo}` : `สร้างเคส ${caseNo}`, changes: c ? diff(c, after) : {} }));
    if (c && (c.caseNo !== caseNo || c.date !== fd.date)) {
      for (const s of samplesOf(c.id)) { const x = stamp({ ...s, caseNo, caseDate: fd.date }); delete x.id; ops.push({ col: 'samples', id: s.id, data: x }); }
    }
    save(ops, c ? 'บันทึกการแก้ไขแล้ว' : `สร้างเคส ${caseNo} แล้ว`);
    sh.close();
    if (fd.date.slice(0, 4) !== String(S.year)) { S.year = +fd.date.slice(0, 4); subscribeYear(); }
    go(`#case-${d.id}`);
    if (!c) setTimeout(() => openSampleForm(d.id, null), 350);
  });
}

// ---------- ตัวอย่าง ----------
function openSampleForm(caseId, sampleId) {
  if (!canWrite()) return;
  const c = getCase(caseId), s = sampleId ? getSample(sampleId) : null;
  if (!c || !canEditCase(c)) { toast('แก้ไขเคสนี้ไม่ได้', 'error'); return; }
  const siblings = samplesOf(c.id);
  const used = siblings.map(x => x.fuel);
  const d = {
    id: s?.id || newId(),
    fuel: s?.fuel || fuels().map(f => f.name).find(n => !used.includes(n) && /95|B7/.test(n)) || fuels()[0].name,
    photos: { ...(s?.photos || {}) }, newPhotos: [],
  };
  const values = { ...(s?.results || {}) };
  const fuelNames = fuels().map(f => f.name).concat(s && !fuels().some(f => f.name === s.fuel) ? [s.fuel] : []);
  const sh = sheet(s ? `ตัวอย่าง #${s.seq ?? ''} · ${c.caseNo}` : `เพิ่มตัวอย่าง · ${c.caseNo}`, `
    <form id="sample-form" class="form" novalidate>
      <div class="grid2">
        <label class="field"><span>ชนิดน้ำมัน</span><select name="fuel" id="sel-fuel">${optionList(fuelNames, d.fuel)}</select></label>
        <label class="field"><span>ลำดับตัวอย่าง</span><input name="seq" type="number" min="1" inputmode="numeric" value="${s?.seq ?? (Math.max(0, ...siblings.map(x => x.seq || 0)) + 1)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>สีน้ำมัน</span><select name="color"><option value="">— เลือก —</option>${optionList(COLORS.concat(s?.color && !COLORS.includes(s.color) ? [s.color] : []), s?.color)}</select></label>
        <label class="field"><span>เลขซีล <small class="muted">(ถ้ามี)</small></span><input name="sealNo" class="mono" value="${esc(s?.sealNo || '')}" autocomplete="off"></label>
      </div>
      ${pickerHtml('color', 'ภาพสีน้ำมัน', d.photos.color)}
      <h3>ผลการตรวจ</h3>
      <p class="small muted">กรอกเฉพาะรายการที่ตรวจ ถ่ายภาพหน้าจอเครื่องมือประกอบทุกค่า เกณฑ์ที่แสดงคือฉบับที่มีผลในวันที่ ${thDate(c.date)}</p>
      <div id="tests"></div>
      <label class="field"><span>หมายเหตุ</span><textarea name="note" rows="2">${esc(s?.note || '')}</textarea></label>
      <button class="btn primary block" type="submit">บันทึกตัวอย่าง</button>
    </form>`);
  const form = $('#sample-form', sh.el);
  const drawTests = () => {
    const f = fuelDef(d.fuel);
    $('#tests', sh.el).innerHTML = f.tests.filter(t => t !== 'color').map(t => {
      const T = TESTS[t] || { label: t, unit: '', step: 'any' };
      const crit = criterionFor(criteria(), d.fuel, t, c.date);
      return `<div class="test" data-test="${t}">
        <label class="field"><span>${esc(T.label)} ${T.unit ? `<small>(${esc(T.unit)})</small>` : ''} ${crit ? `<small class="muted">· เกณฑ์ ${esc(critText(crit))}</small>` : ''}</span>
        <input name="r_${t}" type="number" step="${T.step || 'any'}" inputmode="decimal" class="mono" value="${values[t] ?? ''}"></label>
        <div class="test-flag"></div>
        ${pickerHtml(t, T.label, d.photos[t])}</div>`;
    }).join('');
    $$('.test', sh.el).forEach(div => {
      const t = div.dataset.test, inp = div.querySelector('input');
      const upd = () => {
        const v = inp.value === '' ? null : +inp.value; values[t] = v;
        const r = evaluate(criteria(), d.fuel, t, v, c.date);
        div.querySelector('.test-flag').innerHTML = verdictBadge(r.state);
        div.classList.toggle('flagged', r.state === 'low' || r.state === 'high');
      };
      inp.addEventListener('input', upd); upd();
    });
    hydratePhotos($('#tests', sh.el));
  };
  drawTests();
  $('#sel-fuel', sh.el).addEventListener('change', e => { d.fuel = e.target.value; drawTests(); });
  form.addEventListener('change', async e => {
    const key = e.target.dataset?.file; if (!key) return;
    const label = key === 'color' ? 'ภาพสีน้ำมัน' : TESTS[key]?.label;
    const p = await takePhoto(e.target, key, label);
    if (!p) return;
    d.photos[key] = p; d.newPhotos.push(p); sh.el.dataset.dirty = '1';
    const box = form.querySelector(`[data-pick="${key}"]`);
    box.querySelector('.pick-preview').innerHTML = photoTile(p, label);
    box.querySelector('.pick-label').textContent = 'ถ่ายใหม่';
    hydratePhotos(box);
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fdata = Object.fromEntries(new FormData(form));
    const f = fuelDef(fdata.fuel);
    const results = {}, photos = {};
    for (const t of f.tests) {
      if (t !== 'color') { const raw = fdata['r_' + t]; if (raw !== undefined && raw !== '') results[t] = r4(raw); }
      if (d.photos[t]) photos[t] = photoRef(d.photos[t]);
    }
    const base = s ? { ...s } : { createdAt: Date.now(), createdBy: S.member.uid, createdByName: S.member.name, locked: false };
    delete base.id;
    const after = stamp({
      ...base, caseId: c.id, caseNo: c.caseNo, caseDate: c.date, seq: fdata.seq ? +fdata.seq : null,
      fuel: fdata.fuel, color: fdata.color || null, sealNo: fdata.sealNo.trim() || null, results, photos, note: fdata.note.trim() || null,
    });
    after.status = sampleHasResults(after) ? STATUS.DONE : STATUS.WAIT;
    const keep = d.newPhotos.filter(p => Object.values(photos).some(x => x.id === p.id));
    const ops = [{ col: 'samples', id: d.id, data: after }, ...photoOps(keep, c.id, d.id)];
    ops.push(auditOp({ action: s ? 'update' : 'create', col: 'samples', docId: d.id, caseId: c.id, summary: s ? `แก้ไขตัวอย่าง #${after.seq} ${after.fuel}` : `เพิ่มตัวอย่าง #${after.seq} ${after.fuel}`, changes: s ? diff(s, after) : {} }));
    save(ops, 'บันทึกตัวอย่างแล้ว');
    sh.close();
  });
}
function pickerHtml(key, label, existing) {
  return `<div class="pick" data-pick="${esc(key)}"><div class="pick-preview">${existing ? photoTile(existing, label) : ''}</div>
    <label class="btn sm ${existing ? 'ghost' : ''}"><input type="file" accept="image/*" capture="environment" hidden data-file="${esc(key)}"><span class="pick-label">${existing ? 'ถ่ายใหม่' : '📷 ถ่ายภาพ'}</span></label></div>`;
}

// ---------- การส่งมอบ ----------
function signaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false, empty = true, last = null;
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
  ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  const pos = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; empty = false; });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  return {
    isEmpty: () => empty,
    clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); empty = true; },
    toDataURL: () => {
      const out = document.createElement('canvas'); out.width = 480; out.height = 160;
      const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, 480, 160); o.drawImage(canvas, 0, 0, 480, 160);
      return out.toDataURL('image/png');
    },
  };
}
function openCustodyForm(caseId) {
  if (!canWrite()) return;
  const c = getCase(caseId); if (!c) return;
  const ss = samplesOf(caseId);
  const sh = sheet(`บันทึกการส่งมอบ · ${c.caseNo}`, `
    <p class="small muted">บันทึกแล้วแก้ไขหรือลบไม่ได้ ถ้าผิดพลาดให้บันทึกรายการใหม่พร้อมหมายเหตุ</p>
    <form id="cus-form" class="form" novalidate>
      <div class="grid2">
        <label class="field"><span>การดำเนินการ</span><select name="action">${optionList(CUSTODY_ACTIONS, 'ส่งมอบ')}</select></label>
        <label class="field"><span>วันที่</span><input type="date" name="date" value="${todayISO()}" required></label>
      </div>
      <div class="field"><span>ตัวอย่างที่เกี่ยวข้อง</span><div class="checks">${ss.map(s => `<label class="check"><input type="checkbox" name="samples" value="${esc(s.id)}" checked> #${s.seq} ${esc(s.fuel)}${s.sealNo ? ` (ซีล ${esc(s.sealNo)})` : ''}</label>`).join('') || '<span class="muted small">ไม่มีตัวอย่าง</span>'}</div></div>
      <label class="field"><span>ผู้ส่งมอบ</span><input name="from" required value="${esc(S.member.name)}"></label>
      <label class="field"><span>ผู้รับมอบ (ชื่อ-ตำแหน่ง)</span><input name="to" required></label>
      <label class="field"><span>สถานที่</span><input name="place" placeholder="เช่น ห้องปฏิบัติการ / จุดตรวจเก็บ"></label>
      <label class="field"><span>สภาพตัวอย่างและการปิดผนึก</span><input name="condition" placeholder="เช่น ซีลสมบูรณ์ ฉลากครบ"></label>
      <label class="field"><span>หมายเหตุ</span><textarea name="note" rows="2"></textarea></label>
      <div class="sig-box"><div class="row between"><span>ลายมือชื่อผู้ส่งมอบ</span><button type="button" class="linkbtn" data-clear="from">ล้าง</button></div><canvas class="sig" id="sig-from"></canvas></div>
      <div class="sig-box"><div class="row between"><span>ลายมือชื่อผู้รับมอบ</span><button type="button" class="linkbtn" data-clear="to">ล้าง</button></div><canvas class="sig" id="sig-to"></canvas></div>
      <button class="btn primary block" type="submit">บันทึกการส่งมอบ</button>
    </form>`);
  let pads = null;
  setTimeout(() => {
    pads = { from: signaturePad($('#sig-from', sh.el)), to: signaturePad($('#sig-to', sh.el)) };
    $$('[data-clear]', sh.el).forEach(b => b.addEventListener('click', () => pads[b.dataset.clear].clear()));
  }, 260);
  $('#cus-form', sh.el).addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!fd.get('from').trim() || !fd.get('to').trim()) { toast('กรอกชื่อผู้ส่งและผู้รับมอบ', 'error'); return; }
    const id = newId();
    const entry = {
      caseId: c.id, caseNo: c.caseNo, date: fd.get('date') || todayISO(), at: Date.now(), action: fd.get('action'), samples: fd.getAll('samples'),
      from: fd.get('from').trim(), to: fd.get('to').trim(), place: fd.get('place').trim() || null,
      condition: fd.get('condition').trim() || null, note: fd.get('note').trim() || null,
      signatureFrom: pads && !pads.from.isEmpty() ? pads.from.toDataURL() : null,
      signatureTo: pads && !pads.to.isEmpty() ? pads.to.toDataURL() : null,
      by: S.member.uid, byName: S.member.name,
    };
    save([{ col: 'custody', id, data: entry }, auditOp({ action: 'custody', col: 'custody', docId: id, caseId: c.id, summary: `${entry.action}: ${entry.from} → ${entry.to}` })], 'บันทึกการส่งมอบแล้ว');
    sh.close();
    setTimeout(() => render(), 300);
  });
}

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
