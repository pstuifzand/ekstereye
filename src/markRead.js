// Marking an entry read is a POST per entry in the original code, fired from a scroll
// handler that ran on every scroll event. Batch it: collect the uids per channel, send
// one request every couple of seconds, and make sure the last batch leaves the browser
// even when the user closes the tab right after scrolling.
const FLUSH_DELAY = 2000
const MAX_BATCH = 50

const queues = new Map()
const failedOnce = new Map()

let sender = null
let timer = null

export function setMarkReadSender(fn) {
  sender = fn
}

function queueFor(channel) {
  if (!queues.has(channel)) {
    queues.set(channel, new Set())
  }
  return queues.get(channel)
}

function schedule() {
  if (timer !== null) {
    return
  }
  timer = setTimeout(() => {
    timer = null
    flushMarkRead()
  }, FLUSH_DELAY)
}

export function enqueueMarkRead(channel, uid) {
  if (!channel || !uid) {
    return
  }
  queueFor(channel).add(uid)
  schedule()
}

function takeBatches() {
  const batches = []
  queues.forEach((uids, channel) => {
    // Drain the queue, not just the first batch: marking a long list read at once used
    // to leave everything past the fiftieth uid waiting for a later enqueue.
    while (uids.size > 0) {
      const batch = Array.from(uids).slice(0, MAX_BATCH)
      batch.forEach(uid => uids.delete(uid))
      batches.push({channel, uids: batch})
    }
  })
  queues.forEach((uids, channel) => {
    if (uids.size === 0) {
      queues.delete(channel)
    }
  })
  return batches
}

/**
 * Send what is queued now.
 *
 * @param {{keepalive?: boolean}} [options] keepalive lets the request outlive the page
 * @returns {Promise<void>}
 */
export function flushMarkRead(options = {}) {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  const keepalive = Boolean(options.keepalive)
  const batches = takeBatches()
  if (batches.length === 0 || sender === null) {
    return Promise.resolve()
  }
  return Promise.all(batches.map(({channel, uids}) => Promise.resolve()
    .then(() => sender(channel, uids, {keepalive}))
    .catch(error => {
      // One retry, then let it go: a permanently failing endpoint must not spin.
      if (failedOnce.has(channel)) {
        failedOnce.delete(channel)
        // eslint-disable-next-line
        console.warn('mark read failed, dropping', channel, error)
        return
      }
      failedOnce.set(channel, true)
      uids.forEach(uid => queueFor(channel).add(uid))
      schedule()
    })))
}

if (typeof window !== 'undefined') {
  const flushOnHide = () => {
    flushMarkRead({keepalive: true})
  }
  window.addEventListener('pagehide', flushOnHide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushOnHide()
    }
  })
}

export default { setMarkReadSender, enqueueMarkRead, flushMarkRead }
