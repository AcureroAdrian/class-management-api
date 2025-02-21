import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin } from '../middleware/role-middleware'
import {
	getClassReportByClassIdForAdmin,
	getDailyReportForAdmin,
	getStudentAttendancesByDay,
	getStudentReportForAdmin,
	registerStudentAttendance,
	updateStudentAttendanceById,
} from '../controllers/student-attendance'

const router = Router()

router
	.route('/')
	.get(protect, forUserAdmin, getStudentAttendancesByDay)
	.post(protect, forUserAdmin, registerStudentAttendance)
router.route('/daily-report-admin').get(protect, forUserAdmin, getDailyReportForAdmin)
router.route('/class-report-admin/:id').get(protect, forUserAdmin, getClassReportByClassIdForAdmin)
router.route('/student-report-admin/:id').get(protect, forUserAdmin, getStudentReportForAdmin)
router.route('/:id').patch(protect, forUserAdmin, updateStudentAttendanceById)

export default router
