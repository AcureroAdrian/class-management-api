import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin } from '../middleware/role-middleware'
import {
	deleteKarateClassById,
	getKarateClassById,
	getKarateClasses,
	registerKarateClass,
	updateKarateClassById,
} from '../controllers/karate-class'

const router = Router()

router.route('/').get(protect, forUserAdmin, getKarateClasses).post(protect, forUserAdmin, registerKarateClass)
router
	.route('/:id')
	.get(protect, getKarateClassById)
	.patch(protect, forUserAdmin, updateKarateClassById)
	.delete(protect, forUserAdmin, deleteKarateClassById)

export default router
