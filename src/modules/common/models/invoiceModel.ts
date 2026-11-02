import { supabase } from '../../../config/supabase';

export const InvoiceModel = {
    getPendingByCustomer: async (customerId: string, companyId: string) => {
        const { data, error } = await supabase
            .from('v_sales_invoice_balances')
            .select('*')
            .eq('customer_id', customerId)
            .eq('company_id', companyId)
            .gt('pending_amount', 0)
            .order('invoice_date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }
};

