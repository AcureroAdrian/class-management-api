import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin } from '../middleware/role-middleware'
import {
	deleteStudentUserById,
	getStudentUserById,
	getStudentUsers,
	registerStudentUsers,
	updateStudentuserById,
} from '../controllers/user'

const router = Router()

router.route('/').get(protect, forUserAdmin, getStudentUsers).post(protect, forUserAdmin, registerStudentUsers)
router
	.route('/:id')
	.get(protect, forUserAdmin, getStudentUserById)
	.patch(protect, forUserAdmin, updateStudentuserById)
	.delete(protect, forUserAdmin, deleteStudentUserById)

export default router
