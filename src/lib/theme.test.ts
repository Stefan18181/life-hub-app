import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, loadTheme, saveTheme } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('lädt das gespeicherte Theme zurück', () => {
    saveTheme('light')
    expect(loadTheme()).toBe('light')
    saveTheme('dark')
    expect(loadTheme()).toBe('dark')
  })

  it('applyTheme setzt data-theme auf dem html-Element', () => {
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('saveTheme persistiert und wendet an', () => {
    saveTheme('light')
    expect(localStorage.getItem('life-hub.theme.v1')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
