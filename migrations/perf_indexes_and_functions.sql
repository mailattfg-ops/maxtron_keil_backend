-- Performance + data-safety migration (additive only: indexes and functions).
-- Safe to run more than once. Run in Supabase SQL editor, or with psql "$SUPABASE_DB_URL" -f <this file>.

-- ---------------------------------------------------------------------------
-- 1. Indexes
-- Postgres does not index foreign-key columns by itself, so every
-- .eq('company_id', ...) and every nested select (invoice -> items, user -> addresses)
-- scanned the whole table. This creates an index for every single-column foreign key
-- and every company_id column that has none yet.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.relname AS tbl, a.attname AS col
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      AND (
        a.attname = 'company_id'
        OR EXISTS (SELECT 1 FROM pg_constraint k
                   WHERE k.conrelid = c.oid AND k.contype = 'f'
                     AND array_length(k.conkey, 1) = 1 AND k.conkey[1] = a.attnum)
      )
      -- skip columns that already lead an index
      AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.oid AND i.indkey[0] = a.attnum)
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
                   left('idx_' || r.tbl || '_' || r.col, 63), r.tbl, r.col);
  END LOOP;
END $$;

-- Lookups by person/company and date (attendance duplicate check, dashboard, reports).
DO $$
BEGIN
  IF to_regclass('public.attendance') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance (employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON public.attendance (company_id, date);
  END IF;
  IF to_regclass('public.sales_invoices') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_company_date ON public.sales_invoices (company_id, invoice_date);
  END IF;
  IF to_regclass('public.keil_collection_headers') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_keil_collection_headers_company_date ON public.keil_collection_headers (company_id, collection_date);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Highest number in a document-number column, e.g. CUST-031 -> 31.
-- Replaces reading every row in JavaScript, which stopped at Supabase's 1000-row
-- cap and then handed out codes already in use.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.max_doc_number(p_table text, p_col text, p_pattern text, p_company uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE result numeric;
BEGIN
  IF p_table <> 'customers' OR p_col <> 'customer_code' THEN
    RAISE EXCEPTION 'max_doc_number: % is not allowed', p_table;
  END IF;
  EXECUTE format(
    'SELECT max(((regexp_match(%1$I, $1, ''i''))[1])::numeric) FROM public.%2$I WHERE $2 IS NULL OR company_id = $2',
    p_col, p_table)
  INTO result USING p_pattern, p_company;
  RETURN coalesce(result, 0);
END $$;

REVOKE ALL ON FUNCTION public.max_doc_number(text, text, text, uuid) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.max_doc_number(text, text, text, uuid) TO service_role;
-- shortcut: the Keil backend .env uses the publishable (anon) key, so anon must keep
-- EXECUTE. Once SUPABASE_KEY holds the secret key, run:
--   REVOKE EXECUTE ON FUNCTION public.max_doc_number(text, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.max_doc_number(text, text, text, uuid) TO anon;

NOTIFY pgrst, 'reload schema';
