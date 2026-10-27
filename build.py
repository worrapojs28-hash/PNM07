#!/usr/bin/env python3
"""ประกอบ app.js และ styles.css จากโฟลเดอร์ parts/ และใส่เลขเวอร์ชันใน sw.js
ใช้: python3 build.py            (เลขเวอร์ชัน = วันเวลาปัจจุบัน)
"""
import glob, re, sys, datetime, os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
version = datetime.datetime.now().strftime('%Y.%m.%d-%H%M')

js_parts = sorted(glob.glob('parts/[0-9][0-9]_*.js'))
if not js_parts:
    sys.exit('ไม่พบไฟล์ parts/*.js')
js = '\n'.join(open(p, encoding='utf-8').read() for p in js_parts)
if "'__VERSION__'" not in js:
    sys.exit('ไม่พบตัวแทนเวอร์ชันใน parts/00_imports.js')
js = js.replace("'__VERSION__'", repr(version), 1)
open('app.js', 'w', encoding='utf-8').write('// ไฟล์นี้สร้างอัตโนมัติจาก parts/ ด้วย build.py — อย่าแก้ไขโดยตรง\n' + js)

css = '\n'.join(open(p, encoding='utf-8').read() for p in ['parts/styles_base.css', 'parts/styles_app.css'])
open('styles.css', 'w', encoding='utf-8').write(css)

sw = open('sw.js', encoding='utf-8').read()
new_sw, n = re.subn(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", sw, count=1)
if n != 1:
    sys.exit('ไม่พบบรรทัด VERSION ใน sw.js')
open('sw.js', 'w', encoding='utf-8').write(new_sw)
print(f'built app.js ({len(js_parts)} parts, {len(js)} chars), styles.css, sw.js VERSION={version}')
