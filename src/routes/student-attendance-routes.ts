import { Router } from 'express'
import { protect } from '../middleware/auth-middleware'
import { forUserAdmin } from '../middleware/role-middleware'
import { getStudentAttendancesByDay } from '../controllers/student-attendance'

const router = Router()

router.route('/').get(protect, forUserAdmin, getStudentAttendancesByDay)
// router.route('/admin/attendance').get(protect, forUserAdmin, getkarateClassToAdminAttendance)
// router
// 	.route('/:id')
// 	.get(protect, getKarateClassById)
// 	.patch(protect, forUserAdmin, updateKarateClassById)
// 	.delete(protect, forUserAdmin, deleteKarateClassById)

export default router
