import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin, forUserStudent } from '../middleware/role-middleware'
import {
	deleteKarateClassById,
	getKarateClassById,
	getKarateClasses,
	getKarateClassesByStudentId,
	getKarateClassesForStudent,
	getkarateClassToAdminAttendance,
	registerKarateClass,
	updateKarateClassById,
} from '../controllers/karate-class'

const router = Router()

router.route('/').get(protect, forUserAdmin, getKarateClasses).post(protect, forUserAdmin, registerKarateClass)
router.route('/student').get(protect, forUserStudent, getKarateClassesForStudent)
router.route('/student/:id').get(protect, forUserStudent, getKarateClassesByStudentId)
router.route('/admin/attendance').get(protect, forUserAdmin, getkarateClassToAdminAttendance)
router
	.route('/:id')
	.get(protect, getKarateClassById)
	.patch(protect, forUserAdmin, updateKarateClassById)
	.delete(protect, forUserAdmin, deleteKarateClassById)

export default router
