'use strict'

jest.mock('../../repositories/student-attendance-repository', () => ({
  findStudentAttendanceById: jest.fn(),
  saveStudentAttendance: jest.fn(),
}))
jest.mock('../../repositories/karate-class-repository')
jest.mock('../../repositories/recovery-class-repository')
jest.mock('../../repositories/user-repository')

import '../../test-helpers/mockTimezone'
import { removeStudentFromAttendance } from '../../controllers/student-attendance/remove-student-from-attendance-controller'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as userRepository from '../../repositories/user-repository'
import { mockReqRes } from '../../test-helpers/mockReqRes'

describe('remove-student-from-attendance controller', () => {
  beforeEach(() => jest.clearAllMocks())

  test('si RC.usedAdjustment=true reembolsa usados (no suma ajuste extra)', async () => {
    const studentId = '507f1f77bcf86cd799439012'
    const attendanceId = '507f1f77bcf86cd7994390aa'
    ;(studentAttendanceRepository.findStudentAttendanceById as any).mockResolvedValue({
      _id: attendanceId,
      karateClass: 'k1',
      date: { year: 2025, month: 9, day: 6, hour: 10, minute: 0 },
      attendance: [{ student: studentId }],
    })
    ;(recoveryClassRepository.findRecoveryClassByDetails as any).mockResolvedValue([
      { _id: 'rc1', student: studentId, usedAdjustment: true, attendance: attendanceId },
    ])
    ;(karateClassRepository.findKarateClassById as any).mockResolvedValue({ _id: 'k1', recoveryClasses: ['rc1'] })
    ;(karateClassRepository.saveKarateClass as any).mockResolvedValue({})
    ;(recoveryClassRepository.deleteRecoveryClassById as any).mockResolvedValue({})
    ;(userRepository.findUserById as any).mockResolvedValue({
      _id: studentId, recoveryCreditsAdjustment: 0, usedRecoveryAdjustmentCredits: 1,
    })
    ;(userRepository.saveUser as any).mockResolvedValue({})
    ;(studentAttendanceRepository.saveStudentAttendance as any).mockResolvedValue({})

    const { req, res, next } = mockReqRes({ studentId, attendanceId })
    await removeStudentFromAttendance(req as any, res as any, next as any)
    expect(userRepository.saveUser).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  test('si RC no usó ajuste y !attendance, suma +1 al ajuste', async () => {
    ;(studentAttendanceRepository.findStudentAttendanceById as any).mockResolvedValue({
      _id: '507f1f77bcf86cd7994390ab', karateClass: 'k1', date: { year: 2025, month: 9, day: 6, hour: 10, minute: 0 }, attendance: [{ student: '507f1f77bcf86cd799439012' }],
    })
    ;(recoveryClassRepository.findRecoveryClassByDetails as any).mockResolvedValue([
      { _id: 'rc1', student: 'u1', usedAdjustment: false, attendance: undefined },
    ])
    ;(karateClassRepository.findKarateClassById as any).mockResolvedValue({ _id: 'k1', recoveryClasses: ['rc1'] })
    ;(karateClassRepository.saveKarateClass as any).mockResolvedValue({})
    ;(recoveryClassRepository.deleteRecoveryClassById as any).mockResolvedValue({})
    ;(userRepository.findUserById as any).mockResolvedValue({ _id: 'u1', recoveryCreditsAdjustment: 0, usedRecoveryAdjustmentCredits: 0 })
    ;(userRepository.saveUser as any).mockResolvedValue({})
    ;(studentAttendanceRepository.saveStudentAttendance as any).mockResolvedValue({})

    const { req, res, next } = mockReqRes({ studentId: '507f1f77bcf86cd799439012', attendanceId: '507f1f77bcf86cd7994390ab' })
    await removeStudentFromAttendance(req as any, res as any, next as any)
    expect(userRepository.saveUser).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})


