import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin } from '../middleware/role-middleware'
import {
	cancelScheduledDeletion,
	deleteStudentUserById,
	getStudentUserById,
	getStudentUsers,
	registerStudentUsers,
	registerTrialStudent,
	updateStudentuserById,
	adjustRecoveryCredits,
	getStudentCredits,
} from '../controllers/user'

const router = Router()

router.route('/').get(protect, forUserAdmin, getStudentUsers).post(protect, forUserAdmin, registerStudentUsers)
router.route('/trial-student').post(protect, forUserAdmin, registerTrialStudent)
router
	.route('/:id')
	.get(protect, forUserAdmin, getStudentUserById)
	.patch(protect, forUserAdmin, updateStudentuserById)
	.post(protect, forUserAdmin, deleteStudentUserById)
router.route('/:id/cancel-deletion').patch(protect, forUserAdmin, cancelScheduledDeletion)
router.route('/:id/adjust-credits').post(protect, forUserAdmin, adjustRecoveryCredits)
router.route('/:id/credits').get(protect, getStudentCredits)

export default router
