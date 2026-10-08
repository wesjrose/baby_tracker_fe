import { useState, type FormEvent } from 'react'
import { CartoonBaby } from '@/components/CartoonBaby.tsx'

type TokenPair = {
  access: string
  refresh: string
}

type SignInResult =
  | { ok: true; tokens: TokenPair }
  | { ok: false; message: string }

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

function isTokenPair(value: unknown): value is TokenPair {
  if (!value || typeof value !== 'object') return false
  const token = value as Record<string, unknown>
  return typeof token.access === 'string' && typeof token.refresh === 'string'
}

function messageFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  if (typeof record.detail === 'string') {
    if (record.detail.toLowerCase().includes('no active account')) {
      return "Those details didn't match. Try again?"
    }
    return record.detail
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }

  return null
}

async function signIn(email: string, password: string): Promise<SignInResult> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return {
      ok: false,
      message: "We couldn't reach the server. Check your connection and try again.",
    }
  }

  if (!response.ok) {
    let message = "We couldn't sign you in just now. Please try again."
    try {
      message = messageFromBody(await response.json()) ?? message
    } catch {
      // The server did not return JSON.
    }
    return { ok: false, message }
  }

  try {
    const body: unknown = await response.json()
    if (!isTokenPair(body)) {
      return { ok: false, message: 'The server sent an unexpected sign-in response.' }
    }
    return { ok: true, tokens: body }
  } catch {
    return { ok: false, message: 'The server sent an unexpected sign-in response.' }
  }
}

function saveSession(tokens: TokenPair) {
  sessionStorage.setItem('accessToken', tokens.access)
  sessionStorage.setItem('refreshToken', tokens.refresh)
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setError('Email and password are both needed.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Enter an email address to sign in.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await signIn(trimmedEmail, password)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    try {
      saveSession(result.tokens)
    } catch {
      setError('You were signed in, but this browser blocked saving the session.')
      return
    }

    setSignedIn(true)
  }

  function useDifferentAccount() {
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    setPassword('')
    setSignedIn(false)
    setError(null)
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-rose-200/70 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-28 -right-12 h-36 w-36 rounded-full bg-amber-200/80 blur-2xl"
      />

      <div className="relative flex flex-1 flex-col items-center">
        <CartoonBaby />
        <h1 className="mt-1 text-center text-3xl font-extrabold tracking-tight text-ink">
          Baby Tracker
        </h1>
        <p className="mt-2 max-w-xs text-center text-base leading-snug text-ink/75">
          Welcome back. Sign in to log feedings, diapers, and the little moments.
        </p>

        <section className="mt-6 w-full rounded-[2rem] bg-white/85 p-6 shadow-xl shadow-rose-200/70 ring-1 ring-white">
          {signedIn ? (
            <div className="flex flex-col items-center py-4 text-center">
              <p className="text-xl font-extrabold text-ink">You're signed in.</p>
              <p className="mt-2 text-base text-ink/75">
                This session is saved in this browser.
              </p>
              <button
                type="button"
                onClick={useDifferentAccount}
                className="mt-6 h-12 w-full rounded-2xl bg-berry text-base font-extrabold text-white shadow-lg shadow-rose-200 active:scale-[0.98]"
              >
                Use a different account
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="text-sm font-extrabold text-ink">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 h-12 w-full rounded-2xl border border-rose-100 bg-rose-50/70 px-4 text-base text-ink outline-none placeholder:text-ink/35 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-extrabold text-ink">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-rose-100 bg-rose-50/70 px-4 pr-20 text-base text-ink outline-none placeholder:text-ink/35 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-2 h-9 -translate-y-1/2 rounded-xl px-3 text-sm font-extrabold text-berry"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error ? (
                <p role="alert" className="text-sm font-bold text-berry">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="h-12 rounded-2xl bg-berry text-base font-extrabold text-white shadow-lg shadow-rose-200 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
