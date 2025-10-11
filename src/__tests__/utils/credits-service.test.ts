'use strict'

import '../../test-helpers/mockTimezone'
import mongoose from 'mongoose'

jest.mock('../../models/StudentAttendance', () => ({
    StudentAttendance: { aggregate: jest.fn() },
}))
jest.mock('../../models/RecoveryClass', () => ({
    RecoveryClass: { countDocuments: jest.fn() },
}))
jest.mock('../../models/User', () => ({
    User: { findById: jest.fn() },
}))

import { StudentAttendance } from '../../models/StudentAttendance'
import { RecoveryClass } from '../../models/RecoveryClass'
import { User } from '../../models/User'
import {
    getMaxPendingForPlan,
    getAbsenceAndBookingSnapshot,
    getAvailableCreditsForStudent,
} from '../../utils/credits-service'

describe('credits-service', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('getMaxPendingForPlan', () => {
        expect(getMaxPendingForPlan('Basic' as any)).toBe(2)
        expect(getMaxPendingForPlan('Optimum' as any)).toBe(4)
        expect(getMaxPendingForPlan('Plus' as any)).toBe(6)
        expect(getMaxPendingForPlan('Advanced' as any)).toBe(8)
        expect(getMaxPendingForPlan(undefined)).toBe(4)
    })

    test('getAbsenceAndBookingSnapshot aplica min(absences + adjBooked, booked)', async () => {
        // absencesCount = 3
        ;(StudentAttendance.aggregate as any).mockResolvedValueOnce([{ count: 3 }])
        // bookedCount = 2
        ;(RecoveryClass.countDocuments as any).mockResolvedValueOnce(2)
        // adjustmentBookedCount = 2
        ;(RecoveryClass.countDocuments as any).mockResolvedValueOnce(2)

        const snap = await getAbsenceAndBookingSnapshot(new mongoose.Types.ObjectId().toString())
        // consumed = min(3 + 2, 2) = 2
        expect(snap.consumedAbsences).toBe(2)
        // pending = max(0, 3 - 2) = 1
        expect(snap.pendingAbsences).toBe(1)
        expect(snap.absencesCount).toBe(3)
        expect(snap.bookedCount).toBe(2)
    })

    test('getAvailableCreditsForStudent activo (no trial) aplica tope por plan y suma ajustes restantes', async () => {
        const userId = new mongoose.Types.ObjectId().toString()
;(User.findById as any).mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                _id: userId,
                enrollmentPlan: 'Optimum',
                status: 'active',
                isTrial: false,
                recoveryCreditsAdjustment: 2,
                usedRecoveryAdjustmentCredits: 1,
                toObject: function () {
                    return this
                },
            }),
        })

        // absencesCount = 5 -> creditsFromAbsences c/ tope Optimum(4)
        ;(StudentAttendance.aggregate as any).mockResolvedValueOnce([{ count: 5 }])
        // bookedCount = 1
        ;(RecoveryClass.countDocuments as any).mockResolvedValueOnce(1)
        // adjustmentBookedCount = 0
        ;(RecoveryClass.countDocuments as any).mockResolvedValueOnce(0)

        const res = await getAvailableCreditsForStudent(userId)
        expect(res.creditsFromAbsences).toBeLessThanOrEqual(4)
        expect(res.adjustment).toBe(2) // restantes
        expect(res.adjustmentUsed).toBe(1)
        expect(res.totalCredits).toBe(res.creditsFromAbsences + 2)
    })

    test('getAvailableCreditsForStudent frozen (trial o inactivo) sólo usa ajustes', async () => {
        const userId = new mongoose.Types.ObjectId().toString()
;(User.findById as any).mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                _id: userId,
                enrollmentPlan: 'Basic',
                status: 'inactive',
                isTrial: false,
                recoveryCreditsAdjustment: 1,
                usedRecoveryAdjustmentCredits: 0,
                toObject: function () {
                    return this
                },
            }),
        })

        const res = await getAvailableCreditsForStudent(userId)
        expect(res.creditsFromAbsences).toBe(0)
        expect(res.totalCredits).toBe(1)
        expect(res.isFrozen).toBe(true)
    })
})


