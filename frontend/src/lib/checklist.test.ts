import { describe, expect, it } from 'vitest'
import { checklistErrors, checklistSummary, normalizeChecklist } from './checklist'

describe('normalizeChecklist', () => {
  it('converte o formato antigo (itens marcados) para OK', () => {
    expect(normalizeChecklist(['Ruído ok'])).toEqual([{ item: 'Ruído ok', result: 'OK' }])
  })

  it('mantém o formato atual e trata ausência', () => {
    const current = [{ item: 'Ruído ok', result: 'NOK' as const, note: 'x' }]
    expect(normalizeChecklist(current)).toEqual(current)
    expect(normalizeChecklist(null)).toEqual([])
    expect(normalizeChecklist(undefined)).toEqual([])
  })
})

describe('checklistSummary', () => {
  it('conta por resultado', () => {
    expect(
      checklistSummary([
        { item: 'a', result: 'OK' },
        { item: 'b', result: 'NOK' },
        { item: 'c', result: 'NA' },
        { item: 'd', result: 'OK' },
      ])
    ).toEqual({ ok: 2, nok: 1, na: 1, total: 4 })
  })
})

describe('checklistErrors', () => {
  const expected = ['a', 'b']

  it('exige todos os itens respondidos', () => {
    expect(checklistErrors(expected, { a: { item: 'a', result: 'OK' } })).toEqual([
      'Responda todos os itens (1 pendente(s))',
    ])
  })

  it('exige nota no Não OK', () => {
    expect(
      checklistErrors(expected, {
        a: { item: 'a', result: 'OK' },
        b: { item: 'b', result: 'NOK', note: ' ' },
      })
    ).toEqual(['Descreva o problema em "b"'])
  })

  it('sem erros quando completo', () => {
    expect(
      checklistErrors(expected, {
        a: { item: 'a', result: 'NA' },
        b: { item: 'b', result: 'NOK', note: 'vazando' },
      })
    ).toEqual([])
  })
})
