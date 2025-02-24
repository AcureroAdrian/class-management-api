import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserStudent } from '../middleware/role-middleware'
import { deleteRecoveryClassById } from '../controllers/recovery-class'

const router = Router()

router.route('/:id').delete(protect, forUserStudent, deleteRecoveryClassById)

export default router
