export const TRANSACTION_TYPES = ['income', 'expense', 'saving'] as const
/** Ingreso, gasto o ahorro (dinero que se aparta: no es un gasto, pero tampoco queda disponible). */
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

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

export const SAVING_CATEGORIES = ['Fondo de emergencia', 'Vacaciones', 'Jubilación', 'Otros']

/** Gasto total de una categoría en un mes (ya en decimal). */
export type CategoryMonthTotal = { month: string; category: string; amount: number }

/** Miembro del hogar (etiqueta "quién"). Archivado = ya no se puede elegir, pero sus movimientos conservan el nombre. */
export interface Member {
  id: number
  name: string
  archived: boolean
}

/** Estado del bloqueo con PIN. */
export interface AuthStatus {
  /** Hay un PIN configurado. */
  hasPin: boolean
  /** La app está desbloqueada (siempre true si no hay PIN). */
  unlocked: boolean
}

/** Resultado de intentar desbloquear con un PIN. */
export type UnlockResult =
  | { ok: true }
  | {
      ok: false
      /** "wrong" = PIN incorrecto; "locked-out" = demasiados intentos, hay que esperar. */
      reason: 'wrong' | 'locked-out'
      /** Milisegundos hasta poder volver a intentarlo (0 si no hay espera). */
      retryAfterMs: number
      /** Intentos que quedan antes de la siguiente espera. */
      attemptsLeft: number
    }
