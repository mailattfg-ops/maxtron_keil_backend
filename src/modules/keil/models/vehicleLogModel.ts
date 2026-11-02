import { supabase } from '../../../config/supabase';

export const VehicleLogModel = {
    getAll: async (companyId: string, filters?: any) => {
        let query = supabase
            .from('keil_vehicle_logs')
            .select(`
                *,
                vehicle:keil_vehicles!keil_vehicle_logs_vehicle_id_fkey(registration_number, vehicle_type),
                supervisor:users!keil_vehicle_logs_supervisor_id_fkey(name),
                route:keil_routes!keil_vehicle_logs_route_id_fkey(
                    route_name,
                    route_code
                )
            `)
            .eq('company_id', companyId)
            .order('log_date', { ascending: false });


        if (filters?.vehicle_id) {
            query = query.eq('vehicle_id', filters.vehicle_id);
        }
        if (filters?.from_date) {
            query = query.gte('log_date', filters.from_date);
        }
        if (filters?.to_date) {
            query = query.lte('log_date', filters.to_date);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    create: async (payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicle_logs')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id: string, payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicle_logs')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('keil_vehicle_logs')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }
};
