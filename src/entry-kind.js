// A reader that mixes essays, photo posts and check-ins needs the entry to say what it
// is before it can be laid out, filtered or counted.
export function bodyText(item) {
  if (!item || !item.content) {
    return ''
  }
  const content = item.content
  if (typeof content === 'string') {
    return content
  }
  if (content.text) {
    return content.text
  }
  return content.html ? content.html.replace(/<[^>]*>/g, ' ') : ''
}

export function hasImages(item) {
  if (!item) {
    return false
  }
  if (item.photo && item.photo.length) {
    return true
  }
  return Boolean(item.content && item.content.html && /<img\b/i.test(item.content.html))
}

export function entryKind(item) {
  if (!item) {
    return 'status'
  }
  const length = bodyText(item).trim().length
  if (item.name || length > 480) {
    return 'article'
  }
  if (hasImages(item)) {
    return 'media'
  }
  return 'status'
}

export const KIND_LABELS = {
  article: 'Articles',
  status: 'Notes',
  media: 'Photos'
}

export const KIND_ORDER = ['article', 'status', 'media']

export default { entryKind, bodyText, hasImages, KIND_LABELS, KIND_ORDER }
