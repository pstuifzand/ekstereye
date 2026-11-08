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
    image.removeAttribute('width')
    image.removeAttribute('height')
  })

  return template.innerHTML
}

export default { sanitizeHtml }
