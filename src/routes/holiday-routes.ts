import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin } from '../middleware/role-middleware'
import { deleteHolidayById, registerHolidayByDate } from '../controllers/holiday'

const router = Router()

router.route('/').post(protect, forUserAdmin, registerHolidayByDate)
router.route('/:id').delete(protect, forUserAdmin, deleteHolidayById)

export default router
