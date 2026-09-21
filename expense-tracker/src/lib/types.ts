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
  /** Quién pagó / cobró; `null` = sin asignar. */
  memberId: number | null
}

export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const
export type Currency = (typeof CURRENCIES)[number]

export const EXPENSE_CATEGORIES = ['Vivienda', 'Comida', 'Transporte', 'Ocio', 'Salud', 'Otros']

export const INCOME_CATEGORIES = ['Salario', 'Bizum', 'Inversión', 'Otros']

/** Gasto total de una categoría en un mes (ya en decimal). */
export type CategoryMonthTotal = { month: string; category: string; amount: number }

/** Miembro del hogar (etiqueta "quién"). Archivado = ya no se puede elegir, pero sus movimientos conservan el nombre. */
export interface Member {
  id: number
  name: string
  archived: boolean
}
