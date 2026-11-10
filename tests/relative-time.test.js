import { beforeEach, describe, expect, it } from 'vitest'
import { absoluteTime, clock, fromNow, stamp } from '../src/relative-time'

// A fixed clock: the modules read clock.now, which is what the app ticks once a minute.
beforeEach(() => {
  clock.now = Date.parse('2026-11-10T12:00:00Z')
})

describe('fromNow', () => {
  it('reads a past date as time ago and a future date as time ahead', () => {
    // dayjs reads a.from(b) as "the time from b to a"; getting it backwards makes every
    // timestamp in the reader wrong in the same direction.
    expect(fromNow('2026-11-01T12:00:00Z')).toBe('9 days ago')
    expect(fromNow('2026-11-20T12:00:00Z')).toBe('in 10 days')
  })

  it('returns nothing for missing or unparseable dates', () => {
    expect(fromNow('')).toBe('')
    expect(fromNow(null)).toBe('')
    expect(fromNow('not a date')).toBe('')
  })
})

describe('stamp', () => {
  it('uses relative time inside a week and a date beyond it', () => {
    expect(stamp('2026-11-08T12:00:00Z')).toBe('2 days ago')
    expect(stamp('2026-01-01T12:00:00+01:00')).toBe('1 Jan 2026')
  })

  it('is empty when there is no date', () => {
    expect(stamp(undefined)).toBe('')
  })
})

describe('absoluteTime', () => {
  it('formats a local timestamp for the title attribute', () => {
    const text = absoluteTime('2026-01-01T12:00:00+01:00')
    expect(text).toContain('January 1, 2026')
    expect(text).toContain('12:00')
    expect(text).not.toContain('LLL')
  })
})
