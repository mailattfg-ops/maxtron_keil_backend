import { Router } from 'express';
import * as OperationController from '../controllers/operationController';

const router = Router();

// Branch Registry
router.get('/branches', OperationController.getBranches);
router.get('/branches/:id', OperationController.getBranch);
router.post('/branches', OperationController.createBranch);
router.put('/branches/:id', OperationController.updateBranch);
router.delete('/branches/:id', OperationController.deleteBranch);

// HCE Registry
router.get('/hces', OperationController.getHces);
router.get('/hces/:id', OperationController.getHce);
router.post('/hces', OperationController.createHce);
router.put('/hces/:id', OperationController.updateHce);
router.delete('/hces/:id', OperationController.deleteHce);

// Route Registry
router.get('/routes', OperationController.getRoutes);
router.get('/routes/:id', OperationController.getRoute);
router.post('/routes', OperationController.createRoute);
router.put('/routes/:id', OperationController.updateRoute);
router.delete('/routes/:id', OperationController.deleteRoute);

// Route Assignments (Mappings)
router.get('/assignments', OperationController.getAssignments);
router.post('/assignments', OperationController.createAssignment);
router.put('/assignments/:id', OperationController.updateAssignment);
router.delete('/assignments/:id', OperationController.deleteAssignment);

// Collection Batches (Header + Entries)
router.get('/collections', OperationController.getCollectionHeaders);
router.get('/collections/:id', OperationController.getCollectionBatch);
router.post('/collections', OperationController.createCollectionBatch);
router.delete('/collections/:id', OperationController.deleteCollectionBatch);

// HCE Ledger
router.get('/ledger/:id', OperationController.getHceLedger);

export default router;
