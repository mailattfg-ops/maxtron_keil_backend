import { Request, Response } from 'express';
import { FuelFillingModel } from '../models/fuelFillingModel';

export class FuelFillingController {
    static async getAll(req: Request, res: Response) {
        try {
            const data = await FuelFillingModel.getAll(req.query);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const data = await FuelFillingModel.create(req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async bulkCreate(req: Request, res: Response) {
        try {
            const { records } = req.body;
            if (!Array.isArray(records) || records.length === 0) {
                return res.status(400).json({ success: false, message: 'No records provided for bulk import' });
            }
            const { inserted, skipped } = await FuelFillingModel.bulkCreate(records);
            res.json({ success: true, count: inserted, skipped });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const data = await FuelFillingModel.update(req.params.id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const roleName = (user?.role_name || '').toLowerCase();
            const email = (user?.email || '').toLowerCase();
            const isAdmin = roleName === 'admin' || email === 'admin@maxtron.com' || email === 'admin@keil.com' || email === 'admin';
            if (!isAdmin) {
                return res.status(403).json({ success: false, message: 'Forbidden: Only administrators can delete fuel filling records' });
            }
            await FuelFillingModel.delete(req.params.id);
            res.json({ success: true, message: 'Fuel filling record deleted' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
