-- Route sheet upload: the database changes it needs, from the old project's
-- migrations (D:\maxtron\backend\migrations):
--   route_assignment_order.sql, route_assignment_sl_no.sql, hce_code_unique_per_branch.sql
--
-- 1. A facility can be on a route more than once (Mon & Thu at one place in the
--    order, Tue & Fri at another), so the one-link-per-facility-per-route rule goes.
-- 2. sl_no: the SL NO a facility has on its route sheet. Empty for links added by hand.
-- 3. HCE codes are numbered per branch, so a code is unique within its branch,
--    not within the whole company.
--
-- SAFE TO RUN: changes structure only, never a row. Can be run twice.
-- The old project's renumbering step is left out on purpose: the data re-sync
-- copies the old system's numbering exactly.
-- Run in the Supabase SQL Editor of the KEIL project, BEFORE deploying the code
-- that uploads route sheets.

ALTER TABLE keil_route_assignments DROP CONSTRAINT IF EXISTS keil_route_assignments_route_id_hce_id_key;

ALTER TABLE keil_route_assignments ADD COLUMN IF NOT EXISTS sl_no integer;

ALTER TABLE keil_hces DROP CONSTRAINT IF EXISTS keil_hces_hce_code_company_id_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'keil_hces_hce_code_branch_key') THEN
    ALTER TABLE keil_hces ADD CONSTRAINT keil_hces_hce_code_branch_key UNIQUE (company_id, branch_id, hce_code);
  END IF;
END $$;

-- Let PostgREST see the new column right away.
NOTIFY pgrst, 'reload schema';

-- CHECK (only reads): both should say true.
SELECT
  NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'keil_route_assignments_route_id_hce_id_key') AS facility_can_repeat,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'keil_route_assignments' AND column_name = 'sl_no') AS has_sl_no;
