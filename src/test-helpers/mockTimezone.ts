'use strict'

jest.mock('../utils/houston-timezone', () => ({
    getCurrentDateInHouston: () => new Date('2025-09-05T12:00:00-05:00'),
    createHoustonDate: (y: number, m: number, d: number) => {
        const dt = new Date(y, m - 1, d)
        dt.setHours(0, 0, 0, 0)
        return dt
    },
    isSameDayInHouston: (a: Date, b: Date) => {
        const aa = new Date(a.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        const bb = new Date(b.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        return aa.getFullYear() === bb.getFullYear() && aa.getMonth() === bb.getMonth() && aa.getDate() === bb.getDate()
    },
    getPreviousDayInHouston: (date?: Date) => {
        const ref = date || new Date('2025-09-05T12:00:00-05:00')
        const prev = new Date(ref)
        prev.setDate(prev.getDate() - 1)
        prev.setHours(0, 0, 0, 0)
        return prev
    },
}))


