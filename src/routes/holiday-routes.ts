import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin, forAdminOrTeacher } from '../middleware/role-middleware'
import { deleteHolidayById, registerHolidayByDate, getAllHolidays } from '../controllers/holiday'

const router = Router()

router.route('/').post(protect, forAdminOrTeacher, registerHolidayByDate).get(getAllHolidays)
router.route('/:id').delete(protect, forAdminOrTeacher, deleteHolidayById)

export default router
