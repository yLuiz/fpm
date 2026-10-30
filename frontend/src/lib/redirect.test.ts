import { describe, expect, it } from 'vitest'
import { currentPath, safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it('aceita caminhos internos', () => {
    expect(safeRedirect('/equipment/123')).toBe('/equipment/123')
    expect(safeRedirect('/e/abc?x=1')).toBe('/e/abc?x=1')
  })

  it('cai no fallback para vazio, externo ou protocolo relativo', () => {
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect('')).toBe('/')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect('//evil.com')).toBe('/')
  })

  it('não volta para a tela de login', () => {
    expect(safeRedirect('/login')).toBe('/')
    expect(safeRedirect('/login?from=/x')).toBe('/')
  })
})

describe('currentPath', () => {
  it('junta rota, query e hash', () => {
    expect(currentPath({ pathname: '/a', search: '?b=1', hash: '#c' })).toBe('/a?b=1#c')
    expect(currentPath({ pathname: '/a' })).toBe('/a')
  })
})
