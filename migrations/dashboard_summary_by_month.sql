-- KEIL dashboard numbers, split by month, for the dashboard's month filter.
--
-- WHY: the old project's dashboard (D:\maxtron) gained a month filter on all four cards.
-- The new dashboard gets its totals from this function, so the totals now come one row
-- per vehicle (or route) PER MONTH, each row carrying "month" ('YYYY-MM'). The page adds
-- up the rows of the chosen month, or all rows for "All Months".
-- Months follow the same dates as the old page: log_date for trip logs, fuel and repairs,
-- collection_date for collections. A row with no date counts only under "All Months".
--
-- SAFE TO RUN: replaces one read-only function. Same name, same inputs, same totals;
-- changes no table and no data. Can be run twice.
-- The dashboard deployed today keeps working with it: it adds up the rows, and the
-- monthly rows add up to the same totals.
--
-- UNDO: run dashboard_summary.sql again (the previous version of this function).
--
-- Only the backend's secret key may call it: /api/verify must show
-- "supabase_key_type": "secret", or the dashboard cards will show 0.

CREATE OR REPLACE FUNCTION public.keil_dashboard_summary(p_company uuid, p_today date, p_branches uuid[] DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  WITH headers AS (
    SELECT h.route_id, h.collection_date, h.assigned_bedded, h.assigned_others,
           h.visited_bedded, h.visited_others, h.collection_qty
      FROM keil_collection_headers h
      LEFT JOIN keil_routes r ON r.id = h.route_id
     WHERE h.company_id = p_company
       AND (p_branches IS NULL OR r.branch_id = ANY(p_branches))
  )
  SELECT jsonb_build_object(
    'branches', (SELECT count(*) FROM keil_branches
                  WHERE company_id = p_company AND (p_branches IS NULL OR id = ANY(p_branches))),
    'hces', (SELECT count(*) FROM keil_hces
              WHERE company_id = p_company AND (p_branches IS NULL OR branch_id = ANY(p_branches))),
    'collections_today', (SELECT count(*) FROM headers WHERE collection_date = p_today),
    'km', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT vehicle_id, to_char(log_date, 'YYYY-MM') AS month,
               sum(greatest(coalesce(end_km, 0) - coalesce(start_km, 0), 0)) AS km,
               count(*) AS trips
          FROM keil_vehicle_logs WHERE company_id = p_company GROUP BY 1, 2) x), '[]'::jsonb),
    'collections', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT route_id, to_char(collection_date, 'YYYY-MM') AS month,
               sum(coalesce(assigned_bedded, 0) + coalesce(assigned_others, 0)) AS assigned,
               sum(coalesce(visited_bedded, 0) + coalesce(visited_others, 0)) AS visited,
               sum(coalesce(collection_qty, 0)) AS waste,
               count(*) AS batches
          FROM headers GROUP BY 1, 2) x), '[]'::jsonb),
    'fuel', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT vehicle_id, to_char(log_date, 'YYYY-MM') AS month,
               sum(coalesce(liters, 0)) AS liters,
               sum(coalesce(amount, 0)) AS amount,
               count(*) AS refills
          FROM keil_fuel_filling WHERE company_id = p_company GROUP BY 1, 2) x), '[]'::jsonb),
    'repairs', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT vehicle_id, to_char(log_date, 'YYYY-MM') AS month,
               sum(coalesce(cost, 0)) AS cost,
               sum(coalesce(cost, 0)) FILTER (WHERE is_gst_bill) AS gst_cost,
               count(*) FILTER (WHERE is_on_route) AS on_route,
               count(*) FILTER (WHERE status <> '' AND status <> 'Completed') AS in_progress,
               count(*) AS repairs
          FROM keil_vehicle_repairs WHERE company_id = p_company GROUP BY 1, 2) x), '[]'::jsonb)
  );
$$;

-- Only the backend (service role) may call it; the public key may not.
REVOKE ALL ON FUNCTION public.keil_dashboard_summary(uuid, date, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.keil_dashboard_summary(uuid, date, uuid[]) TO service_role;

-- Let PostgREST see the new version right away.
NOTIFY pgrst, 'reload schema';
