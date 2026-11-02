import { Request, Response } from 'express';
import { VehicleModel } from '../models/vehicleModel';
import { VehicleLogModel } from '../models/vehicleLogModel';
import { VehicleRepairModel } from '../models/vehicleRepairModel';
import { FleetIntelligenceModel } from '../models/fleetIntelligenceModel';

// Vehicle Registry
export const getVehicles = async (req: Request, res: Response) => {
    try {
        const { company_id } = req.query;
        const data = await VehicleModel.getAll(company_id as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createVehicle = async (req: Request, res: Response) => {
    try {
        const data = await VehicleModel.create(req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateVehicle = async (req: Request, res: Response) => {
    try {
        const data = await VehicleModel.update(req.params.id as string, req.body);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteVehicle = async (req: Request, res: Response) => {
    try {
        await VehicleModel.delete(req.params.id as string);
        res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Travel & Fuel Logs
export const getVehicleLogs = async (req: Request, res: Response) => {
    try {
        const { company_id, vehicle_id, from, to } = req.query;
        const data = await VehicleLogModel.getAll(company_id as string, { 
            vehicle_id: vehicle_id as string, 
            from_date: from as string, 
            to_date: to as string 
        });
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createVehicleLog = async (req: Request, res: Response) => {
    try {
        const data = await VehicleLogModel.create(req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateVehicleLog = async (req: Request, res: Response) => {
    try {
        const data = await VehicleLogModel.update(req.params.id as string, req.body);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteVehicleLog = async (req: Request, res: Response) => {
    try {
        await VehicleLogModel.delete(req.params.id as string);
        res.status(200).json({ success: true, message: 'Log deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Repair Logs
export const getVehicleRepairs = async (req: Request, res: Response) => {
    try {
        const { company_id, vehicle_id, from, to } = req.query;
        const data = await VehicleRepairModel.getAll(company_id as string, {
            vehicle_id: vehicle_id as string,
            from: from as string,
            to: to as string
        });
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createVehicleRepair = async (req: Request, res: Response) => {
    try {
        const data = await VehicleRepairModel.create(req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateVehicleRepair = async (req: Request, res: Response) => {
    try {
        const data = await VehicleRepairModel.update(req.params.id as string, req.body);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteVehicleRepair = async (req: Request, res: Response) => {
    try {
        await VehicleRepairModel.delete(req.params.id as string);
        res.status(200).json({ success: true, message: 'Repair log deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Intelligence & Analytics
export const getFleetIntelligence = async (req: Request, res: Response) => {
    try {
        const { company_id } = req.query;
        if (!company_id) {
            return res.status(400).json({ success: false, message: 'Company ID is required' });
        }
        const data = await FleetIntelligenceModel.getStats(company_id as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
