import { supabase } from '../../../config/supabase';

export const HCEModel = {
    getAll: async (companyId?: string, branchIds?: string[], isAllBranches?: boolean) => {
        let query = supabase.from('keil_hces').select('*, keil_branches(branch_name)');
        if (companyId) query = query.eq('company_id', companyId);
        if (!isAllBranches && branchIds && branchIds.length > 0) {
            query = query.in('branch_id', branchIds);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return (data || []).map(h => ({
            ...h,
            branch_name: h.keil_branches?.branch_name
        }));
    },

    getById: async (id: string) => {
        const { data, error } = await supabase.from('keil_hces').select('*, keil_branches(branch_name)').eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (hceData: any) => {
        const { data, error } = await supabase.from('keil_hces').insert([hceData]).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, hceData: any) => {
        const { data, error } = await supabase.from('keil_hces').update(hceData).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('keil_hces').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
