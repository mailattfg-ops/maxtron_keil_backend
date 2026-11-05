-- KEIL dashboard numbers, added up in the database.
--
-- WHY: the dashboard used to download every HCE, trip log, fuel filling, repair and
-- collection just to add them up in the browser. That was the slowest page, and the
-- trip log, repair and collection totals silently stopped at Supabase's 1000-row cap.
--
-- SAFE TO RUN: adds one read-only function. Changes no table and no data. Can be run twice.
--
-- !!! RUN THIS BEFORE DEPLOYING THE CODE THAT CALLS IT !!!
-- Only the backend's secret key may call it: /api/verify must show
-- "supabase_key_type": "secret", or the dashboard cards will show 0.

-- p_branches NULL = every branch. Same rule as the lists it replaces: branches, HCEs and
-- collections follow the user's branches; trip logs, fuel and repairs are company-wide.
-- Per-vehicle and per-route rows are returned because the cards filter by them.
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
        SELECT vehicle_id,
               sum(greatest(coalesce(end_km, 0) - coalesce(start_km, 0), 0)) AS km,
               count(*) AS trips
          FROM keil_vehicle_logs WHERE company_id = p_company GROUP BY vehicle_id) x), '[]'::jsonb),
    'collections', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT route_id,
               sum(coalesce(assigned_bedded, 0) + coalesce(assigned_others, 0)) AS assigned,
               sum(coalesce(visited_bedded, 0) + coalesce(visited_others, 0)) AS visited,
               sum(coalesce(collection_qty, 0)) AS waste,
               count(*) AS batches
          FROM headers GROUP BY route_id) x), '[]'::jsonb),
    'fuel', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT vehicle_id,
               sum(coalesce(liters, 0)) AS liters,
               sum(coalesce(amount, 0)) AS amount,
               count(*) AS refills
          FROM keil_fuel_filling WHERE company_id = p_company GROUP BY vehicle_id) x), '[]'::jsonb),
    'repairs', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT vehicle_id,
               sum(coalesce(cost, 0)) AS cost,
               sum(coalesce(cost, 0)) FILTER (WHERE is_gst_bill) AS gst_cost,
               count(*) FILTER (WHERE is_on_route) AS on_route,
               count(*) FILTER (WHERE status <> '' AND status <> 'Completed') AS in_progress,
               count(*) AS repairs
          FROM keil_vehicle_repairs WHERE company_id = p_company GROUP BY vehicle_id) x), '[]'::jsonb)
  );
$$;

-- Only the backend (service role) may call it; the public key may not.
REVOKE ALL ON FUNCTION public.keil_dashboard_summary(uuid, date, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.keil_dashboard_summary(uuid, date, uuid[]) TO service_role;

-- Let PostgREST see the new function right away.
NOTIFY pgrst, 'reload schema';
