export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  /** Desactivado: se muestra en la lista pero no cuenta en totales ni gráficos. */
  excluded: boolean
}

export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const
export type Currency = (typeof CURRENCIES)[number]

export const EXPENSE_CATEGORIES = ['Vivienda', 'Comida', 'Transporte', 'Ocio', 'Salud', 'Otros']

export const INCOME_CATEGORIES = ['Salario', 'Bizum', 'Inversión', 'Otros']

/** Gasto total de una categoría en un mes (ya en decimal). */
export type CategoryMonthTotal = { month: string; category: string; amount: number }
