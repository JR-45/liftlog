import type { AuthError } from '@supabase/supabase-js'
import { type FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputClass =
  'mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-base text-neutral-100 outline-none focus:border-neutral-400'
const primaryButtonClass =
  'mt-4 w-full rounded-lg bg-neutral-200 px-4 py-3 font-medium text-neutral-900 disabled:opacity-50'
const secondaryButtonClass = 'py-2 text-sm text-neutral-400 disabled:opacity-50'

function sendErrorMessage(error: AuthError): string {
  if (error.status === 429) return 'Zu viele Versuche. Warte kurz und versuch es noch einmal.'
  return 'Der Code konnte nicht gesendet werden. Versuch es später noch einmal.'
}

function verifyErrorMessage(error: AuthError): string {
  if (error.status === 429) return 'Zu viele Versuche. Warte kurz und versuch es noch einmal.'
  if (error.code === 'otp_expired' || error.status === 403) {
    return 'Der Code ist falsch oder abgelaufen.'
  }
  return 'Die Anmeldung hat nicht geklappt. Versuch es später noch einmal.'
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function sendCode(): Promise<boolean> {
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: email.trim() })
    // Bei geschlossener Registrierung geht es wie gewohnt weiter. So verrät die Oberfläche
    // nicht, welche E-Mail-Adressen ein Konto haben. Durchgesetzt wird das serverseitig.
    if (sendError && sendError.code !== 'otp_disabled') {
      setError(sendErrorMessage(sendError))
      return false
    }
    return true
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    if (await sendCode()) setStep('code')
    setBusy(false)
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    })
    // Bei Erfolg wechselt useSession automatisch zur App.
    if (verifyError) setError(verifyErrorMessage(verifyError))
    setBusy(false)
  }

  async function handleResend() {
    setBusy(true)
    setError(null)
    setNotice(null)
    if (await sendCode()) setNotice('Neuer Code ist unterwegs.')
    setBusy(false)
  }

  function handleChangeEmail() {
    setStep('email')
    setCode('')
    setError(null)
    setNotice(null)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-neutral-100">LiftLog</h1>

      {step === 'email' ? (
        <form className="mt-6" onSubmit={handleEmailSubmit}>
          <label className="block text-sm text-neutral-300">
            E-Mail
            <input
              className={inputClass}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          <button className={primaryButtonClass} type="submit" disabled={busy}>
            {busy ? 'Wird gesendet …' : 'Code senden'}
          </button>
        </form>
      ) : (
        <form className="mt-6" onSubmit={handleCodeSubmit}>
          <p className="text-sm text-neutral-400">
            Wir haben einen 6-stelligen Code an <span className="text-neutral-200">{email.trim()}</span> gesendet,
            falls diese Adresse angemeldet werden darf. Er ist 10 Minuten gültig.
          </p>
          <label className="mt-4 block text-sm text-neutral-300">
            Code
            <input
              className={`${inputClass} tracking-widest`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          {notice && <p role="status" className="mt-3 text-sm text-neutral-300">{notice}</p>}
          <button className={primaryButtonClass} type="submit" disabled={busy || code.length !== 6}>
            {busy ? 'Wird geprüft …' : 'Anmelden'}
          </button>
          <div className="mt-2 flex justify-between">
            <button className={secondaryButtonClass} type="button" disabled={busy} onClick={handleChangeEmail}>
              Andere E-Mail
            </button>
            <button className={secondaryButtonClass} type="button" disabled={busy} onClick={handleResend}>
              Code erneut senden
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
