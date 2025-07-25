import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin, forUserStudent, forAdminOrTeacher } from '../middleware/role-middleware'
import {
	addStudentToAttendance,
	getClassReportByClassIdForAdmin,
	getDailyReportForAdmin,
	getStudentAttendancesByDay,
	getStudentReportForAdmin,
	registerStudentAttendance,
	updateStudentAttendanceById,
	removeStudentFromAttendance,
} from '../controllers/student-attendance'

const router = Router()

router
	.route('/')
	.get(protect, forAdminOrTeacher, getStudentAttendancesByDay)
	.post(protect, forAdminOrTeacher, registerStudentAttendance)
router.route('/add-student-to-attendance').post(protect, forAdminOrTeacher, addStudentToAttendance)
router.route('/daily-report-admin').get(protect, forUserAdmin, getDailyReportForAdmin)
router.route('/class-report-admin/:id').get(protect, forUserAdmin, getClassReportByClassIdForAdmin)
router.route('/student-report-admin/:id').get(protect, forUserStudent, getStudentReportForAdmin)
router.route('/:id').patch(protect, forAdminOrTeacher, updateStudentAttendanceById)
router
	.route('/remove-student-from-attendance')
	.put(protect, forUserAdmin, removeStudentFromAttendance)

export default router
