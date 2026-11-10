import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/api', () => {
  class ApiError extends Error {
    constructor(message, status) {
      super(message)
      this.status = status
    }
  }
  return {
    request: vi.fn(() => Promise.resolve({})),
    setUnauthorizedHandler: vi.fn(),
    ApiError
  }
})

import { request } from '../src/api'

function item(id, extra = {}) {
  return Object.assign({
    _id: id,
    type: 'entry',
    published: '2026-11-01T10:00:00+01:00',
    url: 'https://example.com/' + id,
    content: { text: 'entry ' + id }
  }, extra)
}

async function freshStore() {
  vi.resetModules()
  window.localStorage.clear()
  const mod = await import('../src/store')
  return mod.default
}

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(() => Promise.resolve({}))
})

describe('timeline mutations', () => {
  it('keeps a uid-only channel when the timeline arrives before the channel list', async () => {
    const store = await freshStore()

    store.commit('newTimeline', {channel: {uid: 'home'}, timeline: {items: [item('a')], paging: {}}})
    expect(store.state.channel).toEqual({uid: 'home'})
    expect(store.state.timeline.items).toHaveLength(1)

    // The channel list lands later and must re-point the timeline's channel object.
    store.commit('newChannels', [{uid: 'home', name: 'Home', unread: 3}])
    expect(store.state.channel.name).toBe('Home')
  })

  it('makes _is_read reactive at ingest', async () => {
    const store = await freshStore()
    store.commit('newTimeline', {
      channel: {uid: 'home'},
      timeline: {items: [item('a'), item('b', {_is_read: true})], paging: {}}
    })

    const [a, b] = store.state.timeline.items
    expect(a._is_read).toBe(false)
    expect(b._is_read).toBe(true)
    expect(Object.prototype.propertyIsEnumerable.call(a, '_is_read')).toBe(true)
  })

  it('appends pages without duplicates and can trim back to the previous page', async () => {
    const store = await freshStore()
    store.commit('newTimeline', {
      channel: {uid: 'home'},
      timeline: {items: [item('a'), item('b')], paging: {after: 'b'}}
    })

    store.commit('appendTimeline', {timeline: {items: [item('b'), item('c')], paging: {}}})
    expect(store.state.timeline.items.map(i => i._id)).toEqual(['a', 'b', 'c'])
    expect(store.state.timelineStack).toHaveLength(1)

    store.commit('previousTimelinePage')
    expect(store.state.timeline.items.map(i => i._id)).toEqual(['a', 'b'])
    expect(store.state.timeline.paging.after).toBe('b')
    expect(store.state.timelineStack).toHaveLength(0)
  })
})

describe('toggleItemUnread', () => {
  it('flips the entry once even when both lists hold the same object', async () => {
    const store = await freshStore()
    const shared = item('new-1')
    store.commit('newTimeline', {channel: {uid: 'home'}, timeline: {items: [shared], paging: {}}})
    store.commit('newGlobalTimeline', {items: [shared]})

    store.commit('toggleItemUnread', shared._id)
    expect(shared._is_read).toBe(true)

    store.commit('toggleItemUnread', shared._id)
    expect(shared._is_read).toBe(false)
  })

  it('leaves the other entries alone', async () => {
    const store = await freshStore()
    store.commit('newTimeline', {
      channel: {uid: 'home'},
      timeline: {items: [item('a'), item('b')], paging: {}}
    })

    store.commit('toggleItemUnread', 'a')

    expect(store.state.timeline.items[0]._is_read).toBe(true)
    expect(store.state.timeline.items[1]._is_read).toBe(false)
  })
})

describe('markRead action', () => {
  it('sends a batched request with one entry per uid', async () => {
    const store = await freshStore()
    window.localStorage.setItem('login_data', JSON.stringify({access_token: 'tok'}))
    store.commit('newAccessToken', {access_token: 'tok'})

    await store.dispatch('markRead', {channel: 'home', entry: ['a', 'b']})

    const [url, options] = request.mock.calls[0]
    expect(url).toContain('action=timeline')
    expect(url).toContain('method=mark_read')
    expect(url).toContain('channel=home')
    expect(url).toContain('entry[]=a')
    expect(url).toContain('entry[]=b')
    expect(options.method).toBe('POST')
    expect(options.token).toBe('tok')
  })

  it('passes keepalive for the flush on page hide', async () => {
    const store = await freshStore()
    await store.dispatch('markRead', {channel: 'home', entry: 'a', keepalive: true})
    expect(request.mock.calls[0][1].keepalive).toBe(true)
  })
})

describe('fetchTimeline failures', () => {
  it('remembers what failed so the banner can retry it', async () => {
    const store = await freshStore()
    const { ApiError } = await import('../src/api')
    request.mockImplementationOnce(() => Promise.reject(new ApiError('The server answered 500.', 500)))

    await store.dispatch('fetchTimeline', {uid: 'home'})

    expect(store.state.error).toBe('The server answered 500.')
    expect(store.state.errorRetry).toEqual({uid: 'home', after: null, append: false})

    request.mockImplementationOnce(() => Promise.resolve({items: [item('a')], paging: {}}))
    await store.dispatch('retryError')

    expect(store.state.error).toBe('')
    expect(store.state.errorRetry).toBe(null)
    expect(store.state.timeline.items).toHaveLength(1)
  })

  it('clears a stale error on the next successful load', async () => {
    const store = await freshStore()
    const { ApiError } = await import('../src/api')
    request.mockImplementationOnce(() => Promise.reject(new ApiError('nope', 500)))
    await store.dispatch('fetchTimeline', {uid: 'home'})
    expect(store.state.error).toBe('nope')

    request.mockImplementationOnce(() => Promise.resolve({items: [], paging: {}}))
    await store.dispatch('fetchTimeline', {uid: 'home'})
    expect(store.state.error).toBe('')
    expect(store.state.errorRetry).toBe(null)
  })

  it('keeps the append flag when an older page fails', async () => {
    const store = await freshStore()
    store.commit('newTimeline', {
      channel: {uid: 'home'},
      timeline: {items: [item('a')], paging: {after: 'a'}}
    })
    const { ApiError } = await import('../src/api')
    request.mockImplementationOnce(() => Promise.reject(new ApiError('boom', 500)))

    await store.dispatch('fetchTimeline', {uid: 'home', after: 'a', append: true})

    expect(store.state.errorRetry).toEqual({uid: 'home', after: 'a', append: true})
    // The reader keeps what is already on screen.
    expect(store.state.timeline.items).toHaveLength(1)
  })
})

describe('logout', () => {
  it('clears the token, the session and the stored login', async () => {
    const store = await freshStore()
    window.localStorage.setItem('login_data', JSON.stringify({access_token: 'tok'}))
    store.commit('newAccessToken', {access_token: 'tok', me: 'https://p83.nl/'})
    store.commit('newChannels', [{uid: 'home', name: 'Home'}])

    store.commit('logout')

    expect(store.state.logged_in).toBe(false)
    expect(store.state.access_token).toBe('')
    expect(store.state.channels).toEqual([])
    expect(store.state.timeline.items).toEqual([])
    expect(window.localStorage.getItem('login_data')).toBe(null)
  })

  it('reports an expired session as a sign-in prompt', async () => {
    const store = await freshStore()
    store.commit('newAccessToken', {access_token: 'tok'})

    await store.dispatch('sessionExpired')

    expect(store.state.logged_in).toBe(false)
    expect(store.state.error).toContain('session expired')
  })
})
