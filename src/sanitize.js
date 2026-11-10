import DOMPurify from 'dompurify'

// Feed content is hostile by default: it arrives from any site the user follows and is
// rendered inside an origin that holds the IndieAuth access token in localStorage.
// Everything that can execute, embed, or exfiltrate is removed here.
const FORBIDDEN_TAGS = [
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'form', 'input', 'button', 'textarea', 'select', 'option',
  'svg', 'math', 'link', 'meta', 'base', 'template',
]

const FORBIDDEN_ATTR = [
  'style', 'srcdoc', 'formaction', 'ping', 'onerror', 'onload',
]

const SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:']

function parseUrl(value, base) {
  try {
    return new URL(value, base)
  } catch (e) {
    return null
  }
}

function isSafeLink(value, base) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false
  }
  const url = parseUrl(value, base)
  return url !== null && SAFE_LINK_PROTOCOLS.includes(url.protocol)
}

function isSafeImage(value, base) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false
  }
  if (/^data:image\//i.test(value.trim())) {
    return true
  }
  const url = parseUrl(value, base)
  return url !== null && (url.protocol === 'http:' || url.protocol === 'https:')
}

/**
 * Sanitize feed HTML for insertion into the page.
 *
 * @param {string} html
 * @param {string} [base] absolute URL the relative links and images are resolved against
 * @returns {string} HTML that is safe to hand to v-html
 */
export function sanitizeHtml(html, base) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  const clean = DOMPurify.sanitize(html, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  })

  const template = document.createElement('template')
  template.innerHTML = clean
  const fragment = template.content

  fragment.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href')
    if (!isSafeLink(href, base)) {
      link.removeAttribute('href')
      link.removeAttribute('target')
      return
    }
    if (base && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) {
      const resolved = parseUrl(href, base)
      if (resolved !== null) {
        link.setAttribute('href', resolved.toString())
      }
    }
    link.setAttribute('rel', 'nofollow noopener noreferrer')
    link.setAttribute('target', '_blank')
  })

  fragment.querySelectorAll('img').forEach(image => {
    const src = image.getAttribute('src')
    if (!isSafeImage(src, base)) {
      image.remove()
      return
    }
    if (base && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
      const resolved = parseUrl(src, base)
      if (resolved !== null) {
        image.setAttribute('src', resolved.toString())
      }
    }
    image.setAttribute('loading', 'lazy')
    image.setAttribute('decoding', 'async')
    // Keep plain pixel dimensions: they are the only intrinsic-size hint a remote image
    // gives the browser, and stripping them makes the text under it jump when the image
    // arrives. Anything that is not a small integer goes.
    const isDimension = (value) => {
      if (typeof value !== 'string' || !/^\d{1,5}$/.test(value.trim())) {
        return false
      }
      const size = Number(value)
      return size > 0 && size <= 20000
    }
    if (!isDimension(image.getAttribute('width')) || !isDimension(image.getAttribute('height'))) {
      image.removeAttribute('width')
      image.removeAttribute('height')
    }
    if (!image.hasAttribute('alt')) {
      image.setAttribute('alt', '')
    }
  })

  return template.innerHTML
}

export default { sanitizeHtml }
