import { describe, expect, it } from 'vitest'
import { bodyText, entryKind, hasImages } from '../src/entry-kind'

describe('bodyText', () => {
  it('reads the three shapes content arrives in', () => {
    expect(bodyText({ content: 'plain' })).toBe('plain')
    expect(bodyText({ content: { text: 'from text' } })).toBe('from text')
    expect(bodyText({ content: { html: '<p>from <b>html</b></p>' } }).trim())
      .toBe('from  html')
  })

  it('survives a missing item', () => {
    expect(bodyText(null)).toBe('')
    expect(bodyText({})).toBe('')
  })
})

describe('hasImages', () => {
  it('sees photos and images inside the html', () => {
    expect(hasImages({ photo: ['https://x/a.jpg'] })).toBe(true)
    expect(hasImages({ content: { html: '<p><img src="a.jpg"></p>' } })).toBe(true)
    expect(hasImages({ content: { text: 'no picture' } })).toBe(false)
  })
})

describe('entryKind', () => {
  it('treats a named entry as an article', () => {
    expect(entryKind({ name: 'A title', content: { text: 'short' } })).toBe('article')
  })

  it('treats a long body as an article even without a name', () => {
    expect(entryKind({ content: { text: 'x'.repeat(481) } })).toBe('article')
    expect(entryKind({ content: { text: 'x'.repeat(400) } })).toBe('status')
  })

  it('classifies photo posts as media before length', () => {
    expect(entryKind({ photo: ['https://x/a.jpg'], content: { text: 'short' } })).toBe('media')
  })

  it('falls back to status', () => {
    expect(entryKind({ content: { text: 'a note' } })).toBe('status')
    expect(entryKind(null)).toBe('status')
  })

  it('does not let the html markup itself make an entry long', () => {
    const html = '<p>' + 'x'.repeat(300) + '</p>'
    expect(entryKind({ content: { html } })).toBe('status')
  })
})
