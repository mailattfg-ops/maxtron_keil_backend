import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase';

export const getExpenseHeads = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        let query = supabase.from('hr_expense_heads').select('*').order('created_at', { ascending: false });
        if (company_id) query = query.eq('company_id', company_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, count: data?.length || 0, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createExpenseHead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, error } = await supabase.from('hr_expense_heads').insert([req.body]).select().single();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateExpenseHead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('hr_expense_heads').update(req.body).eq('id', id).select().single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteExpenseHead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('hr_expense_heads').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Expense Head deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getExpenditures = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        let query = supabase
            .from('hr_expenditures')
            .select(`
                *,
                expense_head:hr_expense_heads(id, head_name, head_code),
                employee:users(id, name, employee_code)
            `)
            .order('expenditure_date', { ascending: false });
            
        if (company_id) query = query.eq('company_id', company_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, count: data?.length || 0, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createExpenditure = async (req: Request, res: Response): Promise<void> => {
    try {
        const { payee_type } = req.body;
        
        let payload = { ...req.body };
        if (payee_type === 'employee') {
            payload.other_name = null;
            payload.other_mobile = null;
        } else if (payee_type === 'other') {
            payload.employee_id = null;
        }

        const { data, error } = await supabase.from('hr_expenditures').insert([payload]).select().single();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateExpenditure = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { payee_type } = req.body;

        let payload = { ...req.body };
        if (payee_type === 'employee') {
            payload.other_name = null;
            payload.other_mobile = null;
        } else if (payee_type === 'other') {
            payload.employee_id = null;
        }

        const { data, error } = await supabase.from('hr_expenditures').update(payload).eq('id', id).select().single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteExpenditure = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('hr_expenditures').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Expenditure deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
