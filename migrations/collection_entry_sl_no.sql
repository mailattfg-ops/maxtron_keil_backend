-- Daily collection: keep each saved row's serial number, so extra visits stay last in order.
-- Run in the Keil Supabase SQL editor BEFORE deploying the backend and frontend that use it.
-- Additive only; undo: ALTER TABLE keil_collection_entries DROP COLUMN sl_no;
ALTER TABLE keil_collection_entries ADD COLUMN IF NOT EXISTS sl_no integer;
NOTIFY pgrst, 'reload schema';

-- Check: should return one row
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'keil_collection_entries' AND column_name = 'sl_no';
