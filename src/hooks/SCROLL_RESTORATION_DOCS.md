# คู่มือระบบ Scroll Restoration — LA-GAME Project

> **เขียนเพื่อ:** AI และนักพัฒนาในอนาคตที่ต้องการแก้ไขหรือต่อยอดระบบนี้โดยไม่ทำให้พัง  
> **อัปเดตล่าสุด:** 2026-09-27  
> **ไฟล์หลักที่เกี่ยวข้อง:** `src/hooks/useScrollRestore.ts`, `src/components/GameCard/GameCard.tsx`

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

### 1.1 หน้าที่หลัก

ระบบ Scroll Restoration ทำหน้าที่ **จดจำและคืนค่าตำแหน่ง scroll ของหน้าเว็บ** ให้ผู้ใช้งาน ใน 2 กรณีหลัก:

1. **Page Refresh** — รีเฟรชหน้า แล้วหน้าเว็บกลับมายังตำแหน่งเดิม
2. **Back Navigation** — กดเข้า Game Detail แล้วกด Back กลับมา หน้าเว็บกลับมายังตำแหน่งเดิม

### 1.2 ไฟล์ที่เกี่ยวข้องทั้งหมด

```
src/
├── hooks/
│   └── useScrollRestore.ts          ← Core hook (ไฟล์หลัก)
├── components/
│   └── GameCard/
│       └── GameCard.tsx             ← บันทึก scroll ก่อนออกจากหน้า
└── pages/
    ├── Home/HomePage.tsx            ← ใช้ useScrollRestore('scroll_pos_home', ...)
    ├── AZFilter/AZFilterPage.tsx    ← ใช้ useScrollRestore('scroll_pos_az_filter', ...)
    ├── TopGames/TopGamesPage.tsx    ← ใช้ useScrollRestore('scroll_pos_top_games', ...)
    ├── ComingSoon/ComingSoonPage.tsx← ใช้ useScrollRestore('scroll_pos_coming_soon', ...)
    └── Comments/CommentsPage.tsx   ← ใช้ useScrollRestore('scroll_pos_comments', ...)
```

### 1.3 Namespace Isolation (การแยก Key รายหน้า)

> [!IMPORTANT]
> แต่ละหน้าต้อง**ใช้ Key ที่ไม่ซ้ำกันโดยเด็ดขาด** มิฉะนั้นหน้าหนึ่งจะทับข้อมูลของอีกหน้า

Key ที่กำหนดไว้ใน `SCROLL_KEYS` constants:

| หน้า | Storage Key | Constant |
|------|-------------|----------|
| หน้าหลัก (Home) | `scroll_pos_home` | `SCROLL_KEYS.HOME` |
| A-Z Filter | `scroll_pos_az_filter` | `SCROLL_KEYS.AZ_FILTER` |
| Top PC Games | `scroll_pos_top_games` | `SCROLL_KEYS.TOP_GAMES` |
| Coming Soon | `scroll_pos_coming_soon` | `SCROLL_KEYS.COMING_SOON` |
| Comments/Guestbook | `scroll_pos_comments` | *(string literal)* |

---

## 2. กลไกการจัดเก็บข้อมูล (Dual-Storage Strategy)

> [!NOTE]
> ระบบใช้การจัดเก็บ **2 ที่พร้อมกัน** เพื่อรองรับทั้ง 2 กรณีอย่างครบถ้วน

```
┌─────────────────────────────────────────────────────┐
│              เมื่อผู้ใช้ Scroll หน้าจอ              │
│                  (debounced 150ms)                   │
│                         ↓                           │
│  ① window.history.replaceState({ key: scrollY })    │
│     → ผูกกับ History Entry นี้โดยเฉพาะ             │
│     → ไม่มีทางถูกเขียนทับโดยหน้าอื่น              │
│                                                     │
│  ② sessionStorage.setItem(key, scrollY)             │
│     → รอดพ้นจากการ Page Refresh                    │
│     → ถูกลบเมื่อปิด browser tab                    │
└─────────────────────────────────────────────────────┘
```

### 2.1 ทำไมต้องใช้ `history.state` เป็น Primary?

**ปัญหาเดิมของ sessionStorage เพียงอย่างเดียว:**

```
ผู้ใช้อยู่ที่ Y=800 → click การ์ดเกม
↓
GameCard onClick: sessionStorage = 800 ✅
↓
React Router navigate() → GameDetail mount (scroll = 0)
↓
HomePage unmount → Effect cleanup รัน:
  sessionStorage = window.scrollY  ← ตอนนี้คือ 0 ของ GameDetail! 💀
↓
กด Back → hook อ่าน sessionStorage = 0 → scroll ไป 0 ❌
```

**ด้วย `history.state`:**
```
ผู้ใช้อยู่ที่ Y=800 → scrolling → history.state['scroll_pos_home'] = 800
↓
click การ์ดเกม → GameCard บันทึก history.state = 800 (เป็นของ entry นี้)
↓
React Router pushState → สร้าง History Entry ใหม่สำหรับ GameDetail
   (Homepage entry ยังคงมี history.state['scroll_pos_home'] = 800 อยู่)
↓
กด Back → browser pop ไปที่ Homepage entry
↓
hook อ่าน window.history.state['scroll_pos_home'] = 800 ✅
```

---

## 3. เงื่อนไขการทำงาน 2 กรณีหลัก (Core Scenarios)

### 3.1 กรณี: Page Refresh (รีเฟรชหน้าเว็บ)

```
Browser โหลดหน้าใหม่ (history.state ถูกลบ)
↓
Component mount: loading=true, games=[]
↓
isReady = false → hook รอ
↓
Supabase fetch เสร็จ → setGames(data), setLoading(false)
↓
isReady = !loading && games.length > 0 = true
↓
Effect 3 รัน:
  ① history.state[key] = undefined (ถูกลบจาก refresh)
  ② sessionStorage[key] = '800' ✅ (ยังอยู่)
  targetY = 800
↓
requestAnimationFrame → tryScroll()
  maxScrollY = scrollHeight - innerHeight
  ถ้า maxScrollY >= 800 → window.scrollTo({ top: 800 }) ✅
  ถ้าไม่ถึง → poll ทุก 50ms สูงสุด 4 วินาที
```

### 3.2 กรณี: Back Navigation (กดย้อนกลับ)

```
ผู้ใช้ scroll ที่ Homepage (Y=800)
↓
[debounced] persistScroll():
  history.state = { ...routerState, scroll_pos_home: 800 }
  sessionStorage['scroll_pos_home'] = '800'
↓
คลิก GameCard → saveScrollOnClick():
  sessionStorage['scroll_pos_home'] = '800' (instant, ไม่รอ debounce)
  history.state['scroll_pos_home'] = 800    (instant)
↓
navigate('/game/:slug') → pushState → History Entry ใหม่
   (Homepage entry ยังมี scroll_pos_home=800 อยู่)
↓
กด Back (ทุกวิธี: swipe, ปุ่ม browser, ปุ่มในหน้า, keyboard)
↓
browser pop กลับ Homepage History Entry
↓
Component mount: loading=true, games=[]
↓
isReady = false → hook รอ
↓
Fetch เสร็จ → isReady = true
↓
Effect 3 รัน:
  ① history.state['scroll_pos_home'] = 800 ✅ (Primary)
  targetY = 800
↓
requestAnimationFrame → DOM พร้อม → window.scrollTo({ top: 800 }) ✅
```

---

## 4. API Reference

### 4.1 Hook Signature

```typescript
useScrollRestore(storageKey: string, isReady: boolean): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `storageKey` | `string` | **Unique key** สำหรับหน้านี้เท่านั้น ต้องใช้จาก `SCROLL_KEYS` constants |
| `isReady` | `boolean` | `true` เมื่อ Data โหลดเสร็จและ DOM แสดงรายการจริงแล้ว |

### 4.2 Constants และ Exports

```typescript
// ใช้ constant เหล่านี้เสมอ — ห้ามพิมพ์ string เองโดยตรงใน hook call
export const SCROLL_KEYS = {
  HOME: 'scroll_pos_home',
  AZ_FILTER: 'scroll_pos_az_filter',
  TOP_GAMES: 'scroll_pos_top_games',
  COMING_SOON: 'scroll_pos_coming_soon',
} as const

// ใช้ใน Header nav links เพื่อล้างค่า scroll เมื่อ user คลิก nav ไปหน้านั้น
export function clearScrollKey(storageKey: string): void

// @deprecated — backward compat เท่านั้น
export function clearRestoreFlag(path: string): void
export function markReturnFromDetail(_fromPath: string): void
export function saveScrollBeforeUnload(): void
```

### 4.3 ตัวอย่างการใช้งานในแต่ละหน้า

#### HomePage (`src/pages/Home/HomePage.tsx`)
```tsx
export default function HomePage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ ถูกต้อง: รอทั้ง loading=false และ games มีข้อมูล
  useScrollRestore('scroll_pos_home', !loading && games.length > 0)

  // ... fetchGames, JSX ...
}
```

#### AZFilterPage (`src/pages/AZFilter/AZFilterPage.tsx`)
```tsx
export default function AZFilterPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ ถูกต้อง: key แยกจาก Home โดยสิ้นเชิง
  useScrollRestore('scroll_pos_az_filter', !loading && games.length > 0)

  // ✅ เมื่อ user เปลี่ยน Letter/Search/Page → clear scroll เพื่อ scroll top
  const handleLetterClick = (l: string) => {
    setLoading(true)
    sessionStorage.removeItem('scroll_pos_az_filter')  // ← ต้อง clear ด้วย key ที่ตรงกัน!
    setParams({ letter: l })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}
```

#### TopGamesPage (`src/pages/TopGames/TopGamesPage.tsx`)
```tsx
export default function TopGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useScrollRestore('scroll_pos_top_games', !loading && games.length > 0)
}
```

#### ComingSoonPage (`src/pages/ComingSoon/ComingSoonPage.tsx`)
```tsx
export default function ComingSoonPage() {
  const [localLoading, setLocalLoading] = useState(true)
  const [epicLoading, setEpicLoading] = useState(true)
  const [steamLoading, setSteamLoading] = useState(true)
  const [epicGeneralLoading, setEpicGeneralLoading] = useState(true)

  // ✅ ถูกต้อง: รอให้ทุก section โหลดเสร็จ (หน้านี้มี 4 sources)
  useScrollRestore(
    'scroll_pos_coming_soon',
    !localLoading && !epicLoading && !steamLoading && !epicGeneralLoading
  )
}
```

### 4.4 การใช้งานใน GameCard (บันทึกก่อน navigate)

```tsx
// src/components/GameCard/GameCard.tsx

const PATHNAME_TO_SCROLL_KEY: Record<string, string> = {
  '/': SCROLL_KEYS.HOME,
  '/az-filter': SCROLL_KEYS.AZ_FILTER,
  '/top-games': SCROLL_KEYS.TOP_GAMES,
  '/coming-soon': SCROLL_KEYS.COMING_SOON,
  '/comments': 'scroll_pos_comments',
}

const saveScrollOnClick = () => {
  const key = PATHNAME_TO_SCROLL_KEY[window.location.pathname]
  if (key) {
    const y = window.scrollY
    sessionStorage.setItem(key, String(y))
    try {
      window.history.replaceState({ ...window.history.state, [key]: y }, '')
    } catch (_) {}
  }
}

return <Card to={`/game/${game.slug}`} onClick={saveScrollOnClick}>
```

---

## 5. กลไกภายใน Hook (Internal Mechanics)

### 5.1 ลำดับ Effects (Effect Execution Order)

```
Component Mount
│
├── Effect 1: hasRestored.current = false  ← reset ทุกครั้งที่ mount
│
├── Effect 2: addEventListener('scroll', handleScroll)
│             └── handleScroll (debounced 150ms):
│                   ถ้า hasRestored.current = true → persistScroll()
│                   ถ้า hasRestored.current = false → ไม่ทำอะไร (suppress)
│
└── Effect 3: ถ้า isReady = false → return ก่อน
              ถ้า isReady = true:
                ① อ่าน history.state[key]
                ② fallback: อ่าน sessionStorage[key]
                ③ tryScroll via RAF → setTimeout(100ms) → poll(50ms × 80)
                ④ เมื่อ scroll สำเร็จ: setTimeout(80ms) → hasRestored.current = true

isReady เปลี่ยนจาก false → true
└── Effect 3 re-runs → restore เริ่มทำงาน
```

### 5.2 Restore Strategy (3 ขั้นตอน)

```typescript
// ขั้น 1: requestAnimationFrame (หลัง browser paint ครั้งแรก)
//         จับกรณี: Data cached, DOM พร้อมทันที
requestAnimationFrame(() => {
  if (tryScroll()) return  // ถ้าสำเร็จ → จบ

  // ขั้น 2: setTimeout(100ms) (รอ lazy images / layout settle)
  //         จับกรณี: Images มี aspect-ratio แต่ยังไม่ได้ขนาดจริง
  setTimeout(() => {
    if (tryScroll()) return  // ถ้าสำเร็จ → จบ

    // ขั้น 3: setInterval(50ms × 80 = 4 วินาที)
    //         จับกรณี: หน้าโหลด incrementally หรือ network ช้า
    const poll = setInterval(() => {
      if (tryScroll() || attempts >= 80) clearInterval(poll)
    }, 50)
  }, 100)
})
```

### 5.3 `hasRestored` Guard

```
hasRestored.current = false  ← ตอน mount
        │
        ├── Effect 3 ทำงาน: suppress การบันทึก scroll ไว้ก่อน
        │   (ป้องกัน scroll event จาก programmatic scrollTo() ไปเขียนทับ 0)
        │
        ↓ scroll สำเร็จ → setTimeout(80ms)
        │
hasRestored.current = true   ← เริ่มบันทึก scroll ของ user ได้แล้ว
```

---

## 6. กฎเหล็กสำหรับ AI และนักพัฒนาในอนาคต

> [!CAUTION]
> ละเมิดกฎเหล่านี้จะทำให้ระบบ Scroll Restoration พังข้ามหน้า

### 🔴 กฎข้อ 1: ห้ามใช้ Key ซ้ำกันระหว่างหน้า

```typescript
// ❌ ผิด — 2 หน้าใช้ key เดียวกัน
// HomePage:
useScrollRestore('scroll_pos_games', !loading && games.length > 0)
// AZFilterPage:
useScrollRestore('scroll_pos_games', !loading && games.length > 0)  // ← ทับกัน!

// ✅ ถูก — key ไม่ซ้ำกัน
useScrollRestore('scroll_pos_home', ...)       // HomePage
useScrollRestore('scroll_pos_az_filter', ...) // AZFilterPage
```

### 🔴 กฎข้อ 2: ห้ามลบเงื่อนไข `isReady`

```typescript
// ❌ ผิด — scroll ก่อน DOM พร้อม → หน้าสั้นเกินไป → scroll ไม่ถึง
useScrollRestore('scroll_pos_home', true)  // ← always ready

// ✅ ถูก — รอ data จริงๆ
useScrollRestore('scroll_pos_home', !loading && games.length > 0)
```

**เหตุผล:** เมื่อ component mount ใหม่ หน้าเว็บยังว่าง (loading skeleton) ความสูงยังไม่ถึงตำแหน่งที่ต้องการ Scroll ไปก่อนจะ scroll ไม่ถึงหรือดีด reset กลับ

### 🔴 กฎข้อ 3: ห้ามเพิ่ม Unmount Snapshot กลับเข้ามา

```typescript
// ❌ อย่าทำ — unmount snapshot ทำให้ Back navigation พัง
return () => {
  window.removeEventListener('scroll', handleScroll)
  // ห้ามเพิ่มบรรทัดนี้:
  if (hasRestored.current) {
    sessionStorage.setItem(storageKey, String(window.scrollY)) // ← บันทึก Y=0 ของหน้าใหม่!
  }
}

// ✅ ถูกต้อง — cleanup แค่ remove listener
return () => {
  window.removeEventListener('scroll', handleScroll)
  clearTimeout(debounceId)
}
```

**เหตุผล:** เมื่อ React Router เปลี่ยน route, component unmount จะเกิดขึ้น **หลังจาก** หน้าใหม่ mount แล้ว ทำให้ `window.scrollY` เป็น 0 ของหน้าใหม่ — ทับค่าที่ถูกต้องทั้งหมด

### 🔴 กฎข้อ 4: ห้ามเคลียร์ sessionStorage ด้วย Key ผิด

```typescript
// ❌ ผิด — key format ไม่ตรงกับที่ hook ใช้
sessionStorage.removeItem(`scroll_${location.pathname}`)  // 'scroll_/'

// ✅ ถูก — ใช้ key เดียวกับที่ useScrollRestore ใช้
sessionStorage.removeItem('scroll_pos_home')
sessionStorage.removeItem(SCROLL_KEYS.HOME)  // แนะนำมากกว่า
```

### 🔴 กฎข้อ 5: เมื่อเพิ่มหน้าใหม่ต้องอัปเดต 2 ที่

เมื่อสร้างหน้า listing ใหม่ที่ต้องการ Scroll Restore:

```typescript
// 1. เพิ่ม constant ใน useScrollRestore.ts:
export const SCROLL_KEYS = {
  HOME: 'scroll_pos_home',
  AZ_FILTER: 'scroll_pos_az_filter',
  // ... existing ...
  NEW_PAGE: 'scroll_pos_new_page',  // ← เพิ่มที่นี่
} as const

// 2. เพิ่มใน GameCard.tsx PATHNAME_TO_SCROLL_KEY:
const PATHNAME_TO_SCROLL_KEY: Record<string, string> = {
  '/': SCROLL_KEYS.HOME,
  // ... existing ...
  '/new-page': SCROLL_KEYS.NEW_PAGE,  // ← เพิ่มที่นี่
}

// 3. ใช้ใน component ใหม่:
useScrollRestore(SCROLL_KEYS.NEW_PAGE, !loading && items.length > 0)
```

---

## 7. การ Debug และ Troubleshooting

### 7.1 Checklist เมื่อ Scroll Restore ไม่ทำงาน

```
□ เปิด DevTools → Application → Session Storage
  → มี key 'scroll_pos_[page]' ไหม?
  → ค่าถูกต้องไหม (ไม่ใช่ 0)?

□ เปิด DevTools → Console → พิมพ์:
  window.history.state
  → มี 'scroll_pos_[page]' ใน object ไหม?

□ ตรวจ isReady condition:
  → ค่าเปลี่ยนเป็น true ได้จริงไหม?
  → ไม่มีกรณีที่ games = [] ตลอดกาลไหม?

□ ตรวจ key ใน hook call:
  → ตรงกับ key ใน SCROLL_KEYS constants ไหม?
  → ตรงกับ PATHNAME_TO_SCROLL_KEY ใน GameCard ไหม?
```

### 7.2 ตาราง Symptom → Cause → Fix

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|-------|-------------------|---------|
| Back → scroll 0 เสมอ | key ใน GameCard ไม่ตรงกับ hook | ตรวจ `PATHNAME_TO_SCROLL_KEY` |
| Back → scroll 0 เสมอ | มี unmount snapshot เขียนทับ | ลบ cleanup snapshot ออก |
| Refresh → scroll 0 | sessionStorage ไม่ได้ถูก save | ตรวจ `persistScroll` ว่า debounce ทำงาน |
| Scroll ไปผิดหน้า | Key ซ้ำกัน 2 หน้า | เปลี่ยน key ให้ unique |
| Scroll ดีด reset | isReady = true เร็วเกินไป | เพิ่ม condition ให้เข้มขึ้น |
| Scroll ไม่ถึงจุด | หน้าสั้นเกิน / poll timeout | เพิ่ม MAX_ATTEMPTS หรือตรวจ DOM height |

### 7.3 วิธีทดสอบหลังแก้โค้ด

```
1. เปิดหน้า Home
2. Scroll ลงไปประมาณ 60% ของหน้า (สังเกตตำแหน่ง)
3. รอ 200ms (debounce)
4. คลิก GameCard ใดก็ได้
5. กด Back (ทดสอบหลายวิธี):
   - ปุ่ม ← บน browser
   - Alt+← บน keyboard
   - Swipe left บน trackpad (macOS)
   - ปุ่ม "← Back to Games" บนหน้า GameDetail
6. ✅ หน้าควรกลับมาที่ตำแหน่งเดิม (ไม่ใช่ top)
7. ทำซ้ำกับ AZFilter, TopGames, ComingSoon
8. กด Refresh → ✅ ควรกลับมาตำแหน่งเดิม
```

---

## 8. History ของ Bug ที่เคยแก้ไข (Bug Chronicle)

### Bug #1 — Key Format ไม่ตรงกัน (แก้แล้ว: 2026-09-27)
- **อาการ:** Back navigation ไม่ restore scroll เลย
- **สาเหตุ:** `GameCard.tsx` บันทึกด้วย `` `scroll_${pathname}` `` แต่ hook อ่าน `scroll_pos_home`
- **แก้ไข:** เปลี่ยน GameCard ให้ใช้ `PATHNAME_TO_SCROLL_KEY` map ที่ import `SCROLL_KEYS` จาก hook

### Bug #2 — Duplicate `useScrollRestore` Call (แก้แล้ว: 2026-09-27)
- **อาการ:** Restore รัน 2 ครั้ง → race condition
- **สาเหตุ:** `HomePage.tsx` เรียก `useScrollRestore` ซ้ำ 2 บรรทัด
- **แก้ไข:** ลบออกให้เหลือ 1 บรรทัดเท่านั้น

### Bug #3 — Unmount Snapshot เขียนทับด้วย Y=0 (แก้แล้ว: 2026-09-27)
- **อาการ:** Back navigation → scroll 0 เสมอ แม้ key ถูกต้อง
- **สาเหตุ:** Effect 2 cleanup บันทึก `window.scrollY` ขณะ unmount แต่ตอนนั้น GameDetail mount แล้ว ทำให้ scrollY = 0
- **แก้ไข:** เปลี่ยนมาใช้ `window.history.state` เป็น primary storage, ลบ unmount snapshot ออก

### Bug #4 — `saved === '0'` False Negative (แก้แล้ว: 2026-09-27)
- **อาการ:** ผู้ใช้ที่อยู่บน scroll=0 จะไม่ถูก restore
- **สาเหตุ:** `if (!saved || saved === '0')` ข้ามกรณีที่ scroll = 0 โดยเจตนา
- **แก้ไข:** เปลี่ยนเป็น `if (saved === null)` แยก case 0 ออกมาชัดเจน

---

## 9. สรุป Data Flow แบบภาพรวม

```
┌──────────────────────────────────────────────────────────────────┐
│                    SCROLL RESTORATION FLOW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Scrolls                                                    │
│       │                                                          │
│       ▼ (debounced 150ms)                                        │
│  persistScroll()                                                 │
│       ├─→ history.state[key] = scrollY  (per-entry, permanent)  │
│       └─→ sessionStorage[key] = scrollY (survives refresh)      │
│                                                                  │
│  User Clicks GameCard                                            │
│       │                                                          │
│       ▼ (instant, before navigate)                               │
│  saveScrollOnClick()                                             │
│       ├─→ history.state[key] = scrollY  ✅                       │
│       └─→ sessionStorage[key] = scrollY ✅                       │
│                                                                  │
│  ─────────────────── Navigate Away ───────────────────           │
│                                                                  │
│  [REFRESH]              [BACK BUTTON]                            │
│  history.state = ∅      history.state = { key: 800 } ✅          │
│  sessionStorage = '800' sessionStorage = '800'                   │
│       │                        │                                 │
│       ▼                        ▼                                 │
│  isReady = true         isReady = true                           │
│       │                        │                                 │
│       ▼ Effect 3               ▼ Effect 3                        │
│  read sessionStorage    read history.state (priority)            │
│  targetY = 800          targetY = 800                            │
│       │                        │                                 │
│       ▼                        ▼                                 │
│  RAF → tryScroll()      RAF → tryScroll()                        │
│  window.scrollTo(800)   window.scrollTo(800)                     │
│       ✅                        ✅                                │
└──────────────────────────────────────────────────────────────────┘
```

---

*เอกสารนี้ถูกสร้างขึ้นโดยอัตโนมัติจากการวิเคราะห์ source code และ bug history ณ วันที่ 2026-09-27*  
*หากมีการแก้ไข `useScrollRestore.ts` โปรดอัปเดตเอกสารนี้ด้วยทุกครั้ง*
