import { supabase } from '../../../config/supabase';
import { HCEModel } from './hceModel';

/** An HCE code as the registry compares it: digits without leading zeros ("00078" is 78). */
const codeKey = (v: unknown) => String(v ?? '').trim().replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');

/** A facility name as compared across branches: its consonants and digits, so "Cherthala Thaluk" is "CHERTHALA TALUK". */
const nameKey = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]|[aeiouhy]/g, '');

export const AssignmentModel = {
    getRouteAssignments: async (routeId: string) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .select(`
                *,
                keil_hces (hce_name, hce_code, address, hce_place, collection_type)
            `)
            .eq('route_id', routeId)
            .order('sequence_order')
            .order('created_at');

        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * Link a facility to a route, last in the route's order, so a list entered
     * in its sheet's order keeps that order. A facility can be linked more than
     * once (Mon & Thu at one place in the order, Tue & Fri at another, or on
     * another route): each link keeps its own days and place.
     */
    assignHce: async (assignmentData: any) => {
        const { data: last, error: lastError } = await supabase
            .from('keil_route_assignments')
            .select('sequence_order')
            .eq('route_id', assignmentData.route_id)
            .order('sequence_order', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (lastError) throw new Error(lastError.message);

        const { data, error } = await supabase
            .from('keil_route_assignments')
            .insert([{ ...assignmentData, sequence_order: (last?.sequence_order || 0) + 1 }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Bulk upload of a route's list for one set of days: the facilities, in the
     * order given, become the route's whole list for those days. The route's
     * other links lose those days, and go when none is left; their other days
     * stay. The new links go in before the old ones change, so a failed upload
     * loses nothing.
     *
     * An item is { hce_id } or, for a facility not found in the route's branch,
     * { hce_code, hce_name }. AFF NOs are numbered per branch, so it is the HCE
     * with that code in the route's branch; else the same hospital (same AFF NO
     * and name) registered under another branch; else it is registered in the
     * route's branch.
     */
    replaceDayList: async ({ route_id, company_id, collection_days, collection_type, items }: any) => {
        const { data: route, error: routeError } = await supabase
            .from('keil_routes').select('branch_id').eq('id', route_id).single();
        if (routeError) throw new Error(routeError.message);
        if (!route.branch_id) throw new Error('This route has no branch: set it in the Route Registry first.');

        const byCode = new Map<string, string>();    // AFF NO → HCE in the route's branch
        const elsewhere = new Map<string, string>(); // AFF NO and name → the same hospital under another branch
        const find = (i: any) => i.hce_id || byCode.get(codeKey(i.hce_code))
            || elsewhere.get(`${codeKey(i.hce_code)}|${nameKey(i.hce_name)}`);
        const unregistered = items.filter((i: any) => !i.hce_id);
        if (unregistered.length) {
            // Newest first, so of a hospital registered twice the oldest record wins
            (await HCEModel.getAll(company_id, [], true)).forEach(h => {
                if (h.branch_id === route.branch_id) byCode.set(codeKey(h.hce_code), h.id);
                else elsewhere.set(`${codeKey(h.hce_code)}|${nameKey(h.hce_name)}`, h.id);
            });
            const toCreate = new Map<string, any>();
            unregistered.forEach((i: any) => { if (!find(i)) toCreate.set(codeKey(i.hce_code), i); });
            if (toCreate.size) {
                const { data: created, error: createError } = await supabase
                    .from('keil_hces')
                    .insert([...toCreate.values()].map(i => ({
                        hce_code: String(i.hce_code).trim(),
                        hce_name: String(i.hce_name).trim().slice(0, 255),
                        branch_id: route.branch_id,
                        company_id,
                    })))
                    .select('id, hce_code');
                if (createError) throw new Error(createError.message);
                (created || []).forEach(h => byCode.set(codeKey(h.hce_code), h.id));
            }
        }
        const hce_ids = items.map(find);
        if (hce_ids.some((id: string | undefined) => !id)) throw new Error('Some facilities could not be registered in the HCE Registry.');

        const { data: links, error: findError } = await supabase
            .from('keil_route_assignments')
            .select('id, collection_days, sequence_order')
            .eq('route_id', route_id);
        if (findError) throw new Error(findError.message);

        const uploaded = (d: string) => collection_days.includes(d);
        const overlapping = (links || []).filter(l => (l.collection_days || []).some(uploaded));
        const old = overlapping.filter(l => l.collection_days.every(uploaded)).map(l => l.id);
        const trimmed = overlapping.filter(l => !l.collection_days.every(uploaded));
        const last = Math.max(0, ...(links || []).map(l => l.sequence_order || 0));

        // Arrange facilities strictly according to their exact serial number order for this respective day list
        const sortedItemsWithHce = items.map((it: any, idx: number) => ({ it, hce_id: hce_ids[idx] }))
            .sort((a: any, b: any) => {
                const na = a.it.sl_no != null && !Number.isNaN(Number(a.it.sl_no)) ? Number(a.it.sl_no) : Infinity;
                const nb = b.it.sl_no != null && !Number.isNaN(Number(b.it.sl_no)) ? Number(b.it.sl_no) : Infinity;
                return na - nb;
            });

        const { error } = await supabase.from('keil_route_assignments').insert(sortedItemsWithHce.map((entry: any, i: number) => ({
            route_id, company_id, hce_id: entry.hce_id, collection_days, collection_type, sequence_order: last + i + 1, sl_no: entry.it.sl_no ?? null,
        })));
        if (error) throw new Error(error.message);

        if (old.length) {
            const { error: deleteError } = await supabase.from('keil_route_assignments').delete().in('id', old);
            if (deleteError) throw new Error(deleteError.message);
        }
        const results = await Promise.all(trimmed.map(l => supabase
            .from('keil_route_assignments')
            .update({ collection_days: l.collection_days.filter((d: string) => !uploaded(d)) })
            .eq('id', l.id)));
        const failed = results.find(r => r.error);
        if (failed?.error) throw new Error(failed.error.message);
        return { added: hce_ids.length, replaced: old.length, trimmed: trimmed.length };
    },

    removeHce: async (id: string) => {
        const { error } = await supabase.from('keil_route_assignments').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    /** Save a new route order: each link's sequence_order, and sl_no when given. */
    reorder: async (items: { id: string; sequence_order: number; sl_no?: number | null }[]) => {
        const results = await Promise.all(items.map(it => supabase
            .from('keil_route_assignments')
            .update(it.sl_no === undefined ? { sequence_order: it.sequence_order } : { sequence_order: it.sequence_order, sl_no: it.sl_no })
            .eq('id', it.id)));
        const failed = results.find(r => r.error);
        if (failed?.error) throw new Error(failed.error.message);
        return true;
    },

    updateAssignment: async (id: string, updates: any) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
};
