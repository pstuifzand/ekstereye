// A followed feed often delivers nothing but "this person liked that URL". Rendering
// that as an empty card tells the reader nothing, so every surface that shows an entry
// needs the same verb, glyph and readable target — and none of them may throw on the
// odd shapes feeds send (`like-of` as a string, an array, or missing refs entirely).

const KINDS = [
  { key: 'like-of', kind: 'like', verb: 'Liked', glyph: '\u2665' },
  { key: 'repost-of', kind: 'repost', verb: 'Reposted', glyph: '\u27f3' },
  { key: 'bookmark-of', kind: 'bookmark', verb: 'Bookmarked', glyph: '\u2605' }
]

// mf2 allows a single value or an array; the first value is the one that is linked.
function first(value) {
  if (Array.isArray(value)) {
    return value.length ? first(value[0]) : ''
  }
  if (value && typeof value === 'object') {
    return value.url || ''
  }
  return typeof value === 'string' ? value : ''
}

export function refEntry(item) {
  if (!item) {
    return null
  }
  return KINDS.find((entry) => Boolean(first(item[entry.key]))) || null
}

export function refKind(item) {
  const entry = refEntry(item)
  return entry ? entry.kind : ''
}

export function refVerb(item) {
  const entry = refEntry(item)
  return entry ? entry.verb : ''
}

export function refGlyph(item) {
  const entry = refEntry(item)
  return entry ? entry.glyph : ''
}

export function refTarget(item) {
  const entry = refEntry(item)
  return entry ? first(item[entry.key]) : ''
}

// What to call the thing that was liked or bookmarked. A host and path is far more
// readable than a full URL, and the scheme adds nothing when every URL has one.
export function prettyTarget(url) {
  if (!url) {
    return ''
  }
  let parsed
  try {
    parsed = new URL(url)
  } catch (error) {
    return url
  }
  let path = parsed.pathname
  try {
    path = decodeURIComponent(path)
  } catch (error) {
    // A malformed escape is still worth showing exactly as the feed sent it.
  }
  const haystack = (parsed.hostname.replace(/^www\./, '') + path).replace(/\/+$/, '')
  return haystack + (parsed.search || '')
}

// The referenced entry's own title is the best label; failing that, its author's name
// says more than a URL; failing that, the URL is all there is.
export function refLabel(item, ref) {
  const target = refTarget(item) || (ref && ref.url) || ''
  if (ref && ref.name) {
    return ref.name
  }
  const author = ref && ref.author
  if (author && author.name) {
    return author.name + "'s post"
  }
  if (ref && ref.content) {
    const content = Array.isArray(ref.content) ? ref.content[0] : ref.content
    const text = typeof content === 'string' ? content : content && content.text
    if (text) {
      const flat = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      if (flat) {
        return flat.length > 80 ? flat.slice(0, 77) + '\u2026' : flat
      }
    }
  }
  return prettyTarget(target)
}

export function refSummary(item, ref) {
  if (!refEntry(item)) {
    return ''
  }
  return refVerb(item) + ' ' + (refLabel(item, ref) || 'a post')
}

export default { refEntry, refKind, refVerb, refGlyph, refTarget, refLabel, refSummary, prettyTarget }
