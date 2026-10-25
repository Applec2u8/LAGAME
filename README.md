# 🎮 LA-GAME — Free PC & Console Games Platform

**LA-GAME** คือแพลตฟอร์มศูนย์รวมและดาวน์โหลดเกมฟรีสำหรับ PC และ Console (PS2, PS3, PS4, PS5, Switch, Xbox ฯลฯ) ที่พัฒนาด้วยเทคโนโลยีระดับโมเดิร์น **React 19 + TypeScript + Vite** ขับเคลื่อนระบบหลังบ้านด้วย **Supabase (PostgreSQL + Realtime + Storage)** และผสานพลัง **Multi-Provider AI (Google Gemini, Groq, OpenRouter)** ในการจัดการข้อมูลและระบบผู้ช่วยอัจฉริยะแบบครบวงจร

---

## 🌐 ภาพรวมระบบ (Architecture & Tech Stack)

| ด้าน | รายละเอียด |
|------|------------|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling** | Styled Components + Tailwind CSS + Vanilla CSS |
| **Backend & Database** | Supabase (PostgreSQL, Realtime Subscriptions) |
| **Cloud Storage** | Supabase Storage (`game-images`, `chat_attachments`) |
| **AI Providers** | Google Gemini API, Groq Cloud API, OpenRouter |
| **Automation** | Supabase `pg_cron` (Server-side) + Client-side Auto-Runner |
| **Game Media APIs** | SteamGridDB API, RAWG API |
| **Internationalization (i18n)** | รองรับ 3 ภาษา (English, ไทย, ພາສາລາວ) |

---

## ✨ ไฮไลท์ฟีเจอร์เด่น (Key Features)

### 🤖 1. Labot — ผู้ช่วย AI อัจฉริยะ & Live Support Chat
* **Multi-Model Intelligence:** รองรับโมเดล AI หลากหลายเจ้า เช่น Google Gemini, Groq (`gpt-oss`), และ OpenRouter
* **Voice-to-Text (แปลงเสียงเป็นข้อความ):** รองรับ Web Speech API พร้อมการแสดงผลข้อความสด (Real-time Text Sync) และคืนโฟกัสอัตโนมัติบนมือถือ (iOS Safari & Android Chrome)
* **Smart Image Upload (สูงสุด 15MB):** ส่งรูปภาพได้สูงสุด 6 รูปต่อข้อความ พร้อมระบบบีบอัดรูปภาพอัจฉริยะ (Canvas Downscaler) ป้องกันปัญหาเกินขีดจำกัด Payload API
* **Audio Voice Messaging:** ส่งและรับไฟล์เสียงบันทึกสดผ่านเครื่องเล่นเสียงในตัว
* **Game Mention System:** พิมพ์ `@` เพื่อค้นหาและแท็กชื่อเกมลงในบทสนทนาทันที
* **Real-time Live Support:** สลับโหมดติดต่อ Admin เพื่อสนทนาสดแบบ Real-time เชื่อมต่อกับระบบ Support Console ของแอดมิน

### ⚡ 2. Auto-Boost Metrics Engine (ระบบเร่งยอดการมีส่วนร่วมอัตโนมัติ)
* **Automated Worker:** ระบบตั้งเวลารันเพิ่มยอดวิวและยอดไลก์อัตโนมัติตามช่วงเวลาที่กำหนด (เช่น ทุก 1 นาที, ทุก 1 ชั่วโมง, ทุกวัน)
* **Target Scope:** กำหนดเป้าหมายการบูสต์ได้ทั้งแบบทั้งเว็บ (All Games), เฉพาะหมวดหมู่ (Category), หรือเลือกเจาะจงเฉพาะเกม
* **Instant "Boost Now":** ปุ่มสั่งรันการทำงานทันทีโดยไม่ต้องรอรอบถัดไป
* **Server-Side Cron Ready:** มาพร้อมไฟล์ SQL Schema และ `pg_cron` สำหรับรันอัตโนมัติ 24/7 บน Supabase Server แม้จะปิดเบราว์เซอร์ไปแล้ว
* **Precision Fine-Tune & Batch Actions:** ปรับแต่งยอดแบบรวดเร็วทีละเกม (+10, +50, +500) หรือเลือกหลายเกมพร้อมกันในคลิกเดียว
* **Mobile Bottom Sheet:** หน้าต่างตั้งค่าแบบ Slide-up Bottom Sheet สำหรับผู้ใช้งานมือถือโดยเฉพาะ

### 🕹️ 3. ประสบการณ์ผู้ใช้ (User Experience)
* **แคตตาล็อกเกมครบวงจร:** ค้นหาเกมตามตัวอักษร A-Z, กรองตามหมวดหมู่, และเกมแนะนำ (Featured)
* **หน้ารายละเอียดเกมแบบสมบูรณ์:**
  * รองรับตัวอย่างวิดีโอ YouTube Trailer
  * แสดงสเปกคอมพิวเตอร์ (System Requirements: ขั้นต่ำ และ แนะนำ)
  * คลังภาพ Screenshots พร้อมโหมดซูมดูรูปขนาดเต็ม (Lightbox)
  * ลิงก์ดาวน์โหลดแบบ Multi-Cloud (Google Drive, MEGA, DataNodes ฯลฯ) พร้อมหน้านับถอยหลัง Interstitial
* **ระบบความคิดเห็น (Comments):** แสดงความคิดเห็นและรีวิวเกม พร้อมระบบแจ้งเตือนแอดมิน

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
LA-GAME/
├── public/                    # ไฟล์ Static และ Sitemap
├── scripts/
│   └── generate-sitemap.js    # สคริปต์สร้าง Sitemap อัตโนมัติก่อน Build
├── src/
│   ├── components/            # คอมโพเนนต์ส่วนกลาง
│   │   ├── ChatBot/           # Labot AI & Live Support Widget
│   │   ├── GameCard/          # การ์ดแสดงผลข้อมูลเกม
│   │   ├── Navbar/            # แถบเมนูด้านบน
│   │   └── Footer/            # ส่วนท้ายของเว็บไซต์
│   ├── lib/                   # โมดูลระบบ บริการ และฐานข้อมูล
│   │   ├── supabase.ts        # Supabase Client & Upload Helpers
│   │   ├── aiProvider.ts      # ระบบจัดคิวและเรียกใช้งาน Gemini/Groq/OpenRouter
│   │   ├── chatService.ts     # ตรรกะการประมวลผลข้อความแชต
│   │   ├── engagementService.ts # บริการจัดการสถิติยอดวิว/ยอดไลก์
│   │   ├── steamgriddb.ts     # ดึงรูปปกและภาพเกมจาก SteamGridDB
│   │   ├── rawg.ts            # ข้อมูลเกมจาก RAWG API
│   │   ├── analytics.ts       # ระบบเก็บสถิติผู้เข้าชม
│   │   ├── i18n/              # ไฟล์แปลภาษา (EN, TH, LO)
│   │   └── *.sql              # สคริปต์ฐานข้อมูล Supabase และ pg_cron
│   └── pages/                 # หน้าเพจทั้งหมด
│       ├── Home/              # หน้าแรก (Hero, Featured, Categories, Top Games)
│       ├── Game/              # หน้ารายละเอียดเกมและลิงก์ดาวน์โหลด
│       ├── Interstitial/      # หน้านับถอยหลังก่อนส่งไปยังลิงก์ดาวน์โหลด
│       ├── AZFilter/          # ตัวกรองเกมตามตัวอักษร A-Z
│       ├── TopGames/          # อันดับเกมยอดนิยม
│       ├── ComingSoon/        # รายการเกมที่กำลังจะมาถึง
│       ├── Comments/          # ศูนย์รวมความคิดเห็นของผู้ใช้งาน
│       └── Admin/             # แดชบอร์ดและระบบจัดการหลังบ้าน
│           ├── Dashboard/     # สรุปสถิติผู้เข้าชม, เกม, วิว, ไลก์
│           ├── Games/         # จัดการ เพิ่ม/แก้ไข/ลบ เกม + AI Auto-Fill
│           ├── BoostMetrics/  # ควบคุมระบบเร่งยอด & Auto-Boost Schedules
│           ├── Categories/    # จัดการหมวดหมู่เกม
│           ├── ApiKeys/       # จัดการคีย์ API สำหรับโมเดล AI
│           ├── Chatbot/       # ตั้งค่า Labot (โมเดล, ข้อความต้อนรับ, ฟีเจอร์)
│           ├── Support/       # หน้าต่างตอบแชตช่วยเหลือผู้ใช้แบบ Real-time
│           ├── TopRanking/    # จัดอันดับ Top Chart เกม
│           ├── Comments/      # ตรวจสอบและจัดการความคิดเห็น
│           └── Ads/           # จัดการตำแหน่งโฆษณาและแบนเนอร์
```

---

## 🛠️ การตั้งค่าสภาพแวดล้อม (Environment Variables)

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI API Keys (สามารถจัดการผ่านหน้า Admin /ap-admin/api-keys ได้เช่นกัน)
VITE_GEMINI_API_KEY=your-gemini-api-key

# External Game Media APIs (Optional)
VITE_STEAMGRIDDB_API_KEY=your-steamgriddb-key
VITE_RAWG_API_KEY=your-rawg-key
```

---

## 🗄️ การติดตั้งฐานข้อมูล Supabase & Auto-Boost Cron

1. เปิด **Supabase Dashboard** เข้าไปที่เมนู **SQL Editor**
2. รันสคริปต์สร้างตารางหลัก:
   * รันคำสั่งจากไฟล์ [`src/lib/supabase_schema.sql`](file:///d:/Dev/clone/LA-GAME/src/lib/supabase_schema.sql)
3. รันสคริปต์สำหรับระบบ Auto-Boost:
   * รันคำสั่งจากไฟล์ [`src/lib/boost_schedules_schema.sql`](file:///d:/Dev/clone/LA-GAME/src/lib/boost_schedules_schema.sql) เพื่อสร้างตาราง `boost_schedules` และ `boost_run_logs`
4. (ตัวเลือกเสริม) เปิดใช้งาน Server-Side Automation ผ่าน `pg_cron`:
   * รันคำสั่งจากไฟล์ [`src/lib/setup_pg_cron.sql`](file:///d:/Dev/clone/LA-GAME/src/lib/setup_pg_cron.sql) เพื่อเปิด Extension `pg_cron` ให้รันคำสั่งบวกยอดอัตโนมัติบนเซิร์ฟเวอร์ทุก 1 นาที

---

## 🚀 คำสั่งเริ่มต้นและรันโปรเจกต์ (Commands)

```bash
# 1. ติดตั้ง Dependencies ทั้งหมด
npm install

# 2. รัน Development Server (ค่าเริ่มต้นที่ http://localhost:5173)
npm run dev

# 3. สร้าง Sitemap และคอมไพล์โปรเจกต์สำหรับ Production
npm run build

# 4. ทดสอบพรีวิวผลงาน Production Build บนเครื่อง
npm run preview
```

---

## 🔐 การเข้าสู่ระบบแอดมิน (Admin Access)

* เข้าใช้งานผ่าน URL: `/ap-admin`
* ยืนยันตัวตนผ่านรหัสผ่าน Master Admin Gateway ที่กำหนดไว้ในฐานข้อมูล Supabase
* หลังล็อกอินสำเร็จ แอดมินสามารถจัดการเกม, ตั้งค่าระบบ Auto-Boost, ตรวจสอบคีย์ API และตอบแชต Support ผู้ใช้ได้ทันที

---

## 📄 ลิขสิทธิ์ (License)

MIT License — จัดทำและพัฒนาโดยทีมงาน **LA-GAME**
