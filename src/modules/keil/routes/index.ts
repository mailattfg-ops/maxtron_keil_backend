import { Router } from 'express';
import employeeRoutes from '../../common/routes/employeeRoutes';
import companyRoutes from '../../common/routes/companyRoutes';
import attendanceRoutes from '../../common/routes/attendanceRoutes';
import marketingVisitRoutes from '../../common/routes/marketingVisitRoutes';
import payrollRoutes from '../../common/routes/payrollRoutes';

import userTypeRoutes from '../../common/routes/userTypeRoutes';
import permissionRoutes from '../../common/routes/permissionRoutes';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../common/controllers/categoryController';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../common/controllers/departmentController';
import rmTypeCodeRoutes from '../../common/routes/rmTypeCodeRoutes';
import announcementRoutes from '../../common/routes/announcementRoutes';
import customerRoutes from '../../common/routes/customerRoutes';
import supplierRoutes from '../../common/routes/supplierRoutes';

import operationRoutes from './operationRoutes';
import fleetRoutes from './fleetRoutes';
import expenseRoutes from './expenseRoutes';
import financeRoutes from '../../common/routes/financeRoutes';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.use((req, res, next) => {
    // Enforce multi-tenancy for Keil
    req.query.company_name = 'Keil';
    console.log(`[KEIL ROUTER] ${req.method} ${req.url}`);
    next();
});

// Modular routing for KEIL Operations & Fleet
router.use('/operations', operationRoutes);
router.use('/fleet', fleetRoutes);
router.use('/hr-payroll/expenses', expenseRoutes);
router.use('/finance', financeRoutes);

router.get('/fleet-test', (req, res) => {
    res.json({ success: true, message: 'Fleet sub-router base is reachable' });
});

router.get('/dashboard', (req, res) => {
    res.json({ success: true, message: 'KEIL Module API is active.' });
});

// Reuse HR logic (Multi-tenant handled by company_id in payload/query)
router.use('/employees', employeeRoutes);
router.use('/companies', companyRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marketing-visits', marketingVisitRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/user-types', userTypeRoutes);
router.use('/permissions', permissionRoutes);
router.use('/payroll', payrollRoutes);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);
router.use('/rm-type-codes', rmTypeCodeRoutes);
router.use('/announcements', announcementRoutes);

export default router;
