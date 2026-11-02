import { Router } from 'express';
import { protect } from '../../../middleware/authMiddleware';
import {
    getExpenseHeads,
    createExpenseHead,
    updateExpenseHead,
    deleteExpenseHead,
    getExpenditures,
    createExpenditure,
    updateExpenditure,
    deleteExpenditure
} from '../controllers/expenseController';

const router = Router();

router.use(protect);

// Expense Heads / Taxonomy
router.route('/heads')
    .get(getExpenseHeads)
    .post(createExpenseHead);

router.route('/heads/:id')
    .put(updateExpenseHead)
    .delete(deleteExpenseHead);

// Expenditures / Records
router.route('/records')
    .get(getExpenditures)
    .post(createExpenditure);

router.route('/records/:id')
    .put(updateExpenditure)
    .delete(deleteExpenditure);

export default router;
