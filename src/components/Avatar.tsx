type Props = {
  src: string
  alt?: string
  className: string
}

/**
 * Zeigt ein Profilbild als CSS-Hintergrund statt als <img>-Element an.
 * Dadurch bieten iOS, Android und Desktop-Browser beim langen Drücken oder Rechtsklick
 * kein „In Fotos sichern“ / „Bild speichern“ an.
 */
export function Avatar({ src, alt, className }: Props) {
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      style={{ backgroundImage: `url("${src}")` }}
      className={`avatar-protected inline-block bg-cover bg-center select-none ${className}`}
    />
  )
}
