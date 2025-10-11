'use strict'

export function mockReqRes(body: any = {}, params: any = {}, query: any = {}, headers: any = {}) {
    const req: any = { body, params, query, headers, user: {} }
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }
    const next = jest.fn()
    return { req, res, next }
}


