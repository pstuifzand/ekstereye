import { beforeEach, describe, expect, it, vi } from 'vitest'

// markRead keeps module-level queues, so every test imports a fresh copy.
async function freshModule() {
  vi.resetModules()
  return import('../src/markRead')
}

describe('markRead queue', () => {
  let sender

  beforeEach(() => {
    vi.useRealTimers()
    sender = vi.fn(() => Promise.resolve())
  })

  it('sends one batched request for several enqueued entries', async () => {
    const mod = await freshModule()
    mod.setMarkReadSender(sender)
    mod.enqueueMarkRead('home', 'a')
    mod.enqueueMarkRead('home', 'b')
    mod.enqueueMarkRead('home', 'c')

    await mod.flushMarkRead()

    expect(sender).toHaveBeenCalledTimes(1)
    expect(sender).toHaveBeenCalledWith('home', ['a', 'b', 'c'], { keepalive: false })
  })

  it('drops a uid that is already queued', async () => {
    const mod = await freshModule()
    mod.setMarkReadSender(sender)
    mod.enqueueMarkRead('home', 'a')
    mod.enqueueMarkRead('home', 'a')

    await mod.flushMarkRead()

    expect(sender).toHaveBeenCalledWith('home', ['a'], { keepalive: false })
  })

  it('keeps channels apart', async () => {
    const mod = await freshModule()
    mod.setMarkReadSender(sender)
    mod.enqueueMarkRead('home', 'a')
    mod.enqueueMarkRead('tech', 'b')

    await mod.flushMarkRead()

    expect(sender).toHaveBeenCalledTimes(2)
    expect(sender).toHaveBeenCalledWith('home', ['a'], { keepalive: false })
    expect(sender).toHaveBeenCalledWith('tech', ['b'], { keepalive: false })
  })

  it('splits a batch larger than the maximum', async () => {
    const mod = await freshModule()
    mod.setMarkReadSender(sender)
    for (let i = 0; i < 51; i += 1) {
      mod.enqueueMarkRead('home', 'uid-' + i)
    }

    await mod.flushMarkRead()

    expect(sender).toHaveBeenCalledTimes(2)
    expect(sender.mock.calls[0][1]).toHaveLength(50)
    expect(sender.mock.calls[1][1]).toHaveLength(1)
  })

  it('passes keepalive through for the flush on page hide', async () => {
    const mod = await freshModule()
    mod.setMarkReadSender(sender)
    mod.enqueueMarkRead('home', 'a')

    await mod.flushMarkRead({ keepalive: true })

    expect(sender).toHaveBeenCalledWith('home', ['a'], { keepalive: true })
  })

  it('retries a failed batch once and then drops it', async () => {
    const mod = await freshModule()
    const failing = vi.fn(() => Promise.reject(new Error('offline')))
    mod.setMarkReadSender(failing)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mod.enqueueMarkRead('home', 'a')
    await mod.flushMarkRead()
    expect(failing).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()

    // The uid is back in the queue, so the retry sends it again.
    await mod.flushMarkRead()
    expect(failing).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledTimes(1)

    // A third attempt has nothing left: a dead endpoint must not spin.
    await mod.flushMarkRead()
    expect(failing).toHaveBeenCalledTimes(2)
  })

  it('flushes by itself after the delay', async () => {
    vi.useFakeTimers()
    const mod = await freshModule()
    mod.setMarkReadSender(sender)
    mod.enqueueMarkRead('home', 'a')

    await vi.advanceTimersByTimeAsync(2100)

    expect(sender).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('ignores an empty channel or uid', async () => {
    const mod = await freshModule()
    mod.setMarkReadSender(sender)
    mod.enqueueMarkRead('', 'a')
    mod.enqueueMarkRead('home', '')

    await mod.flushMarkRead()

    expect(sender).not.toHaveBeenCalled()
  })
})
