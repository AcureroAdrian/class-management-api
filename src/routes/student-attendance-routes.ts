import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin } from '../middleware/role-middleware'
import {
	getStudentAttendancesByDay,
	registerStudentAttendance,
	updateStudentAttendanceById,
} from '../controllers/student-attendance'

const router = Router()

router
	.route('/')
	.get(protect, forUserAdmin, getStudentAttendancesByDay)
	.post(protect, forUserAdmin, registerStudentAttendance)
router.route('/:id').patch(protect, forUserAdmin, updateStudentAttendanceById)

export default router
