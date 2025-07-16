import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forSuperUser } from '../middleware/role-middleware'
import { resetAttendanceSystem, keepAlive } from '../controllers/system'

const router = Router()

// Health check endpoint - no requiere autenticación ni API key
router.route('/keep-alive').get(keepAlive)

// Rutas que requieren autenticación
router.route('/reset-attendance-system').post(protect, forSuperUser, resetAttendanceSystem)

export default router 