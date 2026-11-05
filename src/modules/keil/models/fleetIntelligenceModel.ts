import { supabase } from '../../../config/supabase';

export const FleetIntelligenceModel = {
    getStats: async (companyId: string) => {
        // The two queries don't depend on each other: run them in one round.
        const [
            { data: vehicles, error: vError },
            { data: upcoming, error: upError }
        ] = await Promise.all([
            // 1. Per Vehicle Performance Matrix; the fleet totals are added up from this
            supabase
                .from('keil_vehicles')
                .select(`
                    id,
                    registration_number,
                    logs:keil_vehicle_logs(start_km, end_km, fuel_qty),
                    repairs:keil_vehicle_repairs(cost)
                `)
                .eq('company_id', companyId),
            // 2. Next Maintenance Windows (Status not Completed)
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

        if (vError) throw vError;
        if (upError) throw upError;

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

        const sum = (key: 'total_distance' | 'total_fuel' | 'maintenance_cost') =>
            (vehicleMatrix || []).reduce((total, v) => total + v[key], 0);

        // Calculate fleet-level uptime dynamically
        const activeVehicleCount = vehicleMatrix?.filter(v => v.uptime !== '0%').length || 0;
        const totalVehicleCount = vehicles?.length || 0;
        const fleetUptime = totalVehicleCount > 0
            ? ((activeVehicleCount / totalVehicleCount) * 100).toFixed(1) + '%'
            : '0%';

        return {
            summary: {
                totalDistance: sum('total_distance').toFixed(0),
                totalFuel: sum('total_fuel').toFixed(0),
                totalMaintenance: sum('maintenance_cost').toFixed(0),
                activeVehicles: totalVehicleCount,
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
