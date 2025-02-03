import { Router } from 'express'

import authRoutes from './auth-routes'
import karateClassRoutes from './karate-class-routes'
import studentAttendanceRoutes from './student-attendance-routes'
import userRoutes from './user-routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/karate-classes', karateClassRoutes)
router.use('/student-attendances', studentAttendanceRoutes)
router.use('/users', userRoutes)

export default router
