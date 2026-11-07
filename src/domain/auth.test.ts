import { describe, expect, it } from 'vitest'
import { authErrorMessage, passwordProblem, readAuthRedirect } from './auth'

describe('passwordProblem', () => {
  it('verlangt mindestens 8 Zeichen', () => {
    expect(passwordProblem('kurz', 'kurz')).toMatch(/mindestens 8/)
  })

  it('verlangt zweimal dasselbe Passwort', () => {
    expect(passwordProblem('geheim123', 'geheim124')).toMatch(/stimmen nicht/)
  })

  it('akzeptiert ein passendes Passwort', () => {
    expect(passwordProblem('geheim123', 'geheim123')).toBeNull()
  })
})

describe('authErrorMessage', () => {
  it('erklärt bekannte Fehler', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' }, 'login')).toBe('E-Mail oder Passwort ist falsch.')
    expect(authErrorMessage({ code: 'email_not_confirmed' }, 'login')).toMatch(/bestätige zuerst/)
    expect(authErrorMessage({ status: 429 }, 'signup')).toMatch(/Zu viele Versuche/)
  })

  it('fällt je nach Aktion auf einen allgemeinen Text zurück', () => {
    expect(authErrorMessage({ code: 'unbekannt' }, 'signup')).toMatch(/Registrieren/)
    expect(authErrorMessage({}, 'reset')).toMatch(/Mail konnte nicht/)
  })
})

describe('readAuthRedirect', () => {
  it('erkennt einen erfolgreichen Link am code', () => {
    expect(readAuthRedirect('?code=abc', '')).toEqual({ kind: 'confirmed' })
  })

  it('erkennt abgelaufene Links, auch im Hash', () => {
    expect(readAuthRedirect('', '#error=access_denied&error_code=otp_expired')).toEqual({
      kind: 'error',
      message: expect.stringMatching(/abgelaufen/),
    })
  })

  it('ignoriert normale Aufrufe', () => {
    expect(readAuthRedirect('', '')).toBeNull()
  })
})
