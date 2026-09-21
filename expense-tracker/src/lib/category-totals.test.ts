import { describe, expect, it } from 'vitest'
import { expenseTotalsByCategory } from './category-totals'
import type { Transaction } from './types'

let nextId = 1
function tx(type: Transaction['type'], category: string, amount: number, excluded = false): Transaction {
  return { id: nextId++, type, category, amount, description: '', date: '2026-09-10', excluded, memberId: null }
}

describe('expenseTotalsByCategory', () => {
  it('sums by category and sorts from highest to lowest', () => {
    const result = expenseTotalsByCategory([tx('expense', 'Comida', 10), tx('expense', 'Vivienda', 500), tx('expense', 'Comida', 15.5)])
    expect(result).toEqual([
      { category: 'Vivienda', amount: 500 },
      { category: 'Comida', amount: 25.5 },
    ])
  })

  it('ignores income', () => {
    const result = expenseTotalsByCategory([tx('income', 'Salario', 2000), tx('expense', 'Ocio', 30)])
    expect(result).toEqual([{ category: 'Ocio', amount: 30 }])
  })

  it('ignores excluded (deactivated) expenses', () => {
    const result = expenseTotalsByCategory([tx('expense', 'Ocio', 30), tx('expense', 'Ocio', 100, true), tx('expense', 'Comida', 50, true)])
    expect(result).toEqual([{ category: 'Ocio', amount: 30 }])
  })

  it('returns an empty list when there are no expenses', () => {
    expect(expenseTotalsByCategory([])).toEqual([])
    expect(expenseTotalsByCategory([tx('income', 'Bizum', 20)])).toEqual([])
  })
})
