export function numberWheelDigits(value: string, integerDigits: number, decimals: number): number[] {
  const parsed = Number(value.replace(',', '.'))
  const safe = Number.isFinite(parsed) ? Math.min(10 ** integerDigits - 10 ** -decimals, Math.max(0, parsed)) : 0
  const text = safe.toFixed(decimals).replace('.', '').padStart(integerDigits + decimals, '0')
  return text.slice(-(integerDigits + decimals)).split('').map(Number)
}

export function numberWheelValue(digits: number[], decimals: number): string {
  return String(Number(digits.join('')) / 10 ** decimals)
}

export function timeWheelParts(seconds: number): { hours: number; minutes: number } {
  const total = Number.isFinite(seconds) ? Math.min(1440, Math.max(seconds > 0 ? 1 : 0, Math.round(seconds / 60))) : 0
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}

export function timeWheelSeconds(hours: number, minutes: number): number | null {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null
  const seconds = hours * 3600 + minutes * 60
  return seconds > 0 && seconds <= 86400 ? seconds : null
}
