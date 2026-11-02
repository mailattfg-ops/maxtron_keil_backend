import { supabase } from '../../../config/supabase';

export const CollectionModel = {
    // Get headers for reports/list
    getHeaders: async (companyId?: string, filters?: any, branchIds?: string[], isAllBranches?: boolean) => {
        const isScoped = !isAllBranches && branchIds && branchIds.length > 0;
        let query = supabase.from('keil_collection_headers').select(`
            *,
            route:${isScoped ? 'keil_routes!inner(route_name, route_code, branch_id)' : 'keil_routes(route_name, route_code)'}
        `);

        if (companyId) query = query.eq('company_id', companyId);
        if (filters?.date) query = query.eq('collection_date', filters.date);
        if (filters?.date_from) query = query.gte('collection_date', filters.date_from);
        if (filters?.date_to) query = query.lte('collection_date', filters.date_to);
        if (filters?.route_id) query = query.eq('route_id', filters.route_id);
        if (isScoped) {
            query = query.in('route.branch_id', branchIds);
        }

        const { data, error } = await query.order('collection_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    // Get specific header with entries
    getHeaderById: async (id: string) => {
        const { data: header, error: hError } = await supabase
            .from('keil_collection_headers')
            .select(`
                *,
                route:keil_routes(*)
            `)
            .eq('id', id)
            .single();

        if (hError) throw new Error(hError.message);

        const { data: entries, error: eError } = await supabase
            .from('keil_collection_entries')
            .select(`
                *,
                hce:keil_hces(*)
            `)
            .eq('header_id', id);

        if (eError) throw new Error(eError.message);

        return { ...header, entries };
    },

    // Create a whole collection batch (Header + Multiple Entries)
    saveCollectionBatch: async (headerData: any, entriesData: any[]) => {
        // Sanitize header time fields to avoid empty string database errors
        const sanitizedHeader = {
            ...headerData,
            start_time: headerData.start_time === '' ? null : headerData.start_time,
            end_time: headerData.end_time === '' ? null : headerData.end_time
        };

        // Step 1: Save Header
        const { data: header, error: hError } = await supabase
            .from('keil_collection_headers')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (hError) throw new Error(hError.message);

        // Step 2: Save Entries (Sanitize time fields to avoid empty string errors)
        const mappedEntries = entriesData.map(e => ({ 
            ...e, 
            header_id: header.id,
            start_time: e.start_time === '' ? null : e.start_time,
            end_time: e.end_time === '' ? null : e.end_time
        }));
        const { data: entries, error: eError } = await supabase
            .from('keil_collection_entries')
            .insert(mappedEntries)
            .select();

        if (eError) throw new Error(eError.message);

        return { ...header, entries };
    },

    deleteHeader: async (id: string) => {
        const { error } = await supabase.from('keil_collection_headers').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    getHceLedger: async (hceId: string, fromDate?: string, toDate?: string) => {
        let query = supabase
            .from('keil_collection_entries')
            .select(`
                *,
                header:keil_collection_headers!inner(collection_date, registration_number, driver_name, supervisor_name, spare_driver_name, start_time, end_time)
            `)
            .eq('hce_id', hceId)
            .eq('is_visited', true);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);

        // Filter by date range in application layer (Supabase join column filters are unreliable)
        let results = data || [];
        if (fromDate) {
            results = results.filter((r: any) => r.header?.collection_date >= fromDate);
        }
        if (toDate) {
            results = results.filter((r: any) => r.header?.collection_date <= toDate);
        }

        return results;
    }
};
