/**
 * Typed client for the Aframp Pay backend (Rust/Axum, see Aframp-backend).
 *
 * The backend is a separate origin, so every call goes straight from the browser
 * to it with a bearer token — there is no Next.js API layer in between.
 *
 * Errors always come back as `{ "error": "message" }`.
 */

/** Backend ids are UUIDs; aliased for readability, not validated here. */
type UUID = string

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

/**
 * Amount fields are `i64` on the wire. JSON.parse would silently round anything
 * past 2^53, so these keys are re-quoted before parsing and revived as bigint.
 */
const BIGINT_KEYS = new Set(['amount_stroops', 'available', 'pending', 'fee_stroops', 'network_fee_stroops', 'total_stroops'])

/**
 * There are no refresh tokens — a 24h expiry just starts returning 401. The
 * session provider registers here so any expired call lands the user back on
 * the login screen instead of showing a bare error.
 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface AuthResponse {
  token: string
  user_id: UUID
  /**
   * Nullable by contract. Signup always creates a merchant today, but an
   * account without one gets 400 — not 401 — from every merchant-scoped call.
   */
  merchant_id: UUID | null
}

export interface Me {
  user_id: UUID
  email: string
  name: string
  created_at: string
  merchant_id: UUID | null
  merchant_name: string | null
}

export interface Wallet {
  id: UUID
  merchant_id: UUID
  address: string
  network: string
  created_at: string
}

export interface Balance {
  merchant_id: UUID
  asset: string
  available: bigint
  pending: bigint
  updated_at: string
}

export type PaymentStatus = 'detected' | 'verified' | 'confirmed' | 'failed'

export interface Payment {
  id: UUID
  merchant_id: UUID
  wallet_id: UUID
  wallet_address: string
  tx_hash: string
  amount_stroops: bigint
  asset: string
  network: string
  status: PaymentStatus
  confirmations: number
  created_at: string
  updated_at: string
}

export type PaymentRequestStatus = 'pending' | 'paid' | 'expired'

export interface PaymentRequest {
  id: UUID
  merchant_id: UUID
  address: string
  network: string
  amount_stroops: bigint
  amount_paid_stroops?: bigint
  asset: string
  memo: string
  status: PaymentRequestStatus
  allow_partial?: boolean
  expires_at: string
  created_at: string
  /** null for any asset with no configured issuer — currently everything but XLM. */
  sep7_uri: string | null
}

export type RefundStatus = 'pending' | 'completed' | 'failed'

export interface Refund {
  id: UUID
  payment_id: UUID
  merchant_id: UUID
  amount_stroops: bigint
  asset: string
  status: RefundStatus
  recipient: string | null
  created_at: string
  updated_at: string
}

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Withdrawal {
  id: UUID
  merchant_id: UUID
  amount_stroops: bigint
  asset: string
  status: WithdrawalStatus
  provider: string | null
  provider_reference: string | null
  bank_code: string | null
  account_number: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface FeeEstimate {
  fee_stroops: bigint
  network_fee_stroops: bigint
  total_stroops: bigint
}

export interface Remittance {
  id: UUID
  merchant_id: UUID
  destination_address: string
  amount_stroops: bigint
  asset: string
  memo: string | null
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  tx_hash: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

function parseWithBigInts<T>(text: string): T {
  const quoted = text.replace(/"(amount_stroops|available|pending)"\s*:\s*(-?\d+)/g, '"$1":"$2"')
  return JSON.parse(quoted, (key, value) =>
    BIGINT_KEYS.has(key) && typeof value === 'string' ? BigInt(value) : value
  ) as T
}

/**
 * JSON.stringify throws on bigint, and `Number(stroops)` would silently round
 * past 2^53. This emits bigints as unquoted JSON integers instead.
 */
export function stringifyWithBigInts(value: unknown): string {
  const marker = ' bigint '
  const json = JSON.stringify(value, (_key, raw) =>
    typeof raw === 'bigint' ? `${marker}${raw.toString()}${marker}` : raw
  )
  return json.replace(new RegExp(`"${marker}(-?\\d+)${marker}"`, 'g'), '$1')
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
  signal?: AbortSignal
}

/** Exported for tests: the single fetch wrapper every `api.*` call funnels through. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : stringifyWithBigInts(body),
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    // Also what a CORS rejection looks like from the browser's side.
    throw new ApiError(`Can't reach the payment server at ${BASE_URL}.`, 0)
  }

  const text = await response.text()

  if (!response.ok) {
    // Only for calls that actually carried a token — a 401 from /login is a
    // wrong password, not an expired session.
    if (response.status === 401 && token) onUnauthorized?.()

    let message = `Request failed (${response.status})`
    try {
      const parsed = JSON.parse(text) as { error?: string }
      if (parsed.error) message = parsed.error
    } catch {
      // Non-JSON body (proxy error page, panic); keep the status-code message.
    }
    throw new ApiError(message, response.status)
  }

  return text ? parseWithBigInts<T>(text) : (undefined as T)
}

export const api = {
  signup: (email: string, password: string, name: string) =>
    request<AuthResponse>('/signup', { method: 'POST', body: { email, password, name } }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/login', { method: 'POST', body: { email, password } }),

  /** The JWT carries only ids; this is how anything human-readable is rendered. */
  getMe: (token: string, signal?: AbortSignal) => request<Me>('/me', { token, signal }),

  createWallet: (token: string) =>
    request<Wallet>('/wallet/create', { method: 'POST', body: {}, token }),

  getWallet: (token: string) => request<Wallet>('/wallet', { token }),

  getBalances: (token: string, signal?: AbortSignal) =>
    request<Balance[]>('/balance', { token, signal }),

  listTransactions: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Payment[]>(`/transactions?limit=${limit}`, { token, signal }),

  createPaymentRequest: (
    token: string,
    amountStroops: bigint,
    asset?: string,
    expiresInSecs?: number,
    allowPartial = false
  ) =>
    request<PaymentRequest>('/payment-requests', {
      method: 'POST',
      token,
      body: {
        amount_stroops: amountStroops,
        ...(asset ? { asset } : {}),
        ...(expiresInSecs ? { expires_in_secs: expiresInSecs } : {}),
        ...(allowPartial ? { allow_partial: true } : {}),
      },
    }),

  listPaymentRequests: (token: string, limit = 50, signal?: AbortSignal) =>
    request<PaymentRequest[]>(`/payment-requests?limit=${limit}`, { token, signal }),

  /** Deliberately public — a customer's wallet reads this without an account. */
  getPaymentRequest: (id: string, signal?: AbortSignal) =>
    request<PaymentRequest>(`/payment-requests/${id}`, { signal }),

  createRefund: (
    token: string,
    paymentId: string,
    amountStroops: bigint,
    recipientAddress: string,
    reason?: string
  ) =>
    request<Refund>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      token,
      body: {
        amount_stroops: amountStroops,
        recipient: recipientAddress,
        ...(reason ? { reason } : {}),
      },
    }),

  listRefunds: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Refund[]>(`/refunds?limit=${limit}`, { token, signal }),

  createWithdrawal: (
    token: string,
    amountStroops: bigint,
    bankCode: string,
    accountNumber: string,
    asset = 'cNGN'
  ) =>
    request<Withdrawal>('/withdraw', {
      method: 'POST',
      token,
      body: {
        amount_stroops: amountStroops,
        asset,
        bank_code: bankCode,
        account_number: accountNumber,
      },
    }),

  listWithdrawals: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Withdrawal[]>(`/withdrawals?limit=${limit}`, { token, signal }),

  getRemittanceFeeEstimate: (
    token: string,
    amountStroops: bigint,
    asset = 'XLM',
    signal?: AbortSignal
  ) =>
    request<FeeEstimate>(`/remittance/estimate?amount_stroops=${amountStroops}&asset=${asset}`, {
      token,
      signal,
    }),

  createRemittance: (
    token: string,
    destinationAddress: string,
    amountStroops: bigint,
    asset = 'XLM',
    memo?: string
  ) =>
    request<Remittance>('/remittance', {
      method: 'POST',
      token,
      body: {
        destination_address: destinationAddress,
        amount_stroops: amountStroops,
        asset,
        ...(memo ? { memo } : {}),
      },
    }),

  listRemittances: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Remittance[]>(`/remittances?limit=${limit}`, { token, signal }),
}
