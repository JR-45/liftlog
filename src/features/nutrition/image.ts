import { MAX_SCAN_BYTES } from '../../domain/foodScan'

/** Neu kodieren entfernt ursprüngliche Metadaten und begrenzt die Übertragung. */
export async function prepareFoodPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000 || file.size === 0) {
    throw new Error('Bitte ein JPEG-, PNG- oder WebP-Foto mit höchstens 15 MB wählen. HEIC bitte vorher in JPEG umwandeln.')
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try { await image.decode() }
    catch { throw new Error('Das Foto konnte nicht geöffnet werden. Bitte ein anderes Bild wählen.') }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 50_000_000) {
      throw new Error('Das Foto ist zu groß. Bitte eine kleinere Aufnahme wählen.')
    }
    const factor = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * factor))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * factor))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Die Bildverarbeitung ist auf diesem Gerät nicht verfügbar.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const encoded = canvas.toDataURL('image/jpeg', 0.82).split(',')[1]
    if (!encoded || encoded.length > Math.ceil(MAX_SCAN_BYTES / 3) * 4) throw new Error('Das Foto ist nach dem Verkleinern noch zu groß.')
    return encoded
  } finally {
    URL.revokeObjectURL(url)
  }
}
