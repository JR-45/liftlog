/**
 * Anleitungen, 2-Phasen-Animationen und Zielmuskeln für alle Übungen im Katalog.
 * Kraft- und Calisthenics-Übungen nutzen anatomische 3D-Phasenbilder;
 * Ausdauer-, Halte- und Mobilitätsübungen nutzen zweiphasige Bewegungs-SVGs mit Muskel-Hervorhebung.
 */

export type ExerciseGuide = {
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  /** [Frame 1 (Start/Dehnung), Frame 2 (Endposition/Kontraktion)] */
  frames: [string, string]
  tips: string[]
}

function sl(slug: string): [string, string] {
  return [
    `https://static.strengthlevel.com/images/exercises/${slug}/howto/${slug}-howto-1-800.jpg`,
    `https://static.strengthlevel.com/images/exercises/${slug}/howto/${slug}-howto-2-800.jpg`,
  ]
}

function slHold(slug: string): [string, string] {
  return [
    `https://static.strengthlevel.com/images/exercises/${slug}/howto/${slug}-howto-1-800.jpg`,
    `https://static.strengthlevel.com/images/exercises/${slug}/${slug}-800.jpg`,
  ]
}

type MotionPose =
  | 'run'
  | 'walk'
  | 'bike'
  | 'row'
  | 'stairs'
  | 'jump'
  | 'ropes'
  | 'sled'
  | 'wallsit'
  | 'hollow'
  | 'handstand'
  | 'catcow'
  | 'hipstretch'
  | 'deepstretch'
  | 'thoracic'

function buildPoseSvg(pose: MotionPose, phase: 1 | 2): string {
  const cyan = '#00B8D9'
  const cyanSoft = '#18E0FF'
  const body = '#334155'
  const joint = '#0F172A'
  const equip = '#94A3B8'

  let content = ''

  switch (pose) {
    case 'run': {
      const legA = phase === 1 ? 'M200 210 L165 275 L135 330' : 'M200 210 L235 255 L220 315'
      const legB = phase === 1 ? 'M200 210 L245 250 L235 305' : 'M200 210 L170 280 L155 335'
      const armA = phase === 1 ? 'M210 135 L245 165 L260 140' : 'M210 135 L175 165 L160 145'
      const armB = phase === 1 ? 'M210 135 L175 170 L160 155' : 'M210 135 L245 160 L265 135'
      content = `
        <line x1="90" y1="340" x2="310" y2="340" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="${legB}" stroke="${body}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.55"/>
        <path d="${armB}" stroke="${body}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.55"/>
        <line x1="200" y1="210" x2="212" y2="125" stroke="${body}" stroke-width="24" stroke-linecap="round"/>
        <path d="${legA}" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="200" cy="210" r="14" fill="${cyanSoft}"/>
        <path d="${armA}" stroke="${body}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="218" cy="92" r="22" fill="${body}"/>
      `
      break
    }
    case 'walk': {
      const legA = phase === 1 ? 'M200 210 L175 275 L165 335' : 'M200 210 L225 275 L235 335'
      const legB = phase === 1 ? 'M200 210 L225 275 L235 335' : 'M200 210 L175 275 L165 335'
      const armA = phase === 1 ? 'M202 135 L230 185' : 'M202 135 L175 185'
      content = `
        <line x1="90" y1="340" x2="310" y2="340" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="${legB}" stroke="${body}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.55"/>
        <line x1="200" y1="210" x2="204" y2="125" stroke="${body}" stroke-width="24" stroke-linecap="round"/>
        <path d="${legA}" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="200" cy="210" r="13" fill="${cyanSoft}"/>
        <path d="${armA}" stroke="${body}" stroke-width="14" stroke-linecap="round" fill="none"/>
        <circle cx="206" cy="92" r="22" fill="${body}"/>
      `
      break
    }
    case 'bike': {
      const kneeY = phase === 1 ? 205 : 245
      const footY = phase === 1 ? 255 : 305
      content = `
        <circle cx="145" cy="295" r="42" stroke="${equip}" stroke-width="8" fill="none"/>
        <circle cx="265" cy="295" r="42" stroke="${equip}" stroke-width="8" fill="none"/>
        <path d="M145 295 L195 295 L235 225 L175 225 Z" stroke="${equip}" stroke-width="6" fill="none" stroke-linejoin="round"/>
        <line x1="175" y1="225" x2="165" y2="195" stroke="${equip}" stroke-width="7" stroke-linecap="round"/>
        <line x1="235" y1="225" x2="245" y2="185" stroke="${equip}" stroke-width="7" stroke-linecap="round"/>
        <line x1="168" y1="195" x2="215" y2="135" stroke="${body}" stroke-width="22" stroke-linecap="round"/>
        <line x1="215" y1="135" x2="245" y2="185" stroke="${body}" stroke-width="14" stroke-linecap="round"/>
        <path d="M168 195 L210 ${kneeY} L195 ${footY}" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="168" cy="195" r="13" fill="${cyanSoft}"/>
        <circle cx="228" cy="105" r="20" fill="${body}"/>
      `
      break
    }
    case 'row': {
      const hipX = phase === 1 ? 215 : 155
      const shoulderX = phase === 1 ? 235 : 135
      const handX = phase === 1 ? 275 : 155
      content = `
        <line x1="80" y1="310" x2="320" y2="310" stroke="${equip}" stroke-width="8" stroke-linecap="round"/>
        <line x1="285" y1="260" x2="285" y2="325" stroke="${equip}" stroke-width="10" stroke-linecap="round"/>
        <line x1="285" y1="275" x2="${handX}" y2="210" stroke="${equip}" stroke-width="4" stroke-dasharray="4 4"/>
        <path d="M${hipX} 290 L${phase === 1 ? 245 : 215} ${phase === 1 ? 235 : 285} L275 300" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="${hipX}" y1="290" x2="${shoulderX}" y2="195" stroke="${cyan}" stroke-width="22" stroke-linecap="round"/>
        <line x1="${shoulderX}" y1="200" x2="${handX}" y2="210" stroke="${body}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="${shoulderX}" cy="162" r="20" fill="${body}"/>
      `
      break
    }
    case 'stairs': {
      const stepA = phase === 1 ? 'M195 200 L230 235 L230 285' : 'M195 200 L215 265 L215 315'
      const stepB = phase === 1 ? 'M195 200 L175 265 L175 320' : 'M195 200 L165 245 L165 295'
      content = `
        <path d="M120 340 L180 340 L180 305 L240 305 L240 270 L300 270" stroke="${equip}" stroke-width="8" fill="none" stroke-linejoin="round"/>
        <path d="${stepB}" stroke="${body}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.55"/>
        <line x1="195" y1="200" x2="205" y2="120" stroke="${body}" stroke-width="23" stroke-linecap="round"/>
        <path d="${stepA}" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="195" cy="200" r="14" fill="${cyanSoft}"/>
        <circle cx="208" cy="88" r="20" fill="${body}"/>
      `
      break
    }
    case 'jump': {
      const yOffset = phase === 1 ? 0 : -24
      const ropePath = phase === 1 ? 'M155 215 Q200 365 245 215' : 'M155 200 Q200 45 245 200'
      content = `
        <line x1="110" y1="340" x2="290" y2="340" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="${ropePath}" stroke="${cyanSoft}" stroke-width="5" fill="none"/>
        <line x1="200" y1="${215 + yOffset}" x2="200" y2="${325 + yOffset}" stroke="${cyan}" stroke-width="22" stroke-linecap="round"/>
        <line x1="200" y1="${130 + yOffset}" x2="200" y2="${215 + yOffset}" stroke="${body}" stroke-width="24" stroke-linecap="round"/>
        <path d="M160 ${210 + yOffset} L200 ${145 + yOffset} L240 ${210 + yOffset}" stroke="${cyan}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="200" cy="${98 + yOffset}" r="20" fill="${body}"/>
      `
      break
    }
    case 'ropes': {
      const wave = phase === 1
        ? 'M195 195 Q245 145 280 215 T340 285'
        : 'M195 175 Q245 245 280 185 T340 285'
      content = `
        <line x1="80" y1="335" x2="340" y2="335" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="M145 330 L135 255 L165 205" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="135" y1="255" x2="155" y2="155" stroke="${body}" stroke-width="23" stroke-linecap="round"/>
        <line x1="155" y1="165" x2="195" y2="${phase === 1 ? 195 : 175}" stroke="${cyan}" stroke-width="15" stroke-linecap="round"/>
        <path d="${wave}" stroke="${joint}" stroke-width="8" fill="none" stroke-linecap="round"/>
        <circle cx="162" cy="125" r="20" fill="${body}"/>
      `
      break
    }
    case 'sled': {
      const legDrive = phase === 1 ? 'M165 225 L115 280 L85 330' : 'M165 225 L140 275 L125 330'
      content = `
        <line x1="60" y1="335" x2="340" y2="335" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="M265 330 L325 330 M280 330 L280 165" stroke="${joint}" stroke-width="10" stroke-linecap="round"/>
        <path d="${legDrive}" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M165 225 L205 265 L200 330" stroke="${cyan}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7"/>
        <line x1="165" y1="225" x2="225" y2="165" stroke="${body}" stroke-width="23" stroke-linecap="round"/>
        <line x1="225" y1="165" x2="280" y2="185" stroke="${cyan}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="240" cy="138" r="19" fill="${body}"/>
      `
      break
    }
    case 'wallsit': {
      const pulse = phase === 1 ? 22 : 25
      content = `
        <line x1="130" y1="70" x2="130" y2="340" stroke="${equip}" stroke-width="10" stroke-linecap="round"/>
        <line x1="100" y1="340" x2="310" y2="340" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <line x1="145" y1="135" x2="145" y2="235" stroke="${body}" stroke-width="24" stroke-linecap="round"/>
        <path d="M145 235 L225 235 L225 332" stroke="${cyan}" stroke-width="${pulse}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="145" cy="235" r="13" fill="${cyanSoft}"/>
        <circle cx="148" cy="100" r="20" fill="${body}"/>
      `
      break
    }
    case 'hollow': {
      const lift = phase === 1 ? 245 : 228
      content = `
        <line x1="60" y1="310" x2="340" y2="310" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="M145 285 Q200 305 255 285" stroke="${cyan}" stroke-width="24" stroke-linecap="round" fill="none"/>
        <line x1="255" y1="285" x2="320" y2="${lift}" stroke="${cyan}" stroke-width="18" stroke-linecap="round"/>
        <line x1="145" y1="285" x2="90" y2="${lift}" stroke="${body}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="125" cy="260" r="18" fill="${body}"/>
      `
      break
    }
    case 'handstand': {
      const sway = phase === 1 ? 200 : 196
      content = `
        <line x1="100" y1="335" x2="300" y2="335" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <line x1="200" y1="330" x2="${sway}" y2="245" stroke="${cyan}" stroke-width="16" stroke-linecap="round"/>
        <line x1="${sway}" y1="245" x2="${sway}" y2="165" stroke="${cyan}" stroke-width="24" stroke-linecap="round"/>
        <line x1="${sway}" y1="165" x2="${sway}" y2="75" stroke="${body}" stroke-width="20" stroke-linecap="round"/>
        <circle cx="${sway}" cy="268" r="18" fill="${body}"/>
      `
      break
    }
    case 'catcow': {
      const curveY = phase === 1 ? 145 : 225
      const headY = phase === 1 ? 215 : 165
      content = `
        <line x1="80" y1="320" x2="320" y2="320" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <line x1="145" y1="205" x2="145" y2="315" stroke="${body}" stroke-width="16" stroke-linecap="round"/>
        <path d="M255 205 L255 315 L295 315" stroke="${body}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M145 205 Q200 ${curveY} 255 205" stroke="${cyan}" stroke-width="22" stroke-linecap="round" fill="none"/>
        <circle cx="120" cy="${headY}" r="18" fill="${body}"/>
      `
      break
    }
    case 'hipstretch': {
      const leanX = phase === 1 ? 185 : 215
      content = `
        <line x1="70" y1="325" x2="330" y2="325" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="M175 255 L255 255 L255 320" stroke="${body}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M175 255 L115 318 L80 285" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="175" y1="255" x2="${leanX}" y2="155" stroke="${cyan}" stroke-width="22" stroke-linecap="round"/>
        <circle cx="175" cy="255" r="14" fill="${cyanSoft}"/>
        <circle cx="${leanX + 5}" cy="122" r="19" fill="${body}"/>
      `
      break
    }
    case 'deepstretch': {
      const hipY = phase === 1 ? 235 : 275
      content = `
        <line x1="80" y1="330" x2="320" y2="330" stroke="${equip}" stroke-width="6" stroke-linecap="round"/>
        <path d="M165 ${hipY} L235 235 L215 325" stroke="${cyan}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="165" y1="${hipY}" x2="195" y2="${hipY - 95}" stroke="${cyan}" stroke-width="22" stroke-linecap="round"/>
        <line x1="195" y1="${hipY - 85}" x2="225" y2="285" stroke="${body}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="202" cy="${hipY - 125}" r="19" fill="${body}"/>
      `
      break
    }
    case 'thoracic': {
      const armY = phase === 1 ? 155 : 95
      content = `
        <line x1="130" y1="65" x2="130" y2="335" stroke="${equip}" stroke-width="8" stroke-linecap="round"/>
        <line x1="185" y1="145" x2="185" y2="265" stroke="${cyan}" stroke-width="24" stroke-linecap="round"/>
        <line x1="185" y1="265" x2="185" y2="335" stroke="${body}" stroke-width="18" stroke-linecap="round"/>
        <path d="M145 ${armY} L145 195 L225 195 L225 ${armY}" stroke="${cyanSoft}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="185" cy="112" r="19" fill="${body}"/>
      `
      break
    }
  }

  const badge = phase === 1 ? 'PHASE 1' : 'PHASE 2'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <rect width="400" height="400" fill="#FFFFFF"/>
    <circle cx="200" cy="210" r="145" fill="#F1F5F9"/>
    ${content}
    <text x="345" y="375" text-anchor="end" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#64748B">${badge}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function svgFrames(pose: MotionPose): [string, string] {
  return [buildPoseSvg(pose, 1), buildPoseSvg(pose, 2)]
}

const RAW_GUIDES: ExerciseGuide[] = [
  // ============================================================================
  // 1. BRUST
  // ============================================================================
  {
    name: 'Bankdrücken',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Trizeps', 'Vordere Schulter'],
    frames: sl('bench-press'),
    tips: [
      'Schulterblätter auf der Bank zusammenziehen und fest verankern.',
      'Stange kontrolliert bis auf die untere Brust absenken.',
      'Ellenbogen leicht nach innen führen (ca. 45–70° statt 90°).',
    ],
  },
  {
    name: 'Bankdrücken (Kurzhanteln)',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Trizeps', 'Vordere Schulter'],
    frames: sl('dumbbell-bench-press'),
    tips: [
      'Kurzhanteln mit leicht eingedrehten Handgelenken auf Brusthöhe absenken.',
      'Volle Dehnung in der Brust nutzen, ohne die Schulter nach vorn zu rollen.',
      'Hanteln oben kraftvoll zusammenführen, ohne dass sie aneinanderstoßen.',
    ],
  },
  {
    name: 'Schrägbankdrücken',
    primaryMuscles: ['Obere Brust (Clavicularer Anteil)'],
    secondaryMuscles: ['Vordere Schulter', 'Trizeps'],
    frames: sl('incline-bench-press'),
    tips: [
      'Bank auf 30–45 Grad einstellen – steiler verlagert die Last auf die Schultern.',
      'Stange kontrolliert zum oberen Brustbereich unterhalb des Schlüsselbeins führen.',
      'Füße fest in den Boden drücken und Gesäß auf der Bank lassen.',
    ],
  },
  {
    name: 'Schrägbankpresse',
    primaryMuscles: ['Obere Brust (Clavicularer Anteil)'],
    secondaryMuscles: ['Vordere Schulter', 'Trizeps'],
    frames: sl('incline-dumbbell-bench-press'),
    tips: [
      'Sitzhöhe so einstellen, dass sich die Griffe auf Höhe der oberen Brust befinden.',
      'Schulterblätter während der gesamten Druckbewegung am Polster fixieren.',
      'Gewicht am Umkehrpunkt nicht absetzen, um die Spannung zu halten.',
    ],
  },
  {
    name: 'Brustpresse',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Trizeps', 'Vordere Schulter'],
    frames: sl('chest-press'),
    tips: [
      'Griffe auf mittlerer Brusthöhe einstellen und Brustkorb stolz aufrichten.',
      'Arme nach vorn strecken, ohne die Schultern vom Rückenpolster zu lösen.',
      'Kontrolliert zurückführen, bis eine deutliche Dehnung in der Brust spürbar ist.',
    ],
  },
  {
    name: 'Butterfly',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Vordere Schulter'],
    frames: sl('machine-chest-fly'),
    tips: [
      'Ellenbogen leicht gebeugt lassen und den Winkel während der Bewegung beibehalten.',
      'Arme in einem weiten Bogen vor der Brust zusammenführen und kurz anspannen.',
      'Gewicht nur so weit zurückführen, wie die Schultergelenke schmerzfrei bleiben.',
    ],
  },
  {
    name: 'Butterfly am Kabelzug',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Vordere Schulter', 'Bizeps (isometrisch)'],
    frames: sl('cable-fly'),
    tips: [
      'Einen Ausfallschritt nach vorn machen, um einen stabilen Stand zu sichern.',
      'Hände in einem weiten Bogen vor der Brust zusammenführen.',
      'In der Endposition die Brust für eine Sekunde bewusst anspannen.',
    ],
  },
  {
    name: 'Fliegende (Kurzhanteln)',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Vordere Schulter'],
    frames: sl('dumbbell-fly'),
    tips: [
      'Leichte Beugung in den Ellenbogen konstant halten („als würdest du einen Baum umarmen“).',
      'Kurzhanteln langsam absenken, bis die Brust gedehnt ist.',
      'Aus der Brustkraft wieder nach oben führen, nicht drücken.',
    ],
  },
  {
    name: 'Überzüge (Kurzhantel)',
    primaryMuscles: ['Brust (Pectoralis major)', 'Latissimus'],
    secondaryMuscles: ['Trizeps (langer Kopf)', 'Sägemuskel'],
    frames: sl('dumbbell-pullover'),
    tips: [
      'Hüfte stabil halten und den Rumpf fest anspannen.',
      'Kurzhantel mit leicht gebeugten Armen hinter den Kopf absenken.',
      'Über Brust und Latissimus in einem Bogen zurück über die Brust ziehen.',
    ],
  },

  // ============================================================================
  // 2. RÜCKEN
  // ============================================================================
  {
    name: 'Latziehen',
    primaryMuscles: ['Latissimus (Breiter Rückenmuskel)'],
    secondaryMuscles: ['Bizeps', 'Mittlerer Rücken', 'Hintere Schulter'],
    frames: sl('lat-pulldown'),
    tips: [
      'Etwas weiter als schulterbreit greifen und Brustkorb leicht anheben.',
      'Stange vor dem Gesicht bis zum oberen Brustbereich ziehen.',
      'Ellenbogen führen die Bewegung nach unten und hinten, nicht mit Schwung lehnen.',
    ],
  },
  {
    name: 'Latziehen (enger Griff)',
    primaryMuscles: ['Latissimus (unterer & mittlerer Anteil)'],
    secondaryMuscles: ['Bizeps', 'Rhomboiden'],
    frames: sl('close-grip-lat-pulldown'),
    tips: [
      'Schulterblätter zu Beginn jedes Zuges bewusst nach unten ziehen.',
      'Engen Griff bis zum Brustbein führen und die Ellenbogen eng am Körper halten.',
      'Oben die Arme kontrolliert strecken, um den vollen Bewegungsumfang zu nutzen.',
    ],
  },
  {
    name: 'Rudern sitzend',
    primaryMuscles: ['Mittlerer Rücken (Rhomboiden, Trapez)', 'Latissimus'],
    secondaryMuscles: ['Bizeps', 'Hintere Schulter'],
    frames: sl('seated-cable-row'),
    tips: [
      'Aufrecht sitzen, Knie leicht gebeugt und Brust stolz herausstrecken.',
      'Griff zum Bauchnabel ziehen und Schulterblätter hinten zusammenkneifen.',
      'Oberkörper ruhig halten und nicht mit dem unteren Rücken schwungholen.',
    ],
  },
  {
    name: 'Rudern am Kabelzug',
    primaryMuscles: ['Mittlerer Rücken', 'Latissimus'],
    secondaryMuscles: ['Bizeps', 'Hintere Schulter'],
    frames: sl('seated-cable-row'),
    tips: [
      'Rumpf stabilisieren und Wirbelsäule in neutraler Position halten.',
      'Aus den Ellenbogen ziehen und am Endpunkt die Schulterblätter zusammenführen.',
      'Gewicht kontrolliert nach vorn lassen, ohne rund im unteren Rücken zu werden.',
    ],
  },
  {
    name: 'Langhantelrudern',
    primaryMuscles: ['Latissimus', 'Mittlerer Rücken (Rhomboiden, Trapez)'],
    secondaryMuscles: ['Unterer Rücken', 'Bizeps', 'Hintere Schulter'],
    frames: sl('bent-over-row'),
    tips: [
      'Oberkörper etwa 45 Grad vorbeugen, Rücken gerade und Core fest.',
      'Langhantel eng an den Oberschenkeln entlang zum unteren Bauch ziehen.',
      'Schulterblätter oben aktiv zusammenziehen und kontrolliert ablassen.',
    ],
  },
  {
    name: 'Kurzhantelrudern',
    primaryMuscles: ['Latissimus', 'Mittlerer Rücken'],
    secondaryMuscles: ['Bizeps', 'Hintere Schulter', 'Rumpf'],
    frames: sl('dumbbell-row'),
    tips: [
      'Mit einer Hand auf der Bank abstützen, Rücken parallel zum Boden ausrichten.',
      'Kurzhantel in einer Bogenbewegung Richtung Hüftgelenk ziehen.',
      'Schulter am unteren Punkt dehnen, aber den Rumpf nicht verdrehen.',
    ],
  },
  {
    name: 'T-Bar-Rudern',
    primaryMuscles: ['Mittlerer Rücken (Trapez, Rhomboiden)', 'Latissimus'],
    secondaryMuscles: ['Bizeps', 'Hintere Schulter', 'Unterer Rücken'],
    frames: sl('t-bar-row'),
    tips: [
      'Stabile Vorbeuge einnehmen, Brust raus und Blick schräg nach vorn.',
      'Griff kräftig Richtung Bauch/Brustbein ziehen und kurz halten.',
      'Beine und Hüfte bleiben fest – die Bewegung kommt nur aus dem Rücken.',
    ],
  },
  {
    name: 'Rudermaschine',
    primaryMuscles: ['Mittlerer Rücken', 'Latissimus'],
    secondaryMuscles: ['Bizeps', 'Hintere Schulter'],
    frames: sl('machine-row'),
    tips: [
      'Brustpolster so einstellen, dass die Arme fast gestreckt die Griffe erreichen.',
      'Brust fest am Polster lassen und Ellenbogen weit nach hinten ziehen.',
      'Schulterblätter in der Endposition für eine Sekunde zusammendrücken.',
    ],
  },
  {
    name: 'Lat-Überzüge',
    primaryMuscles: ['Latissimus (Breiter Rückenmuskel)'],
    secondaryMuscles: ['Trizeps (langer Kopf)', 'Untere Brust', 'Core'],
    frames: sl('straight-arm-pulldown'),
    tips: [
      'Leicht vorgebeugt stehen, Arme fast gestreckt (minimale Beugung im Ellenbogen).',
      'Stange oder Seil in einem weiten Bogen bis zu den Oberschenkeln herunterdrücken.',
      'Spannung im Lat halten und oben nur bis etwa Augenhöhe zurückführen.',
    ],
  },
  {
    name: 'Kreuzheben',
    primaryMuscles: ['Unterer Rücken', 'Beinbeuger (Hamstrings)', 'Gesäß (Gluteus)'],
    secondaryMuscles: ['Latissimus', 'Trapez', 'Quadrizeps', 'Griffkraft'],
    frames: sl('deadlift'),
    tips: [
      'Stange liegt mittig über dem Fuß, direkt an den Schienbeinen.',
      'Brust aufrichten, Lat anspannen und Rücken vollkommen gerade halten.',
      'Boden mit den Beinen wegdrücken und Hüfte oben sauber strecken (nicht überstrecken).',
    ],
  },
  {
    name: 'Rack Pulls',
    primaryMuscles: ['Oberer & unterer Rücken (Trapez, Rückenstrecker)'],
    secondaryMuscles: ['Gesäß', 'Beinbeuger', 'Griffkraft'],
    frames: sl('rack-pull'),
    tips: [
      'Sicherheitsablagen knapp unter oder auf Kniehöhe einstellen.',
      'Rumpf maximal anspannen und Stange eng am Oberschenkel hochziehen.',
      'Oben Schulterblätter stabil halten und Gewicht kontrolliert auf den Pins ablegen.',
    ],
  },

  // ============================================================================
  // 3. SCHULTERN
  // ============================================================================
  {
    name: 'Schulterdrücken',
    primaryMuscles: ['Vordere & seitliche Schulter (Deltoideus)'],
    secondaryMuscles: ['Trizeps', 'Oberer Trapez', 'Core'],
    frames: sl('shoulder-press'),
    tips: [
      'Bauch und Gesäß fest anspannen, um ein Hohlkreuz zu vermeiden.',
      'Stange dicht vor dem Gesicht senkrecht nach oben drücken.',
      'Oben den Kopf leicht nach vorn („durch das Fenster“) schieben und Arme strecken.',
    ],
  },
  {
    name: 'Schulterdrücken (Kurzhanteln)',
    primaryMuscles: ['Vordere & seitliche Schulter'],
    secondaryMuscles: ['Trizeps', 'Oberer Trapez'],
    frames: sl('dumbbell-shoulder-press'),
    tips: [
      'Aufrecht sitzen oder stehen, Unterarme senkrecht unter den Hanteln halten.',
      'Ellenbogen leicht nach vorn orientieren (Skapulaebene, ca. 30°).',
      'Hanteln über dem Kopf zusammenführen, ohne die Schultern zu den Ohren zu ziehen.',
    ],
  },
  {
    name: 'Arnold Press',
    primaryMuscles: ['Vordere & seitliche Schulter'],
    secondaryMuscles: ['Trizeps', 'Oberer Trapez'],
    frames: sl('arnold-press'),
    tips: [
      'Unten vor dem Kinn mit zu dir zeigenden Handflächen starten.',
      'Beim Hochdrücken die Hanteln fließend nach außen rotieren.',
      'Kontrolliert auf demselben Weg zurückdrehen.',
    ],
  },
  {
    name: 'Seitheben',
    primaryMuscles: ['Seitliche Schulter (Lateral deltoid)'],
    secondaryMuscles: ['Oberer Trapez', 'Vordere Schulter'],
    frames: sl('dumbbell-lateral-raise'),
    tips: [
      'Oberkörper minimal nach vorn neigen (ca. 10–15°), Schultern tief lassen.',
      'Arme leicht vor dem Körper (Skapulaebene) bis auf Schulterhöhe anheben.',
      'Ellenbogen führen die Bewegung an, ohne Schwung aus der Hüfte zu holen.',
    ],
  },
  {
    name: 'Seitheben am Kabelzug',
    primaryMuscles: ['Seitliche Schulter'],
    secondaryMuscles: ['Oberer Trapez', 'Supraspinatus'],
    frames: sl('cable-lateral-raise'),
    tips: [
      'Kabelrolle unten einstellen, um schon am Startpunkt volle Spannung zu haben.',
      'Arm mit minimaler Beugung im Ellenbogen seitlich bis auf Schulterhöhe führen.',
      'Langsam und kontrolliert wieder absenken.',
    ],
  },
  {
    name: 'Seitheben an der Maschine',
    primaryMuscles: ['Seitliche Schulter'],
    secondaryMuscles: ['Oberer Trapez'],
    frames: sl('machine-lateral-raise'),
    tips: [
      'Sitzhöhe so anpassen, dass das Schultergelenk auf Höhe der Drehachse liegt.',
      'Mit den Ellenbogen gegen die Polster drücken, nicht mit den Händen.',
      'Oben kurz halten und das Gewicht langsam ablassen.',
    ],
  },
  {
    name: 'Frontheben',
    primaryMuscles: ['Vordere Schulter (Anterior deltoid)'],
    secondaryMuscles: ['Obere Brust', 'Seitliche Schulter'],
    frames: sl('dumbbell-front-raise'),
    tips: [
      'Aufrechter Stand, Rumpf fest anspannen, kein Zurücklehnen.',
      'Gewicht mit fast gestreckten Armen kontrolliert bis auf Augenhöhe anheben.',
      'Langsam absenken, ohne dass die Hanteln unten gegen die Oberschenkel pendeln.',
    ],
  },
  {
    name: 'Reverse Butterfly',
    primaryMuscles: ['Hintere Schulter (Posterior deltoid)', 'Mittlerer Rücken'],
    secondaryMuscles: ['Rhomboiden', 'Mittlerer Trapez'],
    frames: sl('machine-reverse-fly'),
    tips: [
      'Sitz so einstellen, dass die Griffe auf Schulterhöhe liegen.',
      'Schultern tief halten und die Arme in einem weiten Bogen nach hinten führen.',
      'Aus der hinteren Schulter arbeiten, ohne die Schulterblätter krampfhaft hochzuziehen.',
    ],
  },
  {
    name: 'Facepulls',
    primaryMuscles: ['Hintere Schulter', 'Rotatorenmanschette', 'Mittlerer Trapez'],
    secondaryMuscles: ['Rhomboiden', 'Bizeps'],
    frames: sl('face-pull'),
    tips: [
      'Seil auf oberer Brust- oder Kopfhöhe einstellen.',
      'Seilenden Richtung Stirn ziehen und dabei die Hände nach außen/hinten rotieren.',
      'Am Endpunkt bilden Ober- und Unterarme eine Doppel-Bizeps-Pose.',
    ],
  },
  {
    name: 'Shrugs',
    primaryMuscles: ['Oberer Nacken (Trapezius pars descendens)'],
    secondaryMuscles: ['Unterarme / Griffkraft', 'Schulterblatt-Heber'],
    frames: sl('dumbbell-shrug'),
    tips: [
      'Arme vollkommen gestreckt lassen – sie dienen nur als Haken.',
      'Schultern geradlinig so weit wie möglich zu den Ohren hochziehen (nicht kreisen).',
      'Oben eine Sekunde fest anspannen und langsam in die Dehnung ablassen.',
    ],
  },

  // ============================================================================
  // 4. BIZEPS
  // ============================================================================
  {
    name: 'Bizepscurls (Kurzhanteln)',
    primaryMuscles: ['Bizeps (Biceps brachii)'],
    secondaryMuscles: ['Armbeuger (Brachialis)', 'Unterarme'],
    frames: sl('dumbbell-curl'),
    tips: [
      'Oberarme eng am Oberkörper fixieren, nicht aus der Schulter schwingen.',
      'Handflächen beim Beugen nach oben eindrehen (Supination).',
      'Unten die Arme vollständig strecken, bevor die nächste Wiederholung startet.',
    ],
  },
  {
    name: 'Langhantelcurls',
    primaryMuscles: ['Bizeps (Biceps brachii)'],
    secondaryMuscles: ['Brachialis', 'Unterarme'],
    frames: sl('barbell-curl'),
    tips: [
      'Schulterbreit im Untergriff greifen, Brust aufrecht und Bauch fest.',
      'Stange im Halbkreis nach oben führen, während die Ellenbogen am Platz bleiben.',
      'Kontrolliert ablassen, ohne den Oberkörper nach hinten zu werfen.',
    ],
  },
  {
    name: 'SZ-Curls',
    primaryMuscles: ['Bizeps', 'Brachialis'],
    secondaryMuscles: ['Unterarme (Brachioradialis)'],
    frames: sl('ez-bar-curl'),
    tips: [
      'Den abgewinkelten Griff der SZ-Stange nutzen, um die Handgelenke zu schonen.',
      'Ellenbogen seitlich am Rumpf verankern.',
      'Oben bewusst anspannen und über die volle Amplitude absenken.',
    ],
  },
  {
    name: 'Hammercurls',
    primaryMuscles: ['Armbeuger (Brachialis)', 'Oberarm-Speichenmuskel (Brachioradialis)'],
    secondaryMuscles: ['Bizeps'],
    frames: sl('hammer-curl'),
    tips: [
      'Neutraler Griff: Die Daumen zeigen während der gesamten Bewegung nach oben.',
      'Oberarme ruhig halten und Hanteln kontrolliert bis auf Schulterhöhe beugen.',
      'Langsam ablassen, um Unterarme und Brachialis optimal zu belasten.',
    ],
  },
  {
    name: 'Preacher Curls',
    primaryMuscles: ['Bizeps (besonders kurzer Kopf & unterer Anteil)'],
    secondaryMuscles: ['Brachialis', 'Unterarme'],
    frames: sl('preacher-curl'),
    tips: [
      'Oberarme vollständig und lückenlos auf dem Polster ablegen.',
      'Gewicht unten weit absenken, aber nicht ruckartig in die Überstreckung fallen lassen.',
      'Ohne Abheben der Ellenbogen sauber nach oben curlen.',
    ],
  },
  {
    name: 'Kabelcurls',
    primaryMuscles: ['Bizeps (konstante Spannung)'],
    secondaryMuscles: ['Brachialis', 'Unterarme'],
    frames: sl('cable-bicep-curl'),
    tips: [
      'Einen Schritt vom Kabelturm zurücktreten, damit das Gewicht nie absetzt.',
      'Ellenbogen fest an den Rippen lassen und den Griff zur Schulter ziehen.',
      'Die exzentrische Phase (Ablassen) bewusst bremsen.',
    ],
  },
  {
    name: 'Face Away Cable Curls',
    primaryMuscles: ['Bizeps (langer Kopf in voller Dehnung)'],
    secondaryMuscles: ['Brachialis', 'Unterarme'],
    frames: sl('one-arm-cable-bicep-curl'),
    tips: [
      'Mit dem Rücken zum unteren Kabelzug stellen, sodass der Arm leicht hinter dem Körper startet.',
      'Oberarm in dieser gedehnten Position hinter dem Rumpf fixiert halten.',
      'Sauber beugen, ohne den Ellenbogen nach vorn zu ziehen.',
    ],
  },
  {
    name: 'Konzentrationscurls',
    primaryMuscles: ['Bizeps (maximale Spitzenkontraktion)'],
    secondaryMuscles: ['Brachialis'],
    frames: sl('dumbbell-concentration-curl'),
    tips: [
      'Sitzend den Ellenbogen an der Innenseite des Oberschenkels abstützen.',
      'Hantel ohne jeglichen Schwung aus dem Oberkörper nach oben führen.',
      'Am höchsten Punkt den Bizeps für eine Sekunde fest anspannen.',
    ],
  },
  {
    name: 'Schrägbankcurls',
    primaryMuscles: ['Bizeps (langer Kopf)'],
    secondaryMuscles: ['Brachialis', 'Unterarme'],
    frames: sl('incline-dumbbell-curl'),
    tips: [
      'Auf einer 45–60° Schrägbank zurücklehnen, Arme frei nach unten hängen lassen.',
      'Ellenbogen zeigen senkrecht zum Boden und wandern beim Beugen nicht nach vorn.',
      'Volle Dehnung am unteren Punkt für maximalen Wachstumsreiz nutzen.',
    ],
  },

  // ============================================================================
  // 5. TRIZEPS
  // ============================================================================
  {
    name: 'Trizeps Extensions (nach unten)',
    primaryMuscles: ['Trizeps (seitlicher & medialer Kopf)'],
    secondaryMuscles: ['Unterarme'],
    frames: sl('tricep-pushdown'),
    tips: [
      'Oberkörper leicht vorbeugen, Ellenbogen fest an den Seiten fixieren.',
      'Nur die Unterarme bewegen und unten vollständig durchstrecken.',
      'Kontrolliert nach oben lassen, bis der Winkel im Ellenbogen knapp unter 90° liegt.',
    ],
  },
  {
    name: 'Trizepsdrücken über Kopf',
    primaryMuscles: ['Trizeps (besonders langer Kopf)'],
    secondaryMuscles: ['Core'],
    frames: sl('dumbbell-tricep-extension'),
    tips: [
      'Rumpf anspannen, damit der untere Rücken nicht ins Hohlkreuz fällt.',
      'Ellenbogen zeigen nach vorn/oben und weichen nicht weit zur Seite aus.',
      'Gewicht tief hinter den Kopf führen, um den langen Trizepskopf voll zu dehnen.',
    ],
  },
  {
    name: 'French Press',
    primaryMuscles: ['Trizeps (alle drei Köpfe)'],
    secondaryMuscles: ['Unterarme'],
    frames: sl('lying-tricep-extension'),
    tips: [
      'Auf der Flachbank liegen, Oberarme leicht nach hinten geneigt halten.',
      'SZ-Stange kontrolliert Richtung Stirn oder knapp hinter den Kopf absenken.',
      'Aus dem Ellenbogengelenk wieder strecken, Oberarme bleiben ruhig.',
    ],
  },
  {
    name: 'Skull Crushers',
    primaryMuscles: ['Trizeps (langer & seitlicher Kopf)'],
    secondaryMuscles: ['Unterarme'],
    frames: sl('lying-tricep-extension'),
    tips: [
      'Ellenbogen eng zusammenhalten und nicht zur Seite aufklappen lassen.',
      'Stange langsam Richtung Stirn/Haaransatz führen.',
      'Kraftvoll durchstrecken, ohne dass die Oberarme senkrecht einrasten.',
    ],
  },
  {
    name: 'Trizeps-Kickbacks',
    primaryMuscles: ['Trizeps (Spitzenkontraktion)'],
    secondaryMuscles: ['Hintere Schulter'],
    frames: sl('dumbbell-tricep-kickback'),
    tips: [
      'Oberkörper fast parallel zum Boden vorbeugen, Oberarm waagerecht am Rumpf fixieren.',
      'Unterarm nach hinten strecken, bis der Arm komplett gerade ist.',
      'Am oberen Punkt kurz halten und ohne Pendeln absenken.',
    ],
  },
  {
    name: 'Enges Bankdrücken',
    primaryMuscles: ['Trizeps'],
    secondaryMuscles: ['Brust', 'Vordere Schulter'],
    frames: sl('close-grip-bench-press'),
    tips: [
      'Etwa schulterbreit greifen (nicht zu eng, um die Handgelenke zu schonen).',
      'Ellenbogen beim Absenken eng am Oberkörper entlangführen.',
      'Stange auf der unteren Brust absetzen und explosiv hochdrücken.',
    ],
  },
  {
    name: 'Trizepsmaschine',
    primaryMuscles: ['Trizeps'],
    secondaryMuscles: ['Brust', 'Vordere Schulter'],
    frames: sl('machine-tricep-extension'),
    tips: [
      'Sitz fest einstellen und Rücken aufrecht am Polster halten.',
      'Griffe nach unten drücken, bis die Arme fast gestreckt sind.',
      'Schultern unten lassen und nicht mit dem Körpergewicht nachhelfen.',
    ],
  },
  {
    name: 'Trizepsdrücken am Kabelzug mit Seil',
    primaryMuscles: ['Trizeps (seitlicher Kopf)'],
    secondaryMuscles: ['Unterarme'],
    frames: sl('tricep-rope-pushdown'),
    tips: [
      'Ellenbogen eng am Körper halten.',
      'Unten die Seilenden aktiv auseinanderziehen, um den Trizeps voll zu kontrahieren.',
      'Langsam zurückführen, ohne dass die Schultern nach vorn kippen.',
    ],
  },
  {
    name: 'Trizepsdrücken am Kabelzug mit Stange',
    primaryMuscles: ['Trizeps'],
    secondaryMuscles: ['Unterarme'],
    frames: sl('tricep-pushdown'),
    tips: [
      'Stange im Obergriff fassen, Handgelenke gerade und stabil halten.',
      'Aus den Ellenbogen bis zur vollen Streckung nach unten drücken.',
      'Oberarme bewegen sich während des gesamten Satzes nicht.',
    ],
  },
  {
    name: 'Einarmiges Trizepsdrücken am Kabelzug',
    primaryMuscles: ['Trizeps'],
    secondaryMuscles: ['Rumpfstabilität'],
    frames: sl('cable-tricep-kickback'),
    tips: [
      'Oberarm dicht am Körper fixieren, für den Ausgleich beider Seiten einzeln trainieren.',
      'Arm bis zur vollen Streckung durchdrücken und kurz anspannen.',
      'Kontrolliert nach oben bremsen.',
    ],
  },
  {
    name: 'Trizepsstrecken über Kopf am Kabelzug',
    primaryMuscles: ['Trizeps (langer Kopf)'],
    secondaryMuscles: ['Core'],
    frames: sl('cable-overhead-tricep-extension'),
    tips: [
      'Mit dem Rücken zum Kabelturm im stabilen Ausfallschritt stehen.',
      'Ellenbogen neben dem Kopf fixieren und das Seil nach vorn/oben strecken.',
      'In der Rückbewegung die volle Dehnung hinter dem Kopf mitnehmen.',
    ],
  },

  // ============================================================================
  // 6. BEINE & GESÄSS
  // ============================================================================
  {
    name: 'Kniebeugen',
    primaryMuscles: ['Quadrizeps (Beinstrecker)', 'Gesäß (Gluteus maximus)'],
    secondaryMuscles: ['Beinbeuger', 'Unterer Rücken', 'Core'],
    frames: sl('squat'),
    tips: [
      'Schulterbreiter Stand, Fußspitzen leicht nach außen gedreht.',
      'Rumpf festmachen (tief in den Bauch atmen) und Hüfte nach unten setzen.',
      'Knie folgen der Richtung der Zehenspitzen, Fersen bleiben fest am Boden.',
    ],
  },
  {
    name: 'Frontkniebeugen',
    primaryMuscles: ['Quadrizeps (Vorderer Oberschenkel)'],
    secondaryMuscles: ['Gesäß', 'Oberer Rücken', 'Core'],
    frames: sl('front-squat'),
    tips: [
      'Stange auf den vorderen Schultern ablegen, Ellenbogen zeigen hoch nach vorn.',
      'Oberkörper möglichst aufrecht halten und tief in die Hocke gehen.',
      'Aus der Ferse und dem Mittelfuß druckvoll nach oben aufstehen.',
    ],
  },
  {
    name: 'Goblet Squats',
    primaryMuscles: ['Quadrizeps', 'Gesäß'],
    secondaryMuscles: ['Core', 'Oberer Rücken'],
    frames: sl('goblet-squat'),
    tips: [
      'Kurzhantel oder Kettlebell dicht vor der Brust halten.',
      'Brust stolz aufrichten und mit den Hüften zwischen die Knie absenken.',
      'Ellenbogen zeigen unten nach innen zwischen die Knie.',
    ],
  },
  {
    name: 'Hackenschmidt-Kniebeugen',
    primaryMuscles: ['Quadrizeps'],
    secondaryMuscles: ['Gesäß', 'Waden'],
    frames: sl('hack-squat'),
    tips: [
      'Rücken und Becken während der gesamten Übung fest gegen das Polster drücken.',
      'Füße schulterbreit auf die Plattform stellen und tief absenken.',
      'Oben die Knie nicht ruckartig durchschlagen.',
    ],
  },
  {
    name: 'Kniebeugen an der Multipresse',
    primaryMuscles: ['Quadrizeps', 'Gesäß'],
    secondaryMuscles: ['Beinbeuger'],
    frames: sl('smith-machine-squat'),
    tips: [
      'Füße leicht vor die Stangenlinie stellen, um Knie und Hüfte natürlich zu beugen.',
      'Rumpf anspannen und kontrolliert mindestens bis 90° Kniewinkel absenken.',
      'Sicherheitsstopper vor dem Satz auf die passende Tiefe einstellen.',
    ],
  },
  {
    name: 'Beinpresse',
    primaryMuscles: ['Quadrizeps', 'Gesäß'],
    secondaryMuscles: ['Beinbeuger', 'Waden'],
    frames: sl('sled-leg-press'),
    tips: [
      'Unterer Rücken und Gesäß bleiben fest im Sitz – nie vom Polster abheben!',
      'Plattform tief absenken, Knie zeigen in Richtung der Fußspitzen.',
      'Beine beim Hochdrücken nie komplett durchstrecken (leichte Beugung behalten).',
    ],
  },
  {
    name: 'Beinstrecker',
    primaryMuscles: ['Quadrizeps (isolierter Beinstrecker)'],
    secondaryMuscles: ['Kniegelenk-Stabilisatoren'],
    frames: sl('leg-extension'),
    tips: [
      'Rückenlehne so einstellen, dass die Kniekehle bündig am Sitzpolster anliegt.',
      'Beine kontrolliert bis zur vollen Streckung anheben und oben kurz halten.',
      'Hüfte mit den seitlichen Griffen fest im Sitz halten.',
    ],
  },
  {
    name: 'Beinbeuger',
    primaryMuscles: ['Beinbeuger (Hamstrings)'],
    secondaryMuscles: ['Waden (Gastrocnemius)'],
    frames: sl('lying-leg-curl'),
    tips: [
      'Hüfte fest auf das Polster drücken und kein Hohlkreuz beim Beugen machen.',
      'Rolle auf Höhe der Achillessehne einstellen und weit zum Gesäß ziehen.',
      'Langsam und kontrolliert wieder strecken.',
    ],
  },
  {
    name: 'Beinbeuger sitzend',
    primaryMuscles: ['Beinbeuger (Hamstrings in starker Vordehnung)'],
    secondaryMuscles: ['Waden'],
    frames: sl('seated-leg-curl'),
    tips: [
      'Oberschenkelpolster fest einstellen, damit die Beine beim Beugen nicht ausweichen.',
      'Fersen kraftvoll unter den Sitz ziehen und kurz halten.',
      'Oben die volle Dehnung der Oberschenkelrückseite nutzen.',
    ],
  },
  {
    name: 'Rumänisches Kreuzheben',
    primaryMuscles: ['Beinbeuger (Hamstrings)', 'Gesäß (Gluteus)'],
    secondaryMuscles: ['Unterer Rücken', 'Latissimus', 'Griffkraft'],
    frames: sl('romanian-deadlift'),
    tips: [
      'Knie leicht gebeugt lassen und Bewegung rein über das Zurückschieben der Hüfte einleiten.',
      'Stange eng an den Beinen entlang nach unten führen, solange der Rücken gerade bleibt.',
      'Sobald die Hüfte nicht weiter nach hinten geht, aus Po und Beinbeugern aufrichten.',
    ],
  },
  {
    name: 'Ausfallschritte (Kurzhanteln)',
    primaryMuscles: ['Quadrizeps', 'Gesäß'],
    secondaryMuscles: ['Beinbeuger', 'Waden', 'Gleichgewicht'],
    frames: sl('dumbbell-lunge'),
    tips: [
      'Großen Schritt machen, Oberkörper aufrecht und stabil halten.',
      'Hinteres Knie kontrolliert Richtung Boden senken, vorderes Knie bleibt stabil über dem Fuß.',
      'Kraftvoll aus der Ferse des vorderen Fußes wieder hochdrücken.',
    ],
  },
  {
    name: 'Bulgarian Split Squats',
    primaryMuscles: ['Quadrizeps', 'Gesäß (Gluteus maximus)'],
    secondaryMuscles: ['Beinbeuger', 'Hüftstabilisatoren'],
    frames: sl('bulgarian-split-squat'),
    tips: [
      'Hinteren Fuß auf einer Bank ablegen, Gewicht ruht zu 85 % auf dem vorderen Bein.',
      'Für mehr Po-Fokus Oberkörper leicht vorbeugen; für mehr Quadrizeps aufrecht bleiben.',
      'Tief absenken und ohne Wackeln des vorderen Knies hochdrücken.',
    ],
  },
  {
    name: 'Step-ups',
    primaryMuscles: ['Quadrizeps', 'Gesäß'],
    secondaryMuscles: ['Beinbeuger', 'Waden'],
    frames: sl('dumbbell-step-up'),
    tips: [
      'Ganzer Fuß steht fest auf der Box oder Bank.',
      'Aus der Kraft des oberen Beins hochdrücken – nicht mit dem unteren Fuß abstoßen.',
      'Ebenso kontrolliert wieder absteigen.',
    ],
  },
  {
    name: 'Hip Thrusts',
    primaryMuscles: ['Gesäß (Gluteus maximus)'],
    secondaryMuscles: ['Beinbeuger', 'Core'],
    frames: sl('hip-thrust'),
    tips: [
      'Obere Rückenpartie auf der Bankkante ablegen, Schienbeine oben senkrecht zum Boden.',
      'Blick nach vorn richten (Kinn leicht zur Brust), Rippen unten halten.',
      'Hüfte bis zur vollen Streckung anheben und das Gesäß oben kräftig anspannen.',
    ],
  },
  {
    name: 'Glute Kickbacks',
    primaryMuscles: ['Gesäß (Gluteus maximus)'],
    secondaryMuscles: ['Beinbeuger'],
    frames: sl('glute-kickback'),
    tips: [
      'Oberkörper leicht vorbeugen und Rumpf fest anspannen.',
      'Bein kontrolliert nach hinten oben führen, ohne ins Hohlkreuz zu kippen.',
      'Am höchsten Punkt den Po bewusst für eine Sekunde kontrahieren.',
    ],
  },
  {
    name: 'Abduktorenmaschine',
    primaryMuscles: ['Seitliches Gesäß (Gluteus medius & minimus)'],
    secondaryMuscles: ['Tensor fasciae latae'],
    frames: sl('hip-abduction'),
    tips: [
      'Becken ruhig im Sitz halten, optional leicht vorbeugen.',
      'Knie gegen den Widerstand weit nach außen drücken und kurz halten.',
      'Gewicht langsam zurückführen, ohne dass der Gewichtsblock aufschlägt.',
    ],
  },
  {
    name: 'Adduktorenmaschine',
    primaryMuscles: ['Innere Oberschenkel (Adduktoren)'],
    secondaryMuscles: ['Beckenboden'],
    frames: sl('hip-adduction'),
    tips: [
      'Ausgangsbreite schmerzfrei, aber mit leichter Dehnung wählen.',
      'Beine kontrolliert zusammenführen und innen kurz die Spannung halten.',
      'Rückbewegung langsam bremsen – nicht in die Dehnung zurückschnellen lassen.',
    ],
  },
  {
    name: 'Wadenheben stehend',
    primaryMuscles: ['Zwillingswadenmuskel (Gastrocnemius)'],
    secondaryMuscles: ['Schollenmuskel (Soleus)'],
    frames: sl('machine-calf-raise'),
    tips: [
      'Knie fast gestreckt lassen, damit der große Wadenmuskel voll arbeitet.',
      'Unten die Ferse tief absenken und 1 Sekunde in der Dehnung pausieren (kein Federn!).',
      'Maximale Höhe auf den Fußballen erreichen und oben kräftig anspannen.',
    ],
  },
  {
    name: 'Wadenheben sitzend',
    primaryMuscles: ['Schollenmuskel (Soleus)'],
    secondaryMuscles: ['Gastrocnemius'],
    frames: sl('seated-calf-raise'),
    tips: [
      'Durch die 90°-Beugung im Knie wird gezielt der tieferliegende Soleus trainiert.',
      'Volle Bewegung von tiefer Dehnung der Achillessehne bis zur Zehenspitze nutzen.',
      'Jede Wiederholung ruhig und ohne Wippen ausführen.',
    ],
  },

  // ============================================================================
  // 7. BAUCH & RUMPF
  // ============================================================================
  {
    name: 'Crunches am Kabelzug',
    primaryMuscles: ['Gerader Bauchmuskel (Rectus abdominis)'],
    secondaryMuscles: ['Schräge Bauchmuskeln'],
    frames: sl('cable-crunch'),
    tips: [
      'Vor dem Kabelturm knien, Seil neben dem Kopf festhalten.',
      'Hüfte starr lassen und die Wirbelsäule aktiv einrollen (Brustbein Richtung Becken).',
      'Nicht aus der Hüfte verbeugen, sondern wirklich den Bauch zusammenziehen.',
    ],
  },
  {
    name: 'Bauchmaschine',
    primaryMuscles: ['Gerader Bauchmuskel'],
    secondaryMuscles: ['Schräge Bauchmuskeln'],
    frames: sl('cable-crunch'),
    tips: [
      'Oberkörper einrollen statt mit den Armen am Griff zu reißen.',
      'Am untersten Punkt kurz ausatmen und den Bauch fest anspannen.',
      'Kontrolliert zurückgehen, bevor das Gewicht absetzt.',
    ],
  },
  {
    name: 'Russian Twists (mit Gewicht)',
    primaryMuscles: ['Schräge Bauchmuskeln (Obliques)'],
    secondaryMuscles: ['Gerader Bauchmuskel', 'Hüftbeuger'],
    frames: sl('russian-twist'),
    tips: [
      'Oberkörper im V-Sitz leicht zurücklehnen, Rücken gerade halten.',
      'Aus dem gesamten Brustkorb rotieren, nicht nur die Arme von links nach rechts bewegen.',
      'Blick folgt dem Gewicht auf jede Seite.',
    ],
  },
  {
    name: 'Pallof Press',
    primaryMuscles: ['Tiefe Rumpfmuskulatur (Anti-Rotation)', 'Schräge Bauchmuskeln'],
    secondaryMuscles: ['Schultern', 'Gesäß'],
    frames: sl('pallof-press'),
    tips: [
      'Seitlich zum Kabelzug auf Brusthöhe stehen, Füße schulterbreit.',
      'Griff vor die Brust nehmen und langsam gerade nach vorn wegdrücken.',
      'Dem seitlichen Zug des Kabels widerstehen – Hüfte und Schultern bleiben exakt gerade.',
    ],
  },
  {
    name: 'Woodchoppers',
    primaryMuscles: ['Schräge Bauchmuskeln (Obliques)', 'Core'],
    secondaryMuscles: ['Schultern', 'Hüfte'],
    frames: sl('cable-woodchopper'),
    tips: [
      'Mit fast gestreckten Armen das Kabel diagonal über den Körper führen.',
      'Kraft kommt aus der Rumpfrotation und Hüfte, nicht aus den Armen.',
      'Rückweg kontrolliert gegen den Zug abbremsen.',
    ],
  },

  // ============================================================================
  // 8. CALISTHENICS & KÖRPERGEWICHT (+ GEWICHTSHILFE / ZUSATZGEWICHT)
  // ============================================================================
  {
    name: 'Klimmzüge',
    primaryMuscles: ['Latissimus (Breiter Rückenmuskel)'],
    secondaryMuscles: ['Bizeps', 'Mittlerer Rücken', 'Core'],
    frames: sl('pull-ups'),
    tips: [
      'Aus dem vollen Aushang starten und zuerst die Schulterblätter nach unten ziehen.',
      'Brust stolz zur Stange ziehen, Ellenbogen führen nach unten.',
      'Kontrolliert ablassen, ohne zu schaukeln.',
    ],
  },
  {
    name: 'Klimmzüge (Körpergewicht)',
    primaryMuscles: ['Latissimus (Breiter Rückenmuskel)'],
    secondaryMuscles: ['Bizeps', 'Mittlerer Rücken', 'Core'],
    frames: sl('pull-ups'),
    tips: [
      'Beine kreuzen oder geschlossen vor dem Körper anspannen (Hollow-Position).',
      'Bis mit dem Kinn über die Stange ziehen, ohne den Kopf in den Nacken zu werfen.',
      'Unten die Arme sauber strecken.',
    ],
  },
  {
    name: 'Klimmzüge mit Gewichtshilfe',
    primaryMuscles: ['Latissimus (Breiter Rückenmuskel)'],
    secondaryMuscles: ['Bizeps', 'Mittlerer Rücken'],
    frames: sl('pull-ups'),
    tips: [
      'Je weniger Hilfsgewicht eingestellt ist, desto schwerer und intensiver wird die Übung.',
      'Knie oder Füße mittig auf das Polster setzen und Rumpf aufrecht halten.',
      'Saubere Technik über den vollen Bewegungsumfang vor Gewichtsreduktion.',
    ],
  },
  {
    name: 'Klimmzüge mit Zusatzgewicht',
    primaryMuscles: ['Latissimus (Breiter Rückenmuskel)'],
    secondaryMuscles: ['Bizeps', 'Mittlerer Rücken', 'Griffkraft'],
    frames: sl('pull-ups'),
    tips: [
      'Dip-Gürtel oder Gewichtsweste eng fixieren, damit das Gewicht nicht pendelt.',
      'Schulterblätter aktivieren, bevor die Armbeugung einsetzt.',
      'Unten kontrolliert abfangen und Gelenke unter Spannung halten.',
    ],
  },
  {
    name: 'Chin-ups',
    primaryMuscles: ['Latissimus', 'Bizeps (Biceps brachii)'],
    secondaryMuscles: ['Mittlerer Rücken', 'Core'],
    frames: sl('chin-ups'),
    tips: [
      'Schulterbreiter Untergriff (Handflächen zeigen zu dir).',
      'Ellenbogen eng vor dem Körper nach unten ziehen.',
      'Volle Streckung unten und Kinn klar über die Stange oben.',
    ],
  },
  {
    name: 'Muscle-ups',
    primaryMuscles: ['Latissimus', 'Brust', 'Trizeps'],
    secondaryMuscles: ['Schultern', 'Bizeps', 'Core'],
    frames: sl('muscle-ups'),
    tips: [
      'Starken, leicht bogenförmigen Zug (C-Kurve) bis zur unteren Brust aufbauen.',
      'Am höchsten Punkt Oberkörper explosiv über die Stange kippen (Transition).',
      'Oben aus dem Stütz sauber durchdrücken.',
    ],
  },
  {
    name: 'Pike Push-ups',
    primaryMuscles: ['Vordere & seitliche Schulter'],
    secondaryMuscles: ['Trizeps', 'Obere Brust'],
    frames: sl('pike-push-up'),
    tips: [
      'Hüfte hoch in ein umgekehrtes „V“ schieben, Beine und Rücken möglichst gerade.',
      'Kopf wandert beim Absenken nach vorn zwischen die Hände (Dreieck bilden).',
      'Aus den Schultern wieder zurück in die Ausgangsposition drücken.',
    ],
  },
  {
    name: 'Pistol Squats',
    primaryMuscles: ['Quadrizeps', 'Gesäß (einbeinig)'],
    secondaryMuscles: ['Beinbeuger', 'Waden', 'Core & Balance'],
    frames: sl('pistol-squat'),
    tips: [
      'Freies Bein gestreckt nach vorn halten, Arme als Gegengewicht vorstrecken.',
      'Auf dem ganzen Standfuß bleiben und kontrolliert tief in die Hocke gehen.',
      'Knie des Standbeins stabil in Richtung Fußspitze führen.',
    ],
  },
  {
    name: 'Liegestütze',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Trizeps', 'Vordere Schulter', 'Core'],
    frames: sl('push-ups'),
    tips: [
      'Körper bildet von Kopf bis Ferse eine schnurgerade Linie (Po und Bauch fest).',
      'Hände etwa schulterbreit, Ellenbogen im 45°-Winkel nach hinten führen.',
      'Brust fast bis zum Boden senken und komplett hochdrücken.',
    ],
  },
  {
    name: 'Dips',
    primaryMuscles: ['Untere Brust', 'Trizeps'],
    secondaryMuscles: ['Vordere Schulter'],
    frames: sl('dips'),
    tips: [
      'Leichte Vorneigung für mehr Brustfokus, aufrechter Oberkörper für mehr Trizeps.',
      'Schultern unten halten (weg von den Ohren) und bis ca. 90° Ellenbogenwinkel absenken.',
      'Kraftvoll in den vollen Stütz nach oben drücken.',
    ],
  },
  {
    name: 'Dips mit Gewichtshilfe',
    primaryMuscles: ['Brust', 'Trizeps'],
    secondaryMuscles: ['Vordere Schulter'],
    frames: sl('dips'),
    tips: [
      'Weniger eingestellte Gewichtshilfe bedeutet mehr eigenes Körpergewicht und Fortschritt.',
      'Schulterblätter tief halten und kontrolliert absenken.',
      'Oben die Arme strecken, ohne die Schultern hochzuziehen.',
    ],
  },
  {
    name: 'Dips mit Zusatzgewicht',
    primaryMuscles: ['Brust', 'Trizeps'],
    secondaryMuscles: ['Vordere Schulter', 'Core'],
    frames: sl('dips'),
    tips: [
      'Zusatzgewicht ruhig zwischen den Beinen halten, kein Pendeln.',
      'Kontrolliert bis knapp unter 90 Grad im Ellenbogen absenken.',
      'Explosiv in den Stütz hochdrücken.',
    ],
  },
  {
    name: 'Kniebeugen (Körpergewicht)',
    primaryMuscles: ['Quadrizeps', 'Gesäß'],
    secondaryMuscles: ['Beinbeuger', 'Core'],
    frames: sl('bodyweight-squat'),
    tips: [
      'Schulterbreiter Stand, Brust aufrecht und Blick geradeaus.',
      'Hüfte unter Kniehöhe absenken, während die Fersen fest am Boden bleiben.',
      'Oben Hüfte und Knie vollständig strecken.',
    ],
  },
  {
    name: 'Ausfallschritte (Körpergewicht)',
    primaryMuscles: ['Quadrizeps', 'Gesäß'],
    secondaryMuscles: ['Beinbeuger', 'Balance'],
    frames: sl('lunge'),
    tips: [
      'Kontrollierten Schritt nach vorn oder hinten setzen, Oberkörper bleibt aufrecht.',
      'Beide Knie beugen sich im unteren Punkt auf etwa 90 Grad.',
      'Über das vorderere Bein kraftvoll zurück in den Stand drücken.',
    ],
  },
  {
    name: 'Crunches',
    primaryMuscles: ['Gerader Bauchmuskel (Rectus abdominis)'],
    secondaryMuscles: ['Schräge Bauchmuskeln'],
    frames: sl('crunches'),
    tips: [
      'Unterer Rücken bleibt fest auf der Matte, Füße aufgestellt.',
      'Schulterblätter durch Bauchspannung vom Boden abheben – nicht am Nacken ziehen!',
      'Oben kurz ausatmen und halten, dann langsam ablegen.',
    ],
  },
  {
    name: 'Situps (Schrägbank)',
    primaryMuscles: ['Gerader Bauchmuskel', 'Hüftbeuger'],
    secondaryMuscles: ['Schräge Bauchmuskeln'],
    frames: sl('decline-sit-up'),
    tips: [
      'Füße sicher einhaken und Hände vor der Brust oder leicht an den Schläfen halten.',
      'Wirbel für Wirbel aufrollen und beim Zurückgehen die Spannung im Bauch behalten.',
      'Unten kurz vor dem völligen Ablegen die nächste Wiederholung starten.',
    ],
  },
  {
    name: 'Beinheben hängend',
    primaryMuscles: ['Unterer Bauch (Rectus abdominis)', 'Hüftbeuger'],
    secondaryMuscles: ['Griffkraft', 'Latissimus (isometrisch)'],
    frames: sl('hanging-leg-raise'),
    tips: [
      'Ruhig an der Stange hängen, ohne Schwung aus dem Rücken zu holen.',
      'Becken aktiv nach oben einrollen (Steißbein anheben), nicht nur die Beine schwingen.',
      'Beine langsam und kontrolliert wieder ablassen.',
    ],
  },
  {
    name: 'Beinheben liegend',
    primaryMuscles: ['Gerader Bauchmuskel (unterer Anteil)', 'Hüftbeuger'],
    secondaryMuscles: ['Tiefe Rumpfmuskulatur'],
    frames: sl('lying-leg-raise'),
    tips: [
      'Unteren Rücken fest gegen den Boden drücken (kein Hohlkreuz zulassen!).',
      'Gestreckte oder leicht gebeugte Beine bis zur Senkrechten anheben.',
      'Langsam absenken und kurz über dem Boden halten.',
    ],
  },
  {
    name: 'Hyperextensions',
    primaryMuscles: ['Unterer Rücken (Erector spinae)', 'Gesäß', 'Beinbeuger'],
    secondaryMuscles: ['Core'],
    frames: sl('back-extension'),
    tips: [
      'Polster knapp unterhalb des Hüftknochens einstellen, damit das Becken frei kippen kann.',
      'Mit geradem Rücken aus der Hüfte vorbeugen.',
      'Aus Gesäß und unterem Rücken bis in eine gerade Körperlinie aufrichten (nicht überstrecken).',
    ],
  },
  {
    name: 'Glute Bridge',
    primaryMuscles: ['Gesäß (Gluteus maximus)'],
    secondaryMuscles: ['Beinbeuger', 'Core'],
    frames: sl('glute-bridge'),
    tips: [
      'Fersen nah am Gesäß aufstellen, Bauch leicht anspannen.',
      'Hüfte weit nach oben schieben, bis Knie, Hüfte und Schultern eine Linie bilden.',
      'Oben das Gesäß für 1–2 Sekunden fest zusammenkneifen.',
    ],
  },
  {
    name: 'Burpees',
    primaryMuscles: ['Ganzkörper (Beine, Brust, Schultern, Core)'],
    secondaryMuscles: ['Herz-Kreislauf-System', 'Trizeps'],
    frames: sl('burpees'),
    tips: [
      'Hände aufsetzen, in eine stabile Liegestütz-Position springen (Rumpf fest, kein Durchhängen).',
      'Brust zum Boden bringen, hochdrücken und Füße wieder unter die Hüfte ziehen.',
      'Mit gestrecktem Körper und Händen über dem Kopf nach oben abspringen.',
    ],
  },
  {
    name: 'Mountain Climbers',
    primaryMuscles: ['Core (Bauch & Hüftbeuger)'],
    secondaryMuscles: ['Schultern', 'Quadrizeps', 'Herz-Kreislauf'],
    frames: sl('mountain-climbers'),
    tips: [
      'Hände direkt unter den Schultern platzieren, Körper bleibt in einer flachen Plank-Linie.',
      'Knie abwechselnd zügig Richtung Brust ziehen.',
      'Hüfte tief und ruhig halten – nicht nach oben wippen.',
    ],
  },
  {
    name: 'Rudern am Schlingentrainer',
    primaryMuscles: ['Mittlerer Rücken', 'Latissimus'],
    secondaryMuscles: ['Bizeps', 'Hintere Schulter', 'Core'],
    frames: sl('inverted-row'),
    tips: [
      'Körper von den Fersen bis zum Kopf steif wie ein Brett halten.',
      'Brust bis zu den Griffen hochziehen und Schulterblätter hinten zusammenführen.',
      'Je tiefer/waagerechter du unter dem Ankerpunkt stehst, desto schwerer wird die Übung.',
    ],
  },

  // ============================================================================
  // 9. FUNKTIONELLES TRAINING
  // ============================================================================
  {
    name: 'Kettlebell Swings',
    primaryMuscles: ['Gesäß (Gluteus)', 'Beinbeuger (Hamstrings)'],
    secondaryMuscles: ['Unterer Rücken', 'Core', 'Schultern'],
    frames: sl('kettlebell-swing'),
    tips: [
      'Ein Swing ist ein explosiver Hüftstoß (Hip Hinge), keine Kniebeuge!',
      'Arme bleiben locker wie Seile – der Schwung kommt zu 100 % aus der Hüftstreckung.',
      'Oben auf Brusthöhe Bauch, Po und Oberschenkel wie im Plank festmachen.',
    ],
  },
  {
    name: 'Kettlebell Complex',
    primaryMuscles: ['Ganzkörper (Beine, Gesäß, Rücken, Schultern, Core)'],
    secondaryMuscles: ['Griffkraft', 'Herz-Kreislauf'],
    frames: sl('kettlebell-clean'),
    tips: [
      'Bewegungen (z. B. Clean, Squat, Press) flüssig aus der Hüfte miteinander verbinden.',
      'Kettlebell beim Umsetzen eng am Körper führen, damit sie nicht aufs Handgelenk schlägt.',
      'Rumpf bei jeder Wiederholung unter stabiler Grundspannung halten.',
    ],
  },
  {
    name: 'Kettlebell Clean',
    primaryMuscles: ['Gesäß & Beinbeuger', 'Oberer Rücken'],
    secondaryMuscles: ['Bizeps', 'Core', 'Griffkraft'],
    frames: sl('kettlebell-clean'),
    tips: [
      'Kettlebell aus dem Hüftschwung eng am Körper nach oben ziehen („Reißverschluss öffnen“).',
      'Hand geschmeidig um die Kugel führen, statt sie überschlagen zu lassen.',
      'Im Rack-Stand liegt die Kugel stabil im Dreieck aus Unterarm und Oberarm an der Brust.',
    ],
  },
  {
    name: 'Kettlebell Press',
    primaryMuscles: ['Schulter (Deltoideus)', 'Trizeps'],
    secondaryMuscles: ['Core', 'Oberer Rücken', 'Stabilisatoren'],
    frames: sl('kettlebell-press'),
    tips: [
      'Aus einer sauberen Rack-Position mit fest angespanntem Bauch und Gesäß starten.',
      'Kugel senkrecht über Kopf drücken, bis der Arm neben dem Ohr gestreckt ist.',
      'Kontrolliert wieder in die Rack-Position auf Brusthöhe zurückführen.',
    ],
  },
  {
    name: 'Thrusters',
    primaryMuscles: ['Quadrizeps', 'Gesäß', 'Schultern'],
    secondaryMuscles: ['Trizeps', 'Core', 'Herz-Kreislauf'],
    frames: sl('thruster'),
    tips: [
      'Hantel auf den vorderen Schultern halten und eine tiefe Frontkniebeuge ausführen.',
      'Den Aufwärtsschwung aus den Beinen nahtlos nutzen, um das Gewicht über Kopf zu drücken.',
      'Oben Arme und Hüfte vollständig strecken, bevor die nächste Wiederholung beginnt.',
    ],
  },
  {
    name: 'Medizinball-Slams',
    primaryMuscles: ['Latissimus', 'Bauch & Core', 'Schultern'],
    secondaryMuscles: ['Trizeps', 'Gesäß', 'Herz-Kreislauf'],
    frames: sl('kettlebell-swing'),
    tips: [
      'Ball über den Kopf heben und den gesamten Körper bis in die Zehenspitzen strecken.',
      'Mit maximaler Rumpf- und Lat-Spannung den Ball vor den Füßen auf den Boden schmettern.',
      'Aus der Hocke mit geradem Rücken wieder aufnehmen.',
    ],
  },

  // ============================================================================
  // 10. AUSDAUER & HALTEÜBUNGEN
  // ============================================================================
  {
    name: 'Plank',
    primaryMuscles: ['Gerader & tiefer Bauchmuskel (Transversus abdominis)'],
    secondaryMuscles: ['Schultern', 'Gesäß', 'Quadrizeps'],
    frames: sl('plank'),
    tips: [
      'Ellenbogen senkrecht unter den Schultern platzieren.',
      'Bauch und Gesäß fest anspannen – kein Durchhängen im unteren Rücken!',
      'Ruhig weiteratmen, während der Körper eine gerade Linie hält.',
    ],
  },
  {
    name: 'Side Plank',
    primaryMuscles: ['Schräge Bauchmuskeln (Obliques)', 'Seitlicher Rumpf'],
    secondaryMuscles: ['Seitliches Gesäß (Gluteus medius)', 'Schulter'],
    frames: slHold('side-plank'),
    tips: [
      'Stützellenbogen direkt unter der Schulter positionieren.',
      'Hüfte aktiv vom Boden wegdrücken, sodass Kopf, Hüfte und Füße eine Linie bilden.',
      'Beide Seiten gleich lang trainieren.',
    ],
  },
  {
    name: 'Hollow Hold',
    primaryMuscles: ['Tiefe & gerade Bauchmuskulatur (Core)'],
    secondaryMuscles: ['Hüftbeuger', 'Quadrizeps'],
    frames: svgFrames('hollow'),
    tips: [
      'Das Wichtigste: Der untere Rücken muss lückenlos auf den Boden gepresst bleiben!',
      'Schulterblätter und gestreckte Beine leicht vom Boden abheben (Schiffchen-Form).',
      'Falls sich der Rücken löst, Beine höher nehmen oder Knie leicht anwinkeln.',
    ],
  },
  {
    name: 'Handstand halten',
    primaryMuscles: ['Schultern (Deltoideus)', 'Oberer Trapez', 'Core'],
    secondaryMuscles: ['Trizeps', 'Unterarme & Handgelenke'],
    frames: svgFrames('handstand'),
    tips: [
      'Hände schulterbreit aufsetzen, Finger spreizen und aktiv in den Boden krallen.',
      'Aus den Schultern maximal herausdrücken (Ohren zwischen den Oberarmen verstecken).',
      'Rippen reinziehen und Gesäß anspannen, um eine Bananenform zu vermeiden.',
    ],
  },
  {
    name: 'L-Sit',
    primaryMuscles: ['Bauchmuskulatur', 'Hüftbeuger', 'Trizeps'],
    secondaryMuscles: ['Quadrizeps', 'Schulterblatt-Senker'],
    frames: slHold('l-sit'),
    tips: [
      'Aus den Schultern kräftig nach unten drücken (langer Hals, kein Einsinken).',
      'Beine gestreckt im 90°-Winkel vor dem Körper anheben.',
      'Einsteiger können zunächst ein Bein oder beide Knie angewinkelt halten (Tuck L-Sit).',
    ],
  },
  {
    name: 'Wandsitzen',
    primaryMuscles: ['Quadrizeps (isometrisch)'],
    secondaryMuscles: ['Gesäß', 'Waden'],
    frames: svgFrames('wallsit'),
    tips: [
      'Rücken flach an die Wand lehnen, Oberschenkel parallel zum Boden (90° im Knie).',
      'Füße schulterbreit, Schienbeine senkrecht zum Boden.',
      'Hände locker lassen – nicht auf den Oberschenkeln abstützen!',
    ],
  },
  {
    name: 'Farmer’s Walk',
    primaryMuscles: ['Unterarme & Griffkraft', 'Trapez (Nacken)', 'Core'],
    secondaryMuscles: ['Gesäß', 'Beine', 'Schultern'],
    frames: sl('farmers-walk'),
    tips: [
      'Schwere Hanteln seitlich aufnehmen, Brust stolz aufrichten und Schultern zurücknehmen.',
      'Mit kurzen, kontrollierten und zügigen Schritten geradeaus gehen.',
      'Rumpf steif halten – die Gewichte dürfen dich nicht zur Seite neigen.',
    ],
  },
  {
    name: 'Schlitten schieben',
    primaryMuscles: ['Quadrizeps', 'Gesäß', 'Waden'],
    secondaryMuscles: ['Core', 'Schultern', 'Herz-Kreislauf'],
    frames: svgFrames('sled'),
    tips: [
      'Oberkörper im 45°-Winkel nach vorn lehnen, Rumpf und Arme stabil halten.',
      'Kraftvolle, gleichmäßige Schritte aus Fußballen und Hüfte drücken.',
      'Hüfte nicht hochklappen lassen – eine gerade Kraftlinie von Fuß bis Hand halten.',
    ],
  },
  {
    name: 'Mobilität & Dehnen',
    primaryMuscles: ['Gelenkbeweglichkeit (Hüfte, Brustwirbelsäule, Schultern)'],
    secondaryMuscles: ['Rumpf', 'Beinrückseite'],
    frames: svgFrames('deepstretch'),
    tips: [
      'Jede Dehnposition ruhig und schmerzfrei für 30–60 Sekunden halten.',
      'Tief durch die Nase ein- und lang durch den Mund ausatmen, um den Muskeltonus zu senken.',
      'Kontrolliert durch den vollen Bewegungsradius arbeiten, ohne ruckartig zu wippen.',
    ],
  },

  // ============================================================================
  // 11. CARDIO & AUSDAUER
  // ============================================================================
  {
    name: 'Joggen',
    primaryMuscles: ['Herz-Kreislauf-System', 'Quadrizeps', 'Waden'],
    secondaryMuscles: ['Beinbeuger', 'Gesäß', 'Core'],
    frames: svgFrames('run'),
    tips: [
      'Aufrechte Körperhaltung mit leichtem Vorwärtsdrang aus den Sprunggelenken.',
      'Schultern locker hängen lassen, Arme schwingen entspannt im 90°-Winkel mit.',
      'Mit einer höheren Schrittfrequenz (kurze Schritte unter dem Körperschwerpunkt) landen.',
    ],
  },
  {
    name: 'Laufen (Outdoor)',
    primaryMuscles: ['Herz-Kreislauf-System', 'Beinmuskulatur (Quads, Waden)'],
    secondaryMuscles: ['Gesäß', 'Beinbeuger', 'Core'],
    frames: svgFrames('run'),
    tips: [
      'Gleichmäßiges Tempo wählen, bei Grundlagenausdauer solltest du noch ganze Sätze sprechen können.',
      'Fuß unter dem Körperschwerpunkt aufsetzen statt weit vor dem Körper zu bremsen.',
      'Blick 10–15 Meter nach vorn richten, Nacken entspannt halten.',
    ],
  },
  {
    name: 'Gehen / Walking',
    primaryMuscles: ['Herz-Kreislauf-System', 'Waden', 'Gesäß'],
    secondaryMuscles: ['Quadrizeps', 'Beinbeuger'],
    frames: svgFrames('walk'),
    tips: [
      'Zügiger Schritt mit aktivem Abrollen über Ferse bis Zehenspitzen.',
      'Brustkorb öffnen und Arme aktiv gegengleich mitschwingen lassen.',
      'Ideal für gelenkschonende Grundlagenausdauer und aktive Regeneration.',
    ],
  },
  {
    name: 'Wandern',
    primaryMuscles: ['Quadrizeps', 'Gesäß', 'Waden'],
    secondaryMuscles: ['Herz-Kreislauf-System', 'Core', 'Fußgelenke'],
    frames: svgFrames('walk'),
    tips: [
      'Bergauf kleinere Schritte wählen, um Puls und Oberschenkel ökonomisch zu belasten.',
      'Bergab Knie leicht gebeugt halten, um Stöße in der Muskulatur abzufedern.',
      'Gleichmäßigen Atem- und Schrittrhythmus beibehalten.',
    ],
  },
  {
    name: 'Nordic Walking',
    primaryMuscles: ['Herz-Kreislauf-System', 'Beine', 'Oberkörper (Latissimus, Trizeps)'],
    secondaryMuscles: ['Schultern', 'Gesäß', 'Core'],
    frames: svgFrames('walk'),
    tips: [
      'Stöcke schräg nach hinten einsetzen – der Stockeinsatz erfolgt unter dem Körperschwerpunkt.',
      'Diagonale Koordination: rechter Arm schwingt mit dem linken Bein nach vorn.',
      'Hinter dem Körper die Hand an der Schlaufe kurz öffnen und kräftig abdrücken.',
    ],
  },
  {
    name: 'Inlineskaten',
    primaryMuscles: ['Quadrizeps', 'Seitliches & großes Gesäß (Gluteus)'],
    secondaryMuscles: ['Adduktoren', 'Unterer Rücken', 'Balance'],
    frames: svgFrames('run'),
    tips: [
      'Grundposition: Knie und Sprunggelenke leicht gebeugt, Schwerpunkt tief halten.',
      'Kraftvoll seitlich über die gesamte Schiene abdrücken und auf dem Gleitbein balancieren.',
      'Rumpf stabilisieren und Blick weit vorausschauend halten.',
    ],
  },
  {
    name: 'Radfahren (Outdoor)',
    primaryMuscles: ['Quadrizeps', 'Gesäß', 'Herz-Kreislauf-System'],
    secondaryMuscles: ['Beinbeuger', 'Waden', 'Core'],
    frames: svgFrames('bike'),
    tips: [
      'Sattelhöhe so einstellen, dass das Knie am untersten Punkt noch leicht gebeugt bleibt.',
      'Eine flüssige Trittfrequenz (ca. 80–90 U/min) schont die Kniegelenke.',
      'Schultern tief lassen und Ellenbogen leicht gebeugt halten, um Stöße abzufedern.',
    ],
  },
  {
    name: 'Fahrrad fahren',
    primaryMuscles: ['Quadrizeps', 'Gesäß', 'Herz-Kreislauf-System'],
    secondaryMuscles: ['Waden', 'Beinbeuger'],
    frames: svgFrames('bike'),
    tips: [
      'Auf korrekte Sattelhöhe achten, damit die Hüfte beim Treten nicht seitlich abkippt.',
      'Runden Tritt mit gleichmäßigem Druck über die Fußballen ausführen.',
      'Oberkörper entspannt halten.',
    ],
  },
  {
    name: 'Laufband',
    primaryMuscles: ['Herz-Kreislauf-System', 'Quadrizeps', 'Waden'],
    secondaryMuscles: ['Gesäß', 'Beinbeuger', 'Core'],
    frames: svgFrames('run'),
    tips: [
      '1 % Steigung gleicht den fehlenden Luftwiderstand im Vergleich zum Outdoor-Laufen aus.',
      'Mittig auf dem Band laufen und nicht am Display oder den Griffen festhalten.',
      'Kurze, federnde Schritte wählen.',
    ],
  },
  {
    name: 'Fahrradergometer',
    primaryMuscles: ['Quadrizeps', 'Herz-Kreislauf-System'],
    secondaryMuscles: ['Gesäß', 'Waden', 'Beinbeuger'],
    frames: svgFrames('bike'),
    tips: [
      'Sattel auf Hüfthöhe einstellen, sodass das Bein unten fast (aber nicht ganz) gestreckt ist.',
      'Knie bewegen sich beim Treten geradlinig nach vorn, ohne nach außen zu weichen.',
      'Konstante Trittfrequenz halten und Widerstand passend zum Trainingsziel wählen.',
    ],
  },
  {
    name: 'Liegeergometer',
    primaryMuscles: ['Quadrizeps', 'Gesäß (gelenk- & rückenschonend)'],
    secondaryMuscles: ['Beinbeuger', 'Herz-Kreislauf-System'],
    frames: svgFrames('bike'),
    tips: [
      'Sitzabstand so wählen, dass die Knie in der vordersten Pedalstellung leicht gebeugt bleiben.',
      'Unteren Rücken entspannt gegen die breite Rückenlehne stützen.',
      'Gleichmäßig über die Fußballen treten.',
    ],
  },
  {
    name: 'Spinning-Bike',
    primaryMuscles: ['Quadrizeps', 'Gesäß', 'Waden'],
    secondaryMuscles: ['Beinbeuger', 'Core', 'Herz-Kreislauf-System'],
    frames: svgFrames('bike'),
    tips: [
      'Nie ohne Grundwiderstand mit extrem hoher Drehzahl treten, um die Gelenke zu schützen.',
      'Im Wiegetritt das Gesäß über dem Sattel halten und den Rumpf stabilisieren.',
      'Schultern locker und Handgelenke gerade am Lenker lassen.',
    ],
  },
  {
    name: 'Crosstrainer',
    primaryMuscles: ['Herz-Kreislauf-System', 'Beine & Gesäß'],
    secondaryMuscles: ['Oberkörper (Brust, Rücken, Schultern)', 'Core'],
    frames: svgFrames('stairs'),
    tips: [
      'Ganze Fußsohle auf den Trittflächen lassen, damit die Fersen nicht abheben.',
      'Aufrecht stehen und aktiv mit den Armstangen ziehen und drücken.',
      'Hüfte ruhig halten und nicht am festen Mittelgriff abstützen.',
    ],
  },
  {
    name: 'Ruderergometer',
    primaryMuscles: ['Beine (Quadrizeps)', 'Rücken (Latissimus, Trapez)', 'Herz-Kreislauf'],
    secondaryMuscles: ['Gesäß', 'Bizeps', 'Core'],
    frames: svgFrames('row'),
    tips: [
      'Zug-Reihenfolge: 1. Beine strecken → 2. Oberkörper zurücklehnen → 3. Arme zum unteren Rippenbogen ziehen.',
      'Rückweg genau umgekehrt: 1. Arme strecken → 2. Oberkörper vor → 3. Beine beugen.',
      'Etwa 60 % der Kraft kommen aus dem Beinabdruck, nicht nur aus den Armen!',
    ],
  },
  {
    name: 'Stairmaster',
    primaryMuscles: ['Gesäß (Gluteus)', 'Quadrizeps', 'Waden'],
    secondaryMuscles: ['Beinbeuger', 'Herz-Kreislauf-System'],
    frames: svgFrames('stairs'),
    tips: [
      'Aufrecht gehen und NICHT mit den Unterarmen auf der Konsole abstützen!',
      'Den ganzen Fuß auf die Stufe setzen und über die Ferse hochdrücken.',
      'Gleichmäßige, ruhige Trittgeschwindigkeit wählen.',
    ],
  },
  {
    name: 'Air Bike',
    primaryMuscles: ['Ganzkörper-Ausdauer (Beine, Brust, Rücken, Schultern)'],
    secondaryMuscles: ['Trizeps', 'Bizeps', 'Core'],
    frames: svgFrames('bike'),
    tips: [
      'Je kräftiger du trittst und ziehst, desto höher wird der Luftwiderstand.',
      'Arme und Beine gleichmäßig einsetzen – aktiv drücken UND ziehen.',
      'Rumpf stabil im Sattel halten, besonders bei HIIT-Sprints.',
    ],
  },
  {
    name: 'SkiErg',
    primaryMuscles: ['Latissimus', 'Bauch & Core', 'Trizeps'],
    secondaryMuscles: ['Schultern', 'Gesäß & Beine', 'Herz-Kreislauf'],
    frames: svgFrames('row'),
    tips: [
      'Arme hochstrecken und den Zug mit einer explosiven Bauch- und Hüftbeugung einleiten.',
      'Griffe eng am Körper vorbei bis auf Oberschenkelhöhe durchziehen.',
      'Beim Aufrichten tief einatmen und den nächsten Zug fließend anschließen.',
    ],
  },
  {
    name: 'Seilspringen',
    primaryMuscles: ['Waden', 'Herz-Kreislauf-System', 'Koordination'],
    secondaryMuscles: ['Schultern', 'Unterarme', 'Core'],
    frames: svgFrames('jump'),
    tips: [
      'Nur wenige Zentimeter hoch auf den Fußballen federn (Knie leicht gebeugt).',
      'Ellenbogen eng an den Rippen halten – die Rotation kommt aus den Handgelenken, nicht aus den Schultern!',
      'Blick geradeaus richten und leise landen.',
    ],
  },
  {
    name: 'Battle Ropes',
    primaryMuscles: ['Schultern (Deltoideus)', 'Core', 'Herz-Kreislauf-System'],
    secondaryMuscles: ['Arme & Griffkraft', 'Oberer Rücken', 'Beine (isometrisch)'],
    frames: svgFrames('ropes'),
    tips: [
      'Athletischer, halbtiefer Stand (Knie und Hüfte gebeugt, Rücken gerade).',
      'Gleichmäßige Wellen bis zum Ankerpunkt erzeugen, ohne den Oberkörper mitzuschaukeln.',
      'Schultern tief lassen und gleichmäßig weiteratmen.',
    ],
  },
  {
    name: 'Ausdauer',
    primaryMuscles: ['Herz-Kreislauf-System', 'Beinmuskulatur'],
    secondaryMuscles: ['Core', 'Atemmuskulatur'],
    frames: svgFrames('run'),
    tips: [
      'Wähle eine gleichmäßige Intensität passend zu deinem heutigen Trainingsziel.',
      'Auf aufrechte Körperhaltung und ruhige, tiefe Atmung achten.',
      'Die ersten und letzten 3 Minuten locker zum Auf- und Abwärmen nutzen.',
    ],
  },

  // ============================================================================
  // 12. MOBILITÄT
  // ============================================================================
  {
    name: 'Cat-Cow',
    primaryMuscles: ['Wirbelsäulen-Mobilität (Brust- & Lendenwirbelsäule)'],
    secondaryMuscles: ['Rückenstrecker', 'Bauchmuskulatur', 'Schultergürtel'],
    frames: svgFrames('catcow'),
    tips: [
      'Vierfüßlerstand: Hände unter den Schultern, Knie unter den Hüften.',
      'Ausatmen (Katze): Rücken Wirbel für Wirbel rund zur Decke schieben, Kinn zur Brust.',
      'Einatmen (Kuh): Bauch sanft absenken, Brustbein und Blick nach vorn/oben heben.',
    ],
  },
  {
    name: '90/90 Hüftrotation',
    primaryMuscles: ['Hüftgelenk (Innen- & Außenrotation)', 'Gesäß'],
    secondaryMuscles: ['Adduktoren', 'Unterer Rücken'],
    frames: svgFrames('hipstretch'),
    tips: [
      'Aufrecht auf dem Boden sitzen, beide Beine im 90°-Winkel angewinkelt.',
      'Knie kontrolliert auf die andere Seite klappen lassen, Fersen bleiben am Platz.',
      'Brustkorb stolz halten und in den Endpositionen kurz nachfedern.',
    ],
  },
  {
    name: 'Weltbeste Dehnung',
    primaryMuscles: ['Hüftbeuger', 'Brustwirbelsäule', 'Beinrückseite'],
    secondaryMuscles: ['Gesäß', 'Schultern', 'Adduktoren'],
    frames: svgFrames('hipstretch'),
    tips: [
      'Großen Ausfallschritt machen, hinteres Bein gestreckt, Hand neben dem vorderen Fuß abstützen.',
      'Freien Ellenbogen erst tief zum vorderen Knöchel führen.',
      'Anschließend den Arm weit zur Decke aufdrehen und mit dem Blick der Hand folgen.',
    ],
  },
  {
    name: 'Tiefe Hocke halten',
    primaryMuscles: ['Hüftmobilität', 'Sprunggelenke', 'Unterer Rücken'],
    secondaryMuscles: ['Adduktoren', 'Schienbeinmuskulatur'],
    frames: svgFrames('deepstretch'),
    tips: [
      'Füße etwas weiter als schulterbreit, Fersen bleiben vollständig am Boden.',
      'Mit den Ellenbogen die Knie sanft von innen nach außen drücken.',
      'Brustbein aufrichten und entspannt in die Hüftöffnung atmen.',
    ],
  },
  {
    name: 'Couch Stretch',
    primaryMuscles: ['Hüftbeuger (Iliopsoas)', 'Vorderer Oberschenkel (Rectus femoris)'],
    secondaryMuscles: ['Gesäß (Antagonist)'],
    frames: svgFrames('hipstretch'),
    tips: [
      'Hinteres Knie am Boden nahe der Wand/Bank platzieren, Schienbein zeigt nach oben.',
      'Vorderen Fuß im Ausfallschritt aufstellen und das Gesäß der hinteren Seite fest anspannen.',
      'Oberkörper langsam aufrichten, ohne ins Hohlkreuz auszuweichen.',
    ],
  },
  {
    name: 'Hüftbeuger-Dehnung',
    primaryMuscles: ['Hüftbeuger (Iliopsoas)', 'Quadrizeps'],
    secondaryMuscles: ['Rumpf'],
    frames: svgFrames('hipstretch'),
    tips: [
      'Halb-kniender Ausfallschritt (90° in beiden Knien).',
      'Becken aktiv nach hinten kippen (Steißbein einziehen) und Gesäß des hinteren Beins anspannen.',
      'Hüfte leicht nach vorn schieben, während der Oberkörper aufrecht bleibt.',
    ],
  },
  {
    name: 'Hamstring-Dehnung',
    primaryMuscles: ['Beinbeuger (Oberschenkelrückseite)'],
    secondaryMuscles: ['Waden', 'Unterer Rücken'],
    frames: svgFrames('deepstretch'),
    tips: [
      'Rücken lang und gerade lassen – die Vorbeuge kommt aus dem Hüftgelenk, nicht aus einem runden Rücken!',
      'Fußspitze des gestreckten Beins leicht heranziehen.',
      'Ruhig atmen und bei jedem Ausatmen minimal tiefer in die Dehnung sinken.',
    ],
  },
  {
    name: 'Pigeon Stretch',
    primaryMuscles: ['Tiefe Gesäßmuskulatur (Piriformis, Gluteus)', 'Hüftkapsel'],
    secondaryMuscles: ['Hüftbeuger (hinteres Bein)'],
    frames: svgFrames('hipstretch'),
    tips: [
      'Vorderes Bein angewinkelt vor dem Körper ablegen, hinteres Bein lang nach hinten strecken.',
      'Beide Hüftknochen parallel zum Boden ausrichten (nicht seitlich wegkippen).',
      'Oberkörper aufrecht halten oder entspannt über das vordere Schienbein ablegen.',
    ],
  },
  {
    name: 'Kindhaltung',
    primaryMuscles: ['Unterer Rücken', 'Latissimus', 'Schultern'],
    secondaryMuscles: ['Hüfte', 'Spann & Sprunggelenke'],
    frames: svgFrames('deepstretch'),
    tips: [
      'Knie leicht öffnen, große Zehen berühren sich, Gesäß nach hinten auf die Fersen setzen.',
      'Arme weit nach vorn auf dem Boden ausstrecken und Stirn ablegen.',
      'Tief in den unteren Rücken und die Flanken ein- und ausatmen.',
    ],
  },
  {
    name: 'Thorax-Rotation',
    primaryMuscles: ['Brustwirbelsäule (Rotation)', 'Brust & vordere Schulter'],
    secondaryMuscles: ['Schräge Bauchmuskeln', 'Oberer Rücken'],
    frames: svgFrames('thoracic'),
    tips: [
      'In Seitlage oder im Vierfüßlerstand das Becken komplett ruhig halten.',
      'Aus der Brustwirbelsäule heraus den oberen Arm weit zur Gegenseite öffnen.',
      'Kopf und Blick folgen der Hand, am Endpunkt tief ein- und ausatmen.',
    ],
  },
  {
    name: 'Wall Slides',
    primaryMuscles: ['Unterer Trapez', 'Serratus anterior', 'Schultermobilität'],
    secondaryMuscles: ['Rotatorenmanschette', 'Brustwirbelsäule'],
    frames: svgFrames('thoracic'),
    tips: [
      'Rücken, Hinterkopf und unterer Rücken berühren flach die Wand (Rippen unten halten).',
      'Ellenbogen und Handrücken im 90°-Winkel („Kaktus-Position“) an die Wand legen.',
      'Arme langsam an der Wand entlang nach oben gleiten lassen, ohne ins Hohlkreuz zu gehen.',
    ],
  },
  {
    name: 'Schulterdehnung an der Wand',
    primaryMuscles: ['Brustmuskulatur (Pectoralis major & minor)', 'Vordere Schulter'],
    secondaryMuscles: ['Bizeps', 'Brustwirbelsäule'],
    frames: svgFrames('thoracic'),
    tips: [
      'Unterarm oder gestreckten Arm auf Schulterhöhe flach an eine Wand oder einen Türrahmen legen.',
      'Oberkörper langsam vom Arm wegdrehen, bis eine angenehme Dehnung in Brust und Schulter entsteht.',
      'Schulterblatt dabei tief halten und ruhig weiteratmen.',
    ],
  },
]

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
}

const GUIDES: Record<string, ExerciseGuide> = Object.fromEntries(
  RAW_GUIDES.map((guide) => [normalizeKey(guide.name), guide]),
)

export function findExerciseGuide(exerciseName: string): ExerciseGuide | null {
  const key = normalizeKey(exerciseName)
  if (!key) return null
  if (GUIDES[key]) return GUIDES[key]

  // Intelligente Fallback-Zuordnung für frei benannte / eigene Übungen des Nutzers
  if (key.includes('schraegbank') && key.includes('presse')) return GUIDES[normalizeKey('Schrägbankpresse')]
  if (key.includes('schraegbank') && key.includes('curl')) return GUIDES[normalizeKey('Schrägbankcurls')]
  if (key.includes('schraegbank')) return GUIDES[normalizeKey('Schrägbankdrücken')]
  if (key.includes('engesbank')) return GUIDES[normalizeKey('Enges Bankdrücken')]
  if (key.includes('bankdrueck') && key.includes('kurzhantel')) return GUIDES[normalizeKey('Bankdrücken (Kurzhanteln)')]
  if (key.includes('bankdrueck') || key.includes('benchpress')) return GUIDES[normalizeKey('Bankdrücken')]
  if (key.includes('brustpresse') || key.includes('chestpress')) return GUIDES[normalizeKey('Brustpresse')]
  if (key.includes('reversebutterfly') || key.includes('rear')) return GUIDES[normalizeKey('Reverse Butterfly')]
  if (key.includes('butterfly')) return GUIDES[normalizeKey('Butterfly')]
  if (key.includes('fliegende') || key.includes('fly')) return GUIDES[normalizeKey('Fliegende (Kurzhanteln)')]

  if (key.includes('rumaenisch') || key.includes('rdl')) return GUIDES[normalizeKey('Rumänisches Kreuzheben')]
  if (key.includes('kreuzheb') || key.includes('deadlift')) return GUIDES[normalizeKey('Kreuzheben')]
  if (key.includes('latueberz')) return GUIDES[normalizeKey('Lat-Überzüge')]
  if (key.includes('ueberzueg') || key.includes('pullover')) return GUIDES[normalizeKey('Überzüge (Kurzhantel)')]
  if (key.includes('latzieh')) return GUIDES[normalizeKey('Latziehen')]
  if (key.includes('schlingentrainer') || key.includes('trx')) return GUIDES[normalizeKey('Rudern am Schlingentrainer')]
  if (key.includes('ruderergometer')) return GUIDES[normalizeKey('Ruderergometer')]
  if (key.includes('langhantelrudern')) return GUIDES[normalizeKey('Langhantelrudern')]
  if (key.includes('kurzhantelrudern')) return GUIDES[normalizeKey('Kurzhantelrudern')]
  if (key.includes('tbar')) return GUIDES[normalizeKey('T-Bar-Rudern')]
  if (key.includes('rudern') || key.includes('row')) return GUIDES[normalizeKey('Rudern sitzend')]

  if (key.includes('arnold')) return GUIDES[normalizeKey('Arnold Press')]
  if (key.includes('schulterdrueck') || key.includes('militarypress') || key.includes('shoulderpress')) return GUIDES[normalizeKey('Schulterdrücken')]
  if (key.includes('seitheb') || key.includes('lateralraise')) return GUIDES[normalizeKey('Seitheben')]
  if (key.includes('frontheb')) return GUIDES[normalizeKey('Frontheben')]
  if (key.includes('facepull')) return GUIDES[normalizeKey('Facepulls')]
  if (key.includes('shrug') || key.includes('nackenziehen')) return GUIDES[normalizeKey('Shrugs')]

  if (key.includes('hammercurl')) return GUIDES[normalizeKey('Hammercurls')]
  if (key.includes('preacher') || key.includes('scottcurl')) return GUIDES[normalizeKey('Preacher Curls')]
  if (key.includes('konzentrationscurl')) return GUIDES[normalizeKey('Konzentrationscurls')]
  if (key.includes('kabelcurl') || key.includes('cablecurl')) return GUIDES[normalizeKey('Kabelcurls')]
  if (key.includes('szcurl')) return GUIDES[normalizeKey('SZ-Curls')]
  if (key.includes('bizeps') || key.includes('curl')) return GUIDES[normalizeKey('Bizepscurls (Kurzhanteln)')]

  if (key.includes('frenchpress')) return GUIDES[normalizeKey('French Press')]
  if (key.includes('skullcrusher')) return GUIDES[normalizeKey('Skull Crushers')]
  if (key.includes('kickback')) return GUIDES[normalizeKey('Trizeps-Kickbacks')]
  if (key.includes('trizeps') && key.includes('kopf')) return GUIDES[normalizeKey('Trizepsdrücken über Kopf')]
  if (key.includes('trizeps') || key.includes('pushdown')) return GUIDES[normalizeKey('Trizeps Extensions (nach unten)')]

  if (key.includes('frontkniebeug')) return GUIDES[normalizeKey('Frontkniebeugen')]
  if (key.includes('goblet')) return GUIDES[normalizeKey('Goblet Squats')]
  if (key.includes('hackenschmidt') || key.includes('hacksquat')) return GUIDES[normalizeKey('Hackenschmidt-Kniebeugen')]
  if (key.includes('bulgarian') || key.includes('splitsquat')) return GUIDES[normalizeKey('Bulgarian Split Squats')]
  if (key.includes('pistol')) return GUIDES[normalizeKey('Pistol Squats')]
  if (key.includes('kniebeug') || key.includes('squat')) return GUIDES[normalizeKey('Kniebeugen')]
  if (key.includes('beinpresse') || key.includes('legpress')) return GUIDES[normalizeKey('Beinpresse')]
  if (key.includes('beinstrecker') || key.includes('legextension')) return GUIDES[normalizeKey('Beinstrecker')]
  if (key.includes('beinbeuger') || key.includes('legcurl')) return GUIDES[normalizeKey('Beinbeuger')]
  if (key.includes('ausfallschritt') || key.includes('lunge')) return GUIDES[normalizeKey('Ausfallschritte (Kurzhanteln)')]
  if (key.includes('hipthrust')) return GUIDES[normalizeKey('Hip Thrusts')]
  if (key.includes('glutebridge')) return GUIDES[normalizeKey('Glute Bridge')]
  if (key.includes('abduktor')) return GUIDES[normalizeKey('Abduktorenmaschine')]
  if (key.includes('adduktor')) return GUIDES[normalizeKey('Adduktorenmaschine')]
  if (key.includes('wadenheb')) return GUIDES[normalizeKey('Wadenheben stehend')]

  if (key.includes('klimmzug') || key.includes('klimmzuege') || key.includes('pullup')) return GUIDES[normalizeKey('Klimmzüge')]
  if (key.includes('chinup')) return GUIDES[normalizeKey('Chin-ups')]
  if (key.includes('muscleup')) return GUIDES[normalizeKey('Muscle-ups')]
  if (key.includes('dip')) return GUIDES[normalizeKey('Dips')]
  if (key.includes('liegestuetz') || key.includes('pushup')) return GUIDES[normalizeKey('Liegestütze')]
  if (key.includes('burpee')) return GUIDES[normalizeKey('Burpees')]

  if (key.includes('sideplank') || key.includes('seitstuetz')) return GUIDES[normalizeKey('Side Plank')]
  if (key.includes('plank') || key.includes('unterarmstuetz')) return GUIDES[normalizeKey('Plank')]
  if (key.includes('crunch') || key.includes('bauch')) return GUIDES[normalizeKey('Crunches')]
  if (key.includes('situp')) return GUIDES[normalizeKey('Situps (Schrägbank)')]
  if (key.includes('beinheben')) return GUIDES[normalizeKey('Beinheben hängend')]
  if (key.includes('hyperextension') || key.includes('rueckenstrecker')) return GUIDES[normalizeKey('Hyperextensions')]

  if (key.includes('kettlebell')) return GUIDES[normalizeKey('Kettlebell Swings')]
  if (key.includes('joggen') || key.includes('laufen') || key.includes('laufband')) return GUIDES[normalizeKey('Joggen')]
  if (key.includes('radfahren') || key.includes('fahrrad') || key.includes('ergometer') || key.includes('bike')) return GUIDES[normalizeKey('Fahrradergometer')]

  return null
}
