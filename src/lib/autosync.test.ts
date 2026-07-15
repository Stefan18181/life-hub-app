import { beforeEach, describe, expect, it } from 'vitest'
import { saveEvents } from './events'
import {
  acquireSyncLock,
  clearBackoff,
  currentSnapshot,
  hasUnsyncedChanges,
  inBackoff,
  markSynced,
  releaseSyncLock,
  setBackoff,
} from './autosync'

describe('Snapshot & Änderungserkennung', () => {
  beforeEach(() => localStorage.clear())

  it('meldet Änderungen erst nach markSynced als gesichert', () => {
    saveEvents([{ id: 'a', date: '2026-07-16', title: 'Test' }])
    expect(hasUnsyncedChanges()).toBe(true)
    markSynced()
    expect(hasUnsyncedChanges()).toBe(false)
  })

  it('erkennt eine neue Änderung nach dem Sichern', () => {
    markSynced()
    expect(hasUnsyncedChanges()).toBe(false)
    saveEvents([{ id: 'b', date: '2026-07-17', title: 'Neu' }])
    expect(hasUnsyncedChanges()).toBe(true)
  })

  it('currentSnapshot enthält den gespeicherten Bestand', () => {
    saveEvents([{ id: 'c', date: '2026-07-18', title: 'Foo' }])
    expect(currentSnapshot()).toContain('Foo')
  })
})

describe('Sync-Lock', () => {
  it('gibt den Lock nur einmal aus, bis er freigegeben wird', () => {
    expect(acquireSyncLock()).toBe(true)
    expect(acquireSyncLock()).toBe(false)
    releaseSyncLock()
    expect(acquireSyncLock()).toBe(true)
    releaseSyncLock()
  })
})

describe('Backoff', () => {
  it('ist nach setBackoff aktiv und nach clearBackoff wieder frei', () => {
    clearBackoff()
    expect(inBackoff()).toBe(false)
    setBackoff(10_000)
    expect(inBackoff()).toBe(true)
    clearBackoff()
    expect(inBackoff()).toBe(false)
  })
})
