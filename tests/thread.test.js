import { describe, expect, it } from 'vitest'
import { buildThreadRows, replyTarget } from '../src/thread'

const post = (url, replyTo, extra = {}) => Object.assign({type: 'entry', url}, replyTo ? {'in-reply-to': replyTo} : {}, extra)

describe('replyTarget', () => {
  it('reads a string, an array and a cite object', () => {
    expect(replyTarget({'in-reply-to': 'https://a/'})).toBe('https://a/')
    expect(replyTarget({'in-reply-to': ['https://a/', 'https://b/']})).toBe('https://a/')
    expect(replyTarget({'in-reply-to': [{url: 'https://a/'}]})).toBe('https://a/')
  })

  it('returns an empty string when there is none', () => {
    expect(replyTarget({})).toBe('')
    expect(replyTarget(null)).toBe('')
    expect(replyTarget({'in-reply-to': []})).toBe('')
  })
})

describe('buildThreadRows', () => {
  it('nests replies below the post they answer', () => {
    const rows = buildThreadRows([
      post('https://ann/1'),
      post('https://bob/1', 'https://ann/1'),
      post('https://cat/1', 'https://ann/1'),
      post('https://dan/1', 'https://bob/1')
    ])
    expect(rows.map(r => [r.item.url, r.depth])).toEqual([
      ['https://ann/1', 0],
      ['https://bob/1', 1],
      ['https://dan/1', 2],
      ['https://cat/1', 1]
    ])
  })

  it('treats a trailing slash as the same post', () => {
    const rows = buildThreadRows([post('https://ann/1/'), post('https://bob/1', 'https://ann/1')])
    expect(rows.map(r => r.depth)).toEqual([0, 1])
  })

  it('keeps a reply whose parent is not in the list as a root', () => {
    const rows = buildThreadRows([post('https://bob/1', 'https://gone/1')])
    expect(rows).toHaveLength(1)
    expect(rows[0].depth).toBe(0)
  })

  it('shows every item once even when in-reply-to forms a cycle', () => {
    const rows = buildThreadRows([post('https://a/', 'https://b/'), post('https://b/', 'https://a/')])
    expect(rows).toHaveLength(2)
  })

  it('survives a post replying to itself and junk input', () => {
    expect(buildThreadRows([post('https://a/', 'https://a/')])).toHaveLength(1)
    expect(buildThreadRows(null)).toEqual([])
    expect(buildThreadRows([null, 'x', post('https://a/')])).toHaveLength(1)
  })

  it('keys fetched ancestors, which have no _id, by url', () => {
    const rows = buildThreadRows([post('https://ann/1'), post('https://bob/1', 'https://ann/1', {_id: 'b1'})])
    expect(rows.map(r => r.key)).toEqual(['https://ann/1', 'b1'])
  })
})
