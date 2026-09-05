-- 1. เพิ่มคอลัมน์ category
ALTER TABLE public.gemini_api_keys ADD COLUMN category text DEFAULT 'gemini';

-- 2. อัปเดตข้อมูลเก่าให้มีค่าเป็น 'gemini' ทั้งหมด
UPDATE public.gemini_api_keys SET category = 'gemini' WHERE category IS NULL;
