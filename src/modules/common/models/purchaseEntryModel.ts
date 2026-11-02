import { supabase } from '../../../config/supabase';

export const PurchaseEntryModel = {
    getPendingBySupplier: async (supplierId: string, companyId: string) => {
        const { data, error } = await supabase
            .from('v_purchase_entry_balances')
            .select('*')
            .eq('supplier_id', supplierId)
            .eq('company_id', companyId)
            .gt('pending_amount', 0)
            .order('entry_date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }
};

