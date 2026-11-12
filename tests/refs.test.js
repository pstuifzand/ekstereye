import { describe, it, expect } from 'vitest'
import { refEntry, refKind, refVerb, refGlyph, refTarget, refLabel, refSummary, prettyTarget } from '../src/refs'

// The shapes in these tests come from real feeds: a bare URL string, mf2's usual array,
// an object, and the "no refs at all" case where the source is simply a like notification.
const like = {
  'like-of': ['https://p83.nl/2026/11/ek-reader/'],
  author: { name: 'P83 Notifications' },
  _source: { name: 'P83 Notifications' }
}

describe('refs', () => {
  it('recognises each ref kind', () => {
    expect(refKind(like)).toBe('like')
    expect(refKind({ 'repost-of': ['https://a.example/x'] })).toBe('repost')
    expect(refKind({ 'bookmark-of': 'https://a.example/y' })).toBe('bookmark')
    expect(refKind({ type: 'entry', content: { text: 'hello' } })).toBe('')
    expect(refKind(null)).toBe('')
  })

  it('takes the first value whether mf2 sends a string, an array or an object', () => {
    expect(refTarget(like)).toBe('https://p83.nl/2026/11/ek-reader/')
    expect(refTarget({ 'like-of': 'https://a.example/one' })).toBe('https://a.example/one')
    expect(refTarget({ 'like-of': [{ url: 'https://a.example/two' }] })).toBe('https://a.example/two')
    expect(refTarget({})).toBe('')
  })

  it('has a verb and a glyph for each kind', () => {
    expect(refVerb(like)).toBe('Liked')
    expect(refGlyph(like)).toBe('\u2665')
    expect(refVerb({ 'repost-of': ['https://a.example/x'] })).toBe('Reposted')
    expect(refVerb({ 'bookmark-of': ['https://a.example/x'] })).toBe('Bookmarked')
    expect(refVerb({})).toBe('')
  })

  it('renders a URL as host and path without the scheme or a trailing slash', () => {
    expect(prettyTarget('https://p83.nl/2026/11/ek-reader/')).toBe('p83.nl/2026/11/ek-reader')
    expect(prettyTarget('https://www.example.com/a%20b')).toBe('example.com/a b')
    expect(prettyTarget('https://example.com/')).toBe('example.com')
    expect(prettyTarget('https://example.com/search?q=one')).toBe('example.com/search?q=one')
    expect(prettyTarget('not a url')).toBe('not a url')
    expect(prettyTarget('')).toBe('')
  })

  it('labels the target with a title, then the author, then the URL', () => {
    expect(refLabel(like, { name: 'Ek Reader' })).toBe('Ek Reader')
    expect(refLabel(like, { author: { name: 'Peter' } })).toBe("Peter's post")
    expect(refLabel(like, { content: { text: '<p>Some   text</p>' } })).toBe('Some text')
    expect(refLabel(like, null)).toBe('p83.nl/2026/11/ek-reader')
    expect(refLabel(like, undefined)).toBe('p83.nl/2026/11/ek-reader')
  })

  it('summarises the card in one line', () => {
    expect(refSummary(like, null)).toBe('Liked p83.nl/2026/11/ek-reader')
    expect(refSummary(like, { name: 'Ek Reader' })).toBe('Liked Ek Reader')
    expect(refSummary({ 'bookmark-of': ['https://a.example/x'] }, { name: 'A post' })).toBe('Bookmarked A post')
    expect(refSummary({ content: { text: 'x' } }, null)).toBe('')
  })

  it('exposes the matched kind entry', () => {
    expect(refEntry(like).kind).toBe('like')
    expect(refEntry({})).toBeNull()
  })
})
