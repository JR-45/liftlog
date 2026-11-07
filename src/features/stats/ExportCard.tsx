import { useState } from 'react'
import { buildCsv, exportFileName } from '../../domain/export'
import { loadExportRows } from './api'

type Prepared = { file: File; setCount: number }

function canShare(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function ExportCard({ today }: { today: string }) {
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePrepare() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const rows = await loadExportRows()
      if (rows.length === 0) {
        setMessage('Noch keine Sätze gespeichert.')
        return
      }
      const name = exportFileName(today)
      setPrepared({
        file: new File([buildCsv(rows)], name, { type: 'text/csv;charset=utf-8' }),
        setCount: rows.length,
      })
    } catch {
      setError('Die Daten konnten nicht geladen werden. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  // iOS erlaubt das Teilen nur direkt nach einem Tippen, deshalb ist das ein eigener Schritt nach dem Laden.
  async function handleSave() {
    if (!prepared) return
    setError(null)
    setMessage(null)
    try {
      if (canShare(prepared.file)) {
        await navigator.share({ files: [prepared.file] })
      } else {
        download(prepared.file)
      }
      setMessage('Datei übergeben. Prüf am besten, ob sie dort angekommen ist.')
    } catch (shareError) {
      // Abbrechen im Teilen-Menü ist kein Fehler.
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      download(prepared.file)
      setMessage('Teilen ging nicht, die Datei wurde stattdessen heruntergeladen.')
    }
  }

  return (
    <section className="mt-5">
      <h2 className="text-lg font-medium text-neutral-100">Backup</h2>
      <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-800/40 p-3">
        <p className="text-sm text-neutral-400">
          Alle deine Sätze als CSV-Datei, z. B. für iCloud Drive oder Excel. Einspielen lässt sich die Datei in der App
          bisher nicht.
        </p>
        {prepared ? (
          <>
            <p className="mt-3 text-sm text-neutral-200" role="status">
              {prepared.setCount === 1 ? '1 Satz' : `${prepared.setCount} Sätze`} bereit
            </p>
            <button
              className="mt-2 min-h-11 w-full rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-neutral-950"
              type="button"
              onClick={() => void handleSave()}
            >
              Datei sichern
            </button>
          </>
        ) : (
          <button
            className="mt-3 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-100 disabled:opacity-50"
            type="button"
            disabled={busy}
            onClick={() => void handlePrepare()}
          >
            {busy ? 'Daten werden geladen …' : 'Daten exportieren'}
          </button>
        )}
        {message && <p className="mt-2 text-sm text-neutral-400" role="status">{message}</p>}
        {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
      </div>
    </section>
  )
}
