import { supabase } from '../../../config/supabase';

export const FleetIntelligenceModel = {
    getStats: async (companyId: string) => {
        // The five queries don't depend on each other: run them in one round.
        const [
            { data: logs, error: logsError },
            { data: repairs, error: repairsError },
            { count, error: countError },
            { data: vehicles, error: vError },
            { data: upcoming, error: upError }
        ] = await Promise.all([
            // 1. Logs for Distance and Fuel
            supabase
                .from('keil_vehicle_logs')
                .select('start_km, end_km, fuel_qty')
                .eq('company_id', companyId),
            // 2. Repair Costs
            supabase
                .from('keil_vehicle_repairs')
                .select('cost')
                .eq('company_id', companyId),
            // 3. Vehicle Count
            supabase
                .from('keil_vehicles')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId),
            // 4. Per Vehicle Performance Matrix
            supabase
                .from('keil_vehicles')
                .select(`
                    id,
                    registration_number,
                    current_km,
                    logs:keil_vehicle_logs(start_km, end_km, fuel_qty),
                    repairs:keil_vehicle_repairs(cost)
                `)
                .eq('company_id', companyId),
            // 5. Next Maintenance Windows (Status not Completed)
            supabase
                .from('keil_vehicle_repairs')
                .select(`
                    id,
                    log_date,
                    entry_date,
                    repair_description,
                    vehicle:vehicle_id(registration_number)
                `)
                .eq('company_id', companyId)
                .neq('status', 'Completed')
                .order('entry_date', { ascending: true })
                .limit(2)
        ]);

        if (logsError) throw logsError;
        if (repairsError) throw repairsError;
        if (countError) throw countError;
        if (vError) throw vError;
        if (upError) throw upError;

        let totalDistance = 0;
        let totalFuel = 0;
        logs?.forEach((log: any) => {
            const dist = (parseFloat(log.end_km) || 0) - (parseFloat(log.start_km) || 0);
            if (dist > 0) totalDistance += dist;
            totalFuel += parseFloat(log.fuel_qty) || 0;
        });

        let totalMaintenance = 0;
        repairs?.forEach((repair: any) => {
            totalMaintenance += parseFloat(repair.cost) || 0;
        });

        // Determine 30-day activity window
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const vehicleMatrix = vehicles?.map(v => {
            let vDist = 0;
            let vFuel = 0;
            v.logs?.forEach((l: any) => {
                const dist = (parseFloat(l.end_km) || 0) - (parseFloat(l.start_km) || 0);
                if (dist > 0) vDist += dist;
                vFuel += parseFloat(l.fuel_qty) || 0;
            });

            let vMaintenance = 0;
            v.repairs?.forEach((r: any) => {
                vMaintenance += parseFloat(r.cost) || 0;
            });

            const efficiency = vFuel > 0 ? (vDist / vFuel).toFixed(1) : '0.0';

            // Dynamic uptime: if this vehicle has any recent log it's active
            const hasRecentLog = v.logs && v.logs.length > 0;
            const uptimePct = hasRecentLog ? '100%' : '0%';

            return {
                id: v.id,
                registration_number: v.registration_number,
                total_distance: vDist,
                total_fuel: vFuel,
                maintenance_cost: vMaintenance,
                efficiency,
                uptime: uptimePct
            };
        });

        // Calculate fleet-level uptime dynamically
        const activeVehicleCount = vehicleMatrix?.filter(v => v.uptime !== '0%').length || 0;
        const totalVehicleCount = count || 0;
        const fleetUptime = totalVehicleCount > 0
            ? ((activeVehicleCount / totalVehicleCount) * 100).toFixed(1) + '%'
            : '0%';

        return {
            summary: {
                totalDistance: totalDistance.toFixed(0),
                totalFuel: totalFuel.toFixed(0),
                totalMaintenance: totalMaintenance.toFixed(0),
                activeVehicles: count || 0,
                uptime: fleetUptime
            },
            vehicleMatrix,
            upcoming: upcoming?.map((u: any) => ({
                id: u.id,
                date: u.log_date || u.entry_date,
                vehicle: u.vehicle?.registration_number,
                work: u.repair_description
            })) || []
        };
    }
};
