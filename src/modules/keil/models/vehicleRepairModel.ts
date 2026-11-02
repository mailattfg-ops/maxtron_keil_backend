import { supabase } from '../../../config/supabase';

export const VehicleRepairModel = {
    getAll: async (companyId: string, filters?: { vehicle_id?: string; from?: string; to?: string } | string) => {
        let vehicleId: string | undefined;
        let fromDate: string | undefined;
        let toDate: string | undefined;

        if (typeof filters === 'string') {
            vehicleId = filters;
        } else if (filters) {
            vehicleId = filters.vehicle_id;
            fromDate = filters.from;
            toDate = filters.to;
        }

        let query = supabase
            .from('keil_vehicle_repairs')
            .select(`
                *,
                vehicle:keil_vehicles!keil_vehicle_repairs_vehicle_id_fkey(registration_number),
                driver:users!keil_vehicle_repairs_driver_id_fkey(name),
                route:keil_routes!keil_vehicle_repairs_route_id_fkey(
                    route_name,
                    route_code,
                    company:companies!keil_routes_company_id_fkey(company_name)
                )
            `)
            .eq('company_id', companyId)
            .order('entry_date', { ascending: false });

        if (vehicleId && vehicleId !== 'all' && vehicleId.trim() !== '') {
            query = query.eq('vehicle_id', vehicleId);
        }
        if (fromDate && fromDate.trim() !== '') {
            query = query.gte('log_date', fromDate);
        }
        if (toDate && toDate.trim() !== '') {
            query = query.lte('log_date', toDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    create: async (payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicle_repairs')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id: string, payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicle_repairs')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('keil_vehicle_repairs')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }
};
