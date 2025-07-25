import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin, forUserStudent, forAdminOrStudent, forAdminOrTeacher } from '../middleware/role-middleware'
import {
	bookingRecoveryClassById,
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
router.route('/recovery-class/:id').put(protect, forAdminOrStudent, bookingRecoveryClassById)
router.route('/admin/attendance').get(protect, forAdminOrTeacher, getkarateClassToAdminAttendance)
router
	.route('/:id')
	.get(protect, getKarateClassById)
	.patch(protect, forUserAdmin, updateKarateClassById)
	.delete(protect, forUserAdmin, deleteKarateClassById)

export default router
