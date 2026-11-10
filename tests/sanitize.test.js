import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../src/sanitize'

const BASE = 'https://example.com/post/1'

describe('sanitizeHtml', () => {
  it('removes scripts, handlers and javascript: links', () => {
    const clean = sanitizeHtml(
      '<p>ok</p><script>window.__xss=1</script>' +
      '<img src="x" onerror="window.__xss=1">' +
      '<a href="javascript:window.__xss=1">bad</a>',
      BASE
    )
    expect(clean).toContain('<p>ok</p>')
    expect(clean).not.toMatch(/script/i)
    expect(clean).not.toMatch(/onerror/i)
    expect(clean).not.toMatch(/javascript:/i)
  })

  it('drops embeds, forms, svg and inline style', () => {
    const clean = sanitizeHtml(
      '<iframe src="https://evil.example"></iframe><form action="/x"></form>' +
      '<svg><circle r="4"/></svg><p style="color:red">text</p>',
      BASE
    )
    expect(clean).not.toMatch(/iframe|form|svg/i)
    expect(clean).not.toMatch(/style=/i)
    expect(clean).toContain('text')
  })

  it('keeps an inline raster image and drops an html data URL', () => {
    const clean = sanitizeHtml(
      '<img src="data:image/png;base64,iVBORw0KGgo=">' +
      '<img src="data:text/html;base64,PHNjcmlwdD4=">',
      BASE
    )
    expect(clean).toContain('data:image/png')
    expect(clean).not.toContain('data:text/html')
  })

  it('resolves relative links and images against the item url and marks links safe', () => {
    const clean = sanitizeHtml('<a href="/a">a</a><img src="pic.png">', BASE)
    expect(clean).toContain('href="https://example.com/a"')
    expect(clean).toContain('rel="nofollow noopener noreferrer"')
    expect(clean).toContain('target="_blank"')
    expect(clean).toContain('src="https://example.com/post/pic.png"')
  })

  it('keeps pixel dimensions but removes anything that is not a small integer', () => {
    const clean = sanitizeHtml(
      '<img src="/a.png" width="800" height="450">' +
      '<img src="/b.png" width="javascript:alert(1)" height="12.5">',
      BASE
    )
    const template = document.createElement('template')
    template.innerHTML = clean
    const images = template.content.querySelectorAll('img')
    expect(images[0].getAttribute('width')).toBe('800')
    expect(images[0].getAttribute('height')).toBe('450')
    expect(images[1].hasAttribute('width')).toBe(false)
    expect(images[1].hasAttribute('height')).toBe(false)
  })

  it('lazily loads images and gives them an empty alt', () => {
    const clean = sanitizeHtml('<img src="/a.png">', BASE)
    expect(clean).toContain('loading="lazy"')
    expect(clean).toContain('decoding="async"')
    expect(clean).toContain('alt=""')
  })

  it('drops a link whose href is not http, https or mailto', () => {
    const clean = sanitizeHtml('<a href="tel:+31612345678">call</a>', BASE)
    expect(clean).not.toContain('href=')
    expect(clean).toContain('call')
  })

  it('returns an empty string for anything that is not markup', () => {
    expect(sanitizeHtml('', BASE)).toBe('')
    expect(sanitizeHtml(null, BASE)).toBe('')
    expect(sanitizeHtml({ html: 'x' }, BASE)).toBe('')
  })
})
