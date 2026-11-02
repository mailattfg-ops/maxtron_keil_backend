import { supabase } from '../../../config/supabase';

export const BranchModel = {
    getAll: async (companyId?: string, branchIds?: string[], isAllBranches?: boolean) => {
        let query = supabase.from('keil_branches').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        if (!isAllBranches && branchIds && branchIds.length > 0) {
            query = query.in('id', branchIds);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase.from('keil_branches').select('*').eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (data: any) => {
        const { data: res, error } = await supabase.from('keil_branches').insert([data]).select().single();
        if (error) throw new Error(error.message);
        return res;
    },

    update: async (id: string, data: any) => {
        const { data: res, error } = await supabase.from('keil_branches').update(data).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return res;
    },

    delete: async (id: string) => {
        // Check for associated routes
        const { data: routes, error: routeError } = await supabase
            .from('keil_routes')
            .select('id')
            .eq('branch_id', id)
            .limit(1);
        
        if (routes && routes.length > 0) {
            throw new Error('Cannot delete branch: It has associated routes. Please delete or reassign routes first.');
        }

        // Check for associated HCEs
        const { data: hces, error: hceError } = await supabase
            .from('keil_hces')
            .select('id')
            .eq('branch_id', id)
            .limit(1);
        
        if (hces && hces.length > 0) {
            throw new Error('Cannot delete branch: It has associated Health Care Establishments (HCEs). Please delete or reassign HCEs first.');
        }

        const { error } = await supabase.from('keil_branches').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
