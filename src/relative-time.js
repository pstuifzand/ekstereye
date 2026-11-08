import Vue from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

// A single tick shared by every relative timestamp in the app, so "3 minutes ago"
// does not freeze until the entry happens to re-render.
export const clock = Vue.observable({ now: Date.now() })

let timer = null

function start() {
  if (timer !== null) {
    return
  }
  timer = setInterval(() => {
    clock.now = Date.now()
  }, 60000)
}

start()

export function fromNow(value) {
  if (!value) {
    return ''
  }
  const moment = dayjs(value)
  if (!moment.isValid()) {
    return ''
  }
  // Reading clock.now inside render tracks it, so the tick invalidates the computed.
  // dayjs reads `a.from(b)` as "the time from b to a", so the value comes first.
  return dayjs(moment).from(dayjs(clock.now))
}

export function absoluteTime(value) {
  const moment = dayjs(value)
  if (!moment.isValid()) {
    return ''
  }
  return moment.format('LLL')
}

export default { clock, fromNow, absoluteTime }
