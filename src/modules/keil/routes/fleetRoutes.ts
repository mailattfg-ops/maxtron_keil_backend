import { Router } from 'express';
import * as FleetController from '../controllers/fleetController';
import { FuelFillingController } from '../controllers/fuelFillingController';
import { adminOnly } from '../../../middleware/authMiddleware';

const router = Router();

// Vehicle Registry
router.get('/vehicles', FleetController.getVehicles);
router.post('/vehicles', FleetController.createVehicle);
router.put('/vehicles/:id', FleetController.updateVehicle);
router.delete('/vehicles/:id', FleetController.deleteVehicle);

// Travel & Fuel Logs
router.get('/logs', FleetController.getVehicleLogs);
router.post('/logs', FleetController.createVehicleLog);
router.put('/logs/:id', FleetController.updateVehicleLog);
router.delete('/logs/:id', FleetController.deleteVehicleLog);

// Repair & Workshop Logs
router.get('/repairs', FleetController.getVehicleRepairs);
router.post('/repairs', FleetController.createVehicleRepair);
router.put('/repairs/:id', FleetController.updateVehicleRepair);
router.delete('/repairs/:id', FleetController.deleteVehicleRepair);

// Intelligence & Analytics
router.get('/intelligence', FleetController.getFleetIntelligence);

// Fuel Filling Records
router.get('/fuel-fillings', FuelFillingController.getAll);
router.post('/fuel-fillings', FuelFillingController.create);
router.post('/fuel-fillings/bulk', FuelFillingController.bulkCreate);
router.put('/fuel-fillings/:id', FuelFillingController.update);
router.delete('/fuel-fillings/:id', adminOnly, FuelFillingController.delete);

export default router;
