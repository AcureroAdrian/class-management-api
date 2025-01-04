import { Router } from 'express'

import authRoutes from './auth-routes'
import karateClassRoutes from './karate-class-routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/karate-classes', karateClassRoutes)

export default router
