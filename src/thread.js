// Ekster's thread extension (action=timeline&method=thread) answers with a flat list in
// conversation order. Each item keeps its `in-reply-to`, so the tree is rebuilt here —
// replies to replies stay nested instead of flattening into one unreadable list.

// mf2 allows a string, an array, or a cite object for in-reply-to; the first URL wins.
export function replyTarget(item) {
  let value = item && item['in-reply-to']
  while (Array.isArray(value)) {
    value = value[0]
  }
  if (value && typeof value === 'object') {
    return value.url || ''
  }
  return typeof value === 'string' ? value : ''
}

// Servers and feeds disagree about a trailing slash; the link is the same post.
function normalize(url) {
  return typeof url === 'string' ? url.trim().replace(/\/+$/, '') : ''
}

// Stable key for v-for: fetched ancestors have no _id (the spec forbids it).
export function threadKey(item, index) {
  return (item && (item._id || item.url)) || 'thread-' + index
}

/**
 * Flatten a thread into display rows: [{item, depth, key}] in depth-first order,
 * every reply directly below the post it answers. Never throws on odd input and
 * always returns every item exactly once, even when `in-reply-to` forms a cycle.
 */
export function buildThreadRows(items) {
  const list = Array.isArray(items) ? items.filter(item => item && typeof item === 'object') : []
  const byUrl = new Map()
  list.forEach((item, index) => {
    const url = normalize(item.url)
    if (url && !byUrl.has(url)) {
      byUrl.set(url, index)
    }
  })

  const children = list.map(() => [])
  const roots = []
  list.forEach((item, index) => {
    const parent = byUrl.get(normalize(replyTarget(item)))
    if (parent === undefined || parent === index) {
      roots.push(index)
    } else {
      children[parent].push(index)
    }
  })

  const rows = []
  const seen = new Set()
  const walk = (start, startDepth) => {
    const stack = [[start, startDepth]]
    while (stack.length) {
      const [index, depth] = stack.pop()
      if (seen.has(index)) {
        continue
      }
      seen.add(index)
      rows.push({item: list[index], depth, key: threadKey(list[index], index)})
      // Reverse so the earliest reply is popped, and therefore shown, first.
      for (let i = children[index].length - 1; i >= 0; i--) {
        stack.push([children[index][i], depth + 1])
      }
    }
  }
  roots.forEach(index => walk(index, 0))
  // Posts that only reply to each other have no root; show them rather than lose them.
  list.forEach((item, index) => {
    if (!seen.has(index)) {
      walk(index, 0)
    }
  })
  return rows
}

export default { replyTarget, threadKey, buildThreadRows }
