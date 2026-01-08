'use strict'

jest.mock('../../repositories/user-repository')
jest.mock('../../repositories/karate-class-repository')
jest.mock('../../repositories/recovery-class-repository')
jest.mock('../../repositories/student-attendance-repository', () => ({
    syncRecoveryWithRealAttendance: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../utils/credits-service', () => ({
    getAvailableCreditsForStudent: jest.fn().mockResolvedValue({ totalCredits: 1, isFrozen: false }),
}))

import '../../test-helpers/mockTimezone'
import { bookingRecoveryClassById } from '../../controllers/karate-class/booking-recovery-class-by-id-controller'
import * as userRepository from '../../repositories/user-repository'
import * as karateClassRepository from '../../repositories/karate-class-repository'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as studentAttendanceRepository from '../../repositories/student-attendance-repository'
import { mockReqRes } from '../../test-helpers/mockReqRes'

describe('booking-recovery-class controller', () => {
    beforeEach(() => jest.clearAllMocks())

    test('consume ajuste primero: marca usedAdjustment y actualiza counters usuario', async () => {
        const studentId = '507f1f77bcf86cd799439012'
        const classId = '507f1f77bcf86cd799439011'
        ;(userRepository.findUserById as any).mockResolvedValue({
            _id: studentId,
            recoveryCreditsAdjustment: 1,
            usedRecoveryAdjustmentCredits: 0,
        })
        ;(karateClassRepository.findKarateClassById as any).mockResolvedValue({ _id: classId, location: 'spring', students: [], recoveryClasses: [], startTime: { hour: 10, minute: 0 }, weekDays: ['monday'] })
        ;(karateClassRepository.findClassesInTimeRangeAndLocation as any).mockResolvedValue([{ _id: classId, students: 0, recoveryClasses: 0 }])
        ;(recoveryClassRepository.createRecoveryClass as any).mockResolvedValue({ _id: 'rc1', usedAdjustment: true })
        ;(karateClassRepository.saveKarateClass as any).mockResolvedValue({})
        ;(userRepository.saveUser as any).mockResolvedValue({})

        const { req, res, next } = mockReqRes(
            { studentId, attendanceId: undefined, date: { year: 2025, month: 9, day: 6, hour: 10, minute: 0 } },
            { id: classId },
        )

        await bookingRecoveryClassById(req as any, res as any, next as any)

        expect(recoveryClassRepository.createRecoveryClass).toHaveBeenCalledWith(
            expect.objectContaining({ usedAdjustment: true })
        )
        // userRepository.saveUser debe haberse llamado para incrementar used (recoveryCreditsAdjustment no se decrementa aquí)
        expect(userRepository.saveUser).toHaveBeenCalledWith(
            expect.objectContaining({ usedRecoveryAdjustmentCredits: 1, recoveryCreditsAdjustment: 1 })
        )
        expect(res.status).toHaveBeenCalledWith(200)
    })
})


