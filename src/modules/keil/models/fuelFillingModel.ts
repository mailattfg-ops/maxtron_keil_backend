import { supabase } from '../../../config/supabase';

/* Supabase answers one request with at most 1000 rows. A year of the diesel
 * register is several thousand, so anything that needs all of them reads page
 * by page — a single request would quietly return only the first 1000. */
const PAGE = 1000;

/**
 * The rows of a batch that are not stored yet.
 *
 * The diesel register is one workbook that grows by a sheet each month, so the
 * same sheets get uploaded again and again; without this every upload would
 * enter the earlier months a second time.
 *
 * Counted, not just matched: two identical fillings on one day are two
 * fillings, and stay two.
 * ponytail: no database constraint behind this (identical rows are legitimate),
 * so two uploads running at the very same moment can still both get in.
 */
export function notYetStored(batch: any[], stored: any[]): any[] {
    const key = (r: any) => [r.company_id, String(r.log_date).slice(0, 10), r.vehicle_id, Number(r.liters).toFixed(2), Number(r.amount).toFixed(2)].join('|');
    const left = new Map<string, number>();
    for (const r of stored) left.set(key(r), (left.get(key(r)) || 0) + 1);
    return batch.filter(r => {
        const n = left.get(key(r)) || 0;
        if (n === 0) return true;
        left.set(key(r), n - 1);
        return false;
    });
}

export class FuelFillingModel {
    static async getAll(filters: any) {
        const rows: any[] = [];
        for (let from = 0; ; from += PAGE) {
            let query = supabase
                .from('keil_fuel_filling')
                .select(`
                    *,
                    vehicle:keil_vehicles!keil_fuel_filling_vehicle_id_fkey(registration_number),
                    company:companies!keil_fuel_filling_company_id_fkey(company_name)
                `)
                .order('log_date', { ascending: false })
                .order('id') // a fixed order, so pages neither repeat nor skip rows of the same date
                .range(from, from + PAGE - 1);

            if (filters.company_id) query = query.eq('company_id', filters.company_id);
            if (filters.vehicle_id && filters.vehicle_id !== 'all' && filters.vehicle_id !== '') query = query.eq('vehicle_id', filters.vehicle_id);
            if (filters.from && typeof filters.from === 'string' && filters.from.trim() !== '') query = query.gte('log_date', filters.from.trim());
            if (filters.to && typeof filters.to === 'string' && filters.to.trim() !== '') query = query.lte('log_date', filters.to.trim());

            const { data, error } = await query;
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < PAGE) break;
        }
        return rows;
    }

    static sanitize(data: any) {
        const {
            company_id,
            log_date,
            vehicle_id,
            indent_number,
            liters,
            rate,
            amount,
            efficiency,
            difference,
            remarks,
            pump_details,
            odometer_reading
        } = data;

        const clean: any = {};
        if (company_id !== undefined) clean.company_id = company_id;
        if (log_date !== undefined) clean.log_date = log_date;
        if (vehicle_id !== undefined) clean.vehicle_id = vehicle_id;
        if (indent_number !== undefined) clean.indent_number = indent_number;
        if (liters !== undefined) clean.liters = liters === '' ? null : liters;
        if (rate !== undefined) clean.rate = rate === '' ? null : rate;
        if (amount !== undefined) clean.amount = amount === '' ? null : amount;
        if (efficiency !== undefined) clean.efficiency = efficiency === '' ? null : efficiency;
        if (difference !== undefined) clean.difference = difference === '' ? null : difference;
        if (remarks !== undefined) clean.remarks = remarks;
        if (pump_details !== undefined) clean.pump_details = pump_details;
        if (odometer_reading !== undefined) clean.odometer_reading = (odometer_reading === '' || odometer_reading === null) ? null : odometer_reading;
        return clean;
    }

    static async create(data: any) {
        const cleanData = FuelFillingModel.sanitize(data);
        const { data: result, error } = await supabase
            .from('keil_fuel_filling')
            .insert([cleanData])
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    static async bulkCreate(records: any[]) {
        const cleanRecords = records.map(r => FuelFillingModel.sanitize(r));

        // What is already stored for the dates this batch covers
        const dates = cleanRecords.map(r => String(r.log_date)).sort();
        const stored: any[] = [];
        for (let from = 0; ; from += PAGE) {
            const { data, error } = await supabase
                .from('keil_fuel_filling')
                .select('company_id, log_date, vehicle_id, liters, amount')
                .gte('log_date', dates[0])
                .lte('log_date', dates[dates.length - 1])
                .order('id')
                .range(from, from + PAGE - 1);
            if (error) throw error;
            stored.push(...(data || []));
            if (!data || data.length < PAGE) break;
        }

        const fresh = notYetStored(cleanRecords, stored);
        // In parts: a year of fillings is too much for one request. If a part
        // fails, uploading the file again carries on from where it stopped.
        for (let i = 0; i < fresh.length; i += 500) {
            const { error } = await supabase.from('keil_fuel_filling').insert(fresh.slice(i, i + 500));
            if (error) throw error;
        }
        return { inserted: fresh.length, skipped: cleanRecords.length - fresh.length };
    }

    static async update(id: string, data: any) {
        const cleanData = FuelFillingModel.sanitize(data);
        const { data: result, error } = await supabase
            .from('keil_fuel_filling')
            .update(cleanData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    static async delete(id: string) {
        const { error } = await supabase
            .from('keil_fuel_filling')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
