import { Router } from 'express'

import authRoutes from './auth-routes'
import holidayRoutes from './holiday-routes'
import karateClassRoutes from './karate-class-routes'
import recoveryClassRoutes from './recovery-class-routes'
import studentAttendanceRoutes from './student-attendance-routes'
import userRoutes from './user-routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/holidays', holidayRoutes)
router.use('/karate-classes', karateClassRoutes)
router.use('/recovery-classes', recoveryClassRoutes)
router.use('/student-attendances', studentAttendanceRoutes)
router.use('/users', userRoutes)

export default router
