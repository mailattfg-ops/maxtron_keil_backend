import { supabase } from '../../../config/supabase';

export const RouteModel = {
    getAll: async (companyId?: string, branchIds?: string[], isAllBranches?: boolean) => {
        let query = supabase.from('keil_routes').select('*, keil_branches(branch_name)');
        if (companyId) query = query.eq('company_id', companyId);
        if (!isAllBranches && branchIds && branchIds.length > 0) {
            query = query.in('branch_id', branchIds);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return (data || []).map(r => ({
            ...r,
            branch_name: r.keil_branches?.branch_name
        }));
    },

    getById: async (id: string) => {
        const { data, error } = await supabase.from('keil_routes').select('*, keil_branches(branch_name)').eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (routeData: any) => {
        const { data, error } = await supabase.from('keil_routes').insert([routeData]).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, routeData: any) => {
        const { data, error } = await supabase.from('keil_routes').update(routeData).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    delete: async (id: string) => {
        // Step 1: Remove any assignments to this route to prevent FK constraint errors
        await supabase.from('keil_route_assignments').delete().eq('route_id', id);
        
        // Step 2: Delete the route itself
        const { error } = await supabase.from('keil_routes').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
