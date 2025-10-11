'use strict'

jest.mock('../../repositories/recovery-class-repository')
jest.mock('../../repositories/user-repository')
jest.mock('../../repositories/student-attendance-repository', () => ({
  syncRecoveryWithRealAttendance: jest.fn().mockResolvedValue(undefined),
}))

import '../../test-helpers/mockTimezone'
import { deleteRecoveryClassById } from '../../controllers/recovery-class/delete-recovery-class-by-id-controller'
import * as recoveryClassRepository from '../../repositories/recovery-class-repository'
import * as userRepository from '../../repositories/user-repository'
import { mockReqRes } from '../../test-helpers/mockReqRes'

describe('delete-recovery-class controller', () => {
  beforeEach(() => jest.clearAllMocks())

  test('reembolsa ajuste cuando usedAdjustment es true', async () => {
    const rcId = '507f1f77bcf86cd799439022'
    const uId = '507f1f77bcf86cd799439012'
    ;(recoveryClassRepository.findRecoveryClassById as any).mockResolvedValue({
      _id: rcId,
      student: { toString: () => uId },
      date: { year: 2025, month: 9, day: 6, hour: 10, minute: 0 },
      status: 'active',
      usedAdjustment: true,
    })
    ;(recoveryClassRepository.saveRecoveryClass as any).mockResolvedValue({})
    ;(userRepository.findUserById as any).mockResolvedValue({
      _id: uId,
      recoveryCreditsAdjustment: 0,
      usedRecoveryAdjustmentCredits: 1,
    })
    ;(userRepository.saveUser as any).mockResolvedValue({})

    const { req, res, next } = mockReqRes({}, { id: rcId }, { force: 'true' })
    await deleteRecoveryClassById(req as any, res as any, next as any)

    expect(userRepository.saveUser).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})


