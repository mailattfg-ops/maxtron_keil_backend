import { supabase } from '../../../config/supabase';

export const AssignmentModel = {
    getRouteAssignments: async (routeId: string) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .select(`
                *,
                keil_hces (hce_name, hce_code, address, hce_place, collection_type)
            `)
            .eq('route_id', routeId)
            .order('sequence_order');

        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * Link a facility to a route. A facility has one link per route, holding
     * all its collection days; linking it again adds the new days to that
     * link (and takes the new frequency and remarks) instead of failing as a
     * duplicate. Its place in the route order is kept. `merged` says which.
     */
    assignHce: async (assignmentData: any) => {
        const { data: existing, error: findError } = await supabase
            .from('keil_route_assignments')
            .select('id, collection_days, remarks')
            .eq('route_id', assignmentData.route_id)
            .eq('hce_id', assignmentData.hce_id)
            .maybeSingle();
        if (findError) throw new Error(findError.message);

        if (existing) {
            const days = [...new Set([...(existing.collection_days || []), ...(assignmentData.collection_days || [])])];
            const { data, error } = await supabase
                .from('keil_route_assignments')
                .update({
                    collection_days: days,
                    ...(assignmentData.collection_type ? { collection_type: assignmentData.collection_type } : {}),
                    remarks: assignmentData.remarks || existing.remarks,
                })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return { ...data, merged: true };
        }

        const { data, error } = await supabase
            .from('keil_route_assignments')
            .insert([assignmentData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    removeHce: async (id: string) => {
        const { error } = await supabase.from('keil_route_assignments').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    updateOrder: async (id: string, orderNo: number) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .update({ sequence_order: orderNo })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
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
