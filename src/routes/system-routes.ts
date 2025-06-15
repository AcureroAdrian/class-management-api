import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forSuperUser } from '../middleware/role-middleware'
import { resetAttendanceSystem } from '../controllers/system'

const router = Router()

router.route('/reset-attendance-system').post(protect, forSuperUser, resetAttendanceSystem)

export default router 