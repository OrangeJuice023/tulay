import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearJourney,
  getSnapshot,
  saveThread,
  type ChatThread,
} from './journey-store'

/**
 * Thread isolation: two threads must never share messages, and a reload must
 * return exactly what was saved. The store talks to `window`, so tests
 * install a fake storage backend (node has no DOM).
 */
function installWindowStub() {
  const data = new Map<string, string>()
  const listeners = new Map<string, Set<() => void>>()
  const stub = {
    localStorage: {
      getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
    dispatchEvent: (event: { type: string }) => {
      listeners.get(event.type)?.forEach((callback) => callback())
      return true
    },
    addEventListener: (type: string, callback: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>()
      set.add(callback)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, callback: () => void) => {
      listeners.get(type)?.delete(callback)
    },
  }
  vi.stubGlobal('window', stub)
  return stub
}

function thread(id: string, texts: string[]): ChatThread {
  return {
    id,
    title: id,
    messages: texts.map((text, index) => ({
      role: (index % 2 === 0 ? 'user' : 'arko') as 'user' | 'arko',
      text,
      at: new Date().toISOString(),
    })),
    updatedAt: new Date().toISOString(),
  }
}

describe('journey thread isolation', () => {
  beforeEach(() => {
    installWindowStub()
    clearJourney()
  })

  it('round-trips one thread reload exactly', () => {
    saveThread(thread('ask-current', ['I need a technical co-founder', 'What should they own?']))
    const snapshot = getSnapshot()
    expect(snapshot.threads).toHaveLength(1)
    expect(snapshot.threads[0].messages.map((message) => message.text)).toEqual([
      'I need a technical co-founder',
      'What should they own?',
    ])
  })

  it('keeps two thread IDs fully separate', () => {
    saveThread(thread('thread-a', ['co-founder question', 'co-founder answer']))
    saveThread(thread('thread-b', ['portfolio question', 'portfolio answer']))
    const snapshot = getSnapshot()
    expect(snapshot.threads).toHaveLength(2)
    const byId = new Map(snapshot.threads.map((item) => [item.id, item.messages.map((m) => m.text)]))
    expect(byId.get('thread-a')).toEqual(['co-founder question', 'co-founder answer'])
    expect(byId.get('thread-b')).toEqual(['portfolio question', 'portfolio answer'])
  })

  it('updating one thread leaves the other untouched', () => {
    saveThread(thread('thread-a', ['a1']))
    saveThread(thread('thread-b', ['b1']))
    saveThread(thread('thread-a', ['a1', 'a2', 'a3']))
    const snapshot = getSnapshot()
    const byId = new Map(snapshot.threads.map((item) => [item.id, item.messages.length]))
    expect(byId.get('thread-a')).toBe(3)
    expect(byId.get('thread-b')).toBe(1)
  })
})
