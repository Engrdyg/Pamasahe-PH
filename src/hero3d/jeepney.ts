import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Procedural Philippine jeepney, roughly to scale in metres: x points to the
 * front, y up, z across. Ground is y = 0. Stainless body with painted
 * stripes, chrome trim, open passenger windows, route boards on the roof.
 */

const RED = '#c8102e'
const YELLOW = '#ffc72c'
const BLUE = '#0b3d91'

// Passenger body extent (side profile); the livery texture spans exactly this.
const BODY = { x0: -3.0, x1: 1.45, y0: 0.55, y1: 1.5 }
const WHEEL = { r: 0.42, w: 0.28, front: 2.05, rear: -1.85, z: 0.86 }

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Side livery: brushed stainless with hand-painted stripes and stars. */
function liveryTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 256, (g) => {
    const steel = g.createLinearGradient(0, 0, 0, 256)
    steel.addColorStop(0, '#eef1f4')
    steel.addColorStop(0.5, '#c9cfd6')
    steel.addColorStop(1, '#e3e7eb')
    g.fillStyle = steel
    g.fillRect(0, 0, 1024, 256)
    // Brushed grain
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`
      g.fillRect(Math.random() * 1024, Math.random() * 256, 40 + Math.random() * 120, 1)
    }
    // Rocker band
    g.fillStyle = RED
    g.fillRect(0, 216, 1024, 40)
    g.fillStyle = YELLOW
    g.fillRect(0, 208, 1024, 8)
    // Sweeping stripes from the front (right) toward the back
    const swoosh = (color: string, y: number, thick: number) => {
      g.fillStyle = color
      g.beginPath()
      g.moveTo(1024, y)
      g.bezierCurveTo(760, y - 70, 520, y + 60, 0, y - 10)
      g.lineTo(0, y - 10 + thick)
      g.bezierCurveTo(520, y + 60 + thick, 760, y - 70 + thick, 1024, y + thick)
      g.closePath()
      g.fill()
    }
    swoosh(BLUE, 120, 26)
    swoosh(YELLOW, 150, 10)
    swoosh(RED, 164, 16)
    // Belt line trim
    g.fillStyle = '#8b939c'
    g.fillRect(0, 0, 1024, 6)
    // Stars
    g.fillStyle = YELLOW
    for (const [x, y, r] of [[860, 60, 14], [905, 44, 9], [940, 70, 11], [120, 60, 10], [160, 44, 7]] as const) {
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2
        const rr = i % 2 ? r * 0.45 : r
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      }
      g.closePath()
      g.fill()
    }
  })
}

function signTexture(text: string, w = 1024, h = 128, bg = '#fffdf5', fg = '#111827'): THREE.CanvasTexture {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.strokeStyle = RED
    g.lineWidth = 10
    g.strokeRect(5, 5, w - 10, h - 10)
    g.fillStyle = fg
    g.font = `900 ${Math.round(h * 0.56)}px "Arial Black", Arial, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + 4, w - 60)
  })
}

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], r = 0.02): THREE.Mesh {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d)
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/** Box placed by its min/max corners. */
function boxAt(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: THREE.Material | THREE.Material[], r = 0.02) {
  const m = box(x1 - x0, y1 - y0, z1 - z0, mat, Math.min(r, (x1 - x0) / 2.1, (y1 - y0) / 2.1, (z1 - z0) / 2.1))
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return m
}

function extrudeZ(shape: THREE.Shape, depth: number, mat: THREE.Material | THREE.Material[], bevel = 0.03): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 32,
  })
  geo.translate(0, 0, -depth / 2 + bevel)
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function wheel(mats: { tire: THREE.Material; chrome: THREE.Material; dark: THREE.Material }): THREE.Group {
  const g = new THREE.Group()
  const { r, w } = WHEEL
  // Tire: lathe of a rounded cross-section around the axle.
  const inner = 0.27
  const c = 0.07
  const pts: THREE.Vector2[] = [new THREE.Vector2(inner, -w / 2)]
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2)
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, -w / 2 + c + Math.sin(a) * c))
  }
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2)
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, w / 2 - c + Math.sin(a) * c))
  }
  pts.push(new THREE.Vector2(inner, w / 2))
  const tire = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mats.tire)
  tire.rotation.x = Math.PI / 2
  tire.castShadow = true
  g.add(tire)
  // Steel rim, chrome hub cap and lug nuts on both faces.
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(inner + 0.005, inner + 0.005, w - 0.04, 40), mats.dark)
  rim.rotation.x = Math.PI / 2
  g.add(rim)
  for (const s of [1, -1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), mats.chrome)
    cap.rotation.x = (s * Math.PI) / 2
    cap.position.z = s * (w / 2 - 0.1)
    cap.scale.y = 0.6
    g.add(cap)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), mats.chrome)
      nut.rotation.x = Math.PI / 2
      nut.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, s * (w / 2 - 0.01))
      g.add(nut)
    }
  }
  return g
}

export function buildJeepney(): THREE.Group {
  const jeep = new THREE.Group()

  const livery = liveryTexture()
  livery.wrapS = livery.wrapT = THREE.ClampToEdgeWrapping
  const spanX = BODY.x1 - BODY.x0
  const spanY = BODY.y1 - BODY.y0
  livery.repeat.set(1 / spanX, 1 / spanY)
  livery.offset.set(-BODY.x0 / spanX, -BODY.y0 / spanY)

  const mats = {
    livery: new THREE.MeshStandardMaterial({ map: livery, metalness: 0.55, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: '#d4d9df', metalness: 0.85, roughness: 0.28 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.08 }),
    red: new THREE.MeshStandardMaterial({ color: RED, metalness: 0.3, roughness: 0.35 }),
    yellow: new THREE.MeshStandardMaterial({ color: YELLOW, metalness: 0.2, roughness: 0.4 }),
    blue: new THREE.MeshStandardMaterial({ color: BLUE, metalness: 0.3, roughness: 0.35 }),
    roof: new THREE.MeshStandardMaterial({ color: '#f3f4f6', metalness: 0.2, roughness: 0.45 }),
    interior: new THREE.MeshStandardMaterial({ color: '#1b1f27', roughness: 0.9 }),
    seat: new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: '#23262d', metalness: 0.4, roughness: 0.6 }),
    tire: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.88 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#9fb7c9',
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.32,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide,
    }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff8e1', emissive: '#fff3c4', emissiveIntensity: 0.9, roughness: 0.1 }),
    tail: new THREE.MeshStandardMaterial({ color: '#b91c1c', emissive: '#7f1d1d', emissiveIntensity: 0.6, roughness: 0.2 }),
    amber: new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#92400e', emissiveIntensity: 0.4, roughness: 0.2 }),
  }

  // --- Chassis and axles
  jeep.add(boxAt(-2.9, 2.75, 0.36, 0.56, -0.62, 0.62, mats.dark, 0.02))
  for (const x of [WHEEL.front, WHEEL.rear]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, WHEEL.z * 2, 12), mats.dark)
    axle.rotation.x = Math.PI / 2
    axle.position.set(x, WHEEL.r, 0)
    jeep.add(axle)
  }

  // --- Passenger body: side profile with a real rear wheel arch, extruded across.
  {
    const s = new THREE.Shape()
    const a = Math.asin((BODY.y0 - WHEEL.r) / 0.52)
    s.moveTo(BODY.x0, BODY.y0)
    s.lineTo(WHEEL.rear - Math.cos(a) * 0.52, BODY.y0)
    s.absarc(WHEEL.rear, WHEEL.r, 0.52, Math.PI - a, a, true)
    s.lineTo(BODY.x1, BODY.y0)
    s.lineTo(BODY.x1, BODY.y1)
    s.lineTo(BODY.x0, BODY.y1)
    s.closePath()
    const body = extrudeZ(s, 2.0, [mats.livery, mats.steel], 0.035)
    jeep.add(body)
    // Rear fender flare (chrome) around the arch, both sides.
    const flare = new THREE.Shape()
    flare.absarc(0, 0, 0.6, Math.PI - a, a, true)
    flare.absarc(0, 0, 0.52, a, Math.PI - a, false)
    for (const z of [1.02, -1.02]) {
      const f = extrudeZ(flare, 0.08, mats.chrome, 0.012)
      f.position.set(WHEEL.rear, WHEEL.r, z)
      jeep.add(f)
    }
  }

  // --- Window band: dark interior, benches, pillars, belt and roof rails.
  jeep.add(boxAt(-2.92, 1.4, 1.45, 2.14, -0.93, 0.93, mats.interior, 0))
  for (const z of [0.62, -0.62]) jeep.add(boxAt(-2.8, 1.1, 1.5, 1.62, z - 0.22, z + 0.22, mats.seat, 0.03))
  const pillarXs = [-2.96, -2.4, -1.84, -1.28, -0.72, -0.16, 0.4, 0.96, 1.41]
  for (const x of pillarXs) {
    for (const z of [0.98, -0.98]) jeep.add(boxAt(x - 0.04, x + 0.04, 1.5, 2.16, z - 0.035, z + 0.035, mats.steel, 0.012))
  }
  for (const z of [1.0, -1.0]) {
    jeep.add(boxAt(-3.0, 1.45, 1.49, 1.54, z - 0.03, z + 0.03, mats.chrome, 0.01)) // belt trim
    // Rolled-up canvas curtains under the roof
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.3, 12), mats.blue)
    curtain.rotation.z = Math.PI / 2
    curtain.position.set(-0.78, 2.08, z * 1.01)
    jeep.add(curtain)
  }

  // --- Roof with overhang, side route boards and front sign.
  jeep.add(boxAt(-3.12, 1.78, 2.14, 2.24, -1.08, 1.08, mats.roof, 0.04))
  {
    const side = new THREE.MeshStandardMaterial({ map: signTexture('CUBAO • QUIAPO • DIVISORIA', 2048, 128, YELLOW, BLUE), roughness: 0.5 })
    const board = boxAt(-2.7, 1.0, 2.24, 2.44, -1.0, 1.0, [mats.red, mats.red, mats.roof, mats.roof, side, side], 0.0)
    jeep.add(board)
    const front = new THREE.MeshStandardMaterial({ map: signTexture('CUBAO – QUIAPO'), roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.12, emissiveMap: null })
    jeep.add(boxAt(1.12, 1.28, 2.24, 2.56, -0.78, 0.78, [front, mats.red, mats.red, mats.red, mats.red, mats.red], 0.0))
    for (const z of [1.08, -1.08]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.9, 10), mats.chrome)
      rail.rotation.z = Math.PI / 2
      rail.position.set(-0.67, 2.27, z)
      jeep.add(rail)
    }
  }

  // --- Windshield: split glass in a steel frame, leaning back slightly.
  {
    const ws = new THREE.Group()
    ws.position.set(1.46, 1.5, 0)
    ws.rotation.z = 0.06
    for (const z of [-0.47, 0.47]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.6), mats.glass)
      pane.rotation.y = Math.PI / 2
      pane.position.set(0.0, 0.32, z)
      ws.add(pane)
    }
    for (const z of [-0.97, 0, 0.97]) ws.add(boxAt(-0.04, 0.04, 0, 0.66, z - 0.04, z + 0.04, mats.steel, 0.01))
    ws.add(boxAt(-0.04, 0.05, 0.6, 0.66, -1.0, 1.0, mats.steel, 0.01))
    jeep.add(ws)
    // Steering wheel visible through the glass
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 24), mats.dark)
    sw.position.set(1.15, 1.62, 0.5)
    sw.rotation.y = Math.PI / 2
    sw.rotation.x = 0.5
    jeep.add(sw)
  }

  // --- Hood: sloped profile, stainless with a red centre stripe.
  {
    const s = new THREE.Shape()
    s.moveTo(1.45, 0.62)
    s.lineTo(2.88, 0.62)
    s.lineTo(2.88, 1.16)
    s.quadraticCurveTo(2.2, 1.28, 1.45, 1.34)
    s.closePath()
    jeep.add(extrudeZ(s, 1.46, mats.steel, 0.05))
    const stripe = extrudeZ(s, 0.18, mats.red, 0.02)
    stripe.scale.set(1, 1.005, 1)
    stripe.position.y = 0.004
    jeep.add(stripe)
    // Twin air horns on the cowl
    for (const z of [0.45, -0.45]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 16, 1, true), mats.chrome)
      horn.rotation.z = -Math.PI / 2
      horn.position.set(1.9, 1.33, z)
      jeep.add(horn)
    }
  }

  // --- Front fenders, running boards, grille, lamps, bumper.
  {
    const f = new THREE.Shape()
    f.moveTo(-0.62, 0.0)
    f.absarc(0, 0, 0.62, Math.PI, 0, true)
    f.lineTo(0.7, 0.0)
    f.lineTo(0.7, 0.06)
    f.lineTo(0.54, 0.06)
    f.absarc(0, 0, 0.52, 0, Math.PI, false)
    f.lineTo(-0.62, 0.0)
    for (const z of [WHEEL.z, -WHEEL.z]) {
      const m = extrudeZ(f, 0.36, mats.red, 0.03)
      m.position.set(WHEEL.front, WHEEL.r + 0.06, z)
      jeep.add(m)
    }
    for (const z of [0.86, -0.86]) jeep.add(boxAt(1.1, 1.5, 0.44, 0.5, z - 0.2, z + 0.2, mats.chrome, 0.01))
  }
  jeep.add(boxAt(2.86, 2.93, 0.7, 1.12, -0.52, 0.52, mats.dark, 0.01))
  for (let i = 0; i < 11; i++) {
    const z = -0.48 + (i * 0.96) / 10
    jeep.add(boxAt(2.9, 2.96, 0.72, 1.1, z - 0.018, z + 0.018, mats.chrome, 0.008))
  }
  jeep.add(boxAt(2.88, 2.98, 1.1, 1.15, -0.56, 0.56, mats.chrome, 0.012))
  for (const z of [0.66, -0.66]) {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 32), mats.chrome)
    bezel.rotation.z = Math.PI / 2
    bezel.position.set(2.88, 1.0, z)
    jeep.add(bezel)
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3), mats.lamp)
    lens.rotation.z = -Math.PI / 2
    lens.position.set(2.89, 1.0, z)
    jeep.add(lens)
    const sig = boxAt(2.86, 2.94, 0.78, 0.86, z - 0.07, z + 0.07, mats.amber, 0.01)
    jeep.add(sig)
  }
  jeep.add(boxAt(2.92, 3.08, 0.5, 0.68, -1.02, 1.02, mats.chrome, 0.03))
  for (const z of [0.36, -0.36]) {
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 20), mats.lamp)
    fog.rotation.z = Math.PI / 2
    fog.position.set(3.1, 0.59, z)
    jeep.add(fog)
  }

  // --- Side mirrors on stalks
  for (const s of [1, -1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), mats.chrome)
    stalk.rotation.x = (s * Math.PI) / 2.6
    stalk.position.set(1.55, 1.75, s * 1.12)
    jeep.add(stalk)
    const mirror = boxAt(1.5, 1.56, 1.8, 2.0, s * 1.22 - 0.09, s * 1.22 + 0.09, mats.chrome, 0.02)
    jeep.add(mirror)
  }

  // --- Rear: doorway, grab bars, step, bumper, tail lamps, mud flaps.
  jeep.add(boxAt(-3.04, -3.0, 0.62, 1.5, -0.4, 0.4, mats.interior, 0))
  for (const z of [0.47, -0.47]) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 10), mats.chrome)
    bar.position.set(-3.08, 1.35, z)
    jeep.add(bar)
    jeep.add(boxAt(-3.08, -3.0, 1.0, 1.26, z * 1.85 - 0.07, z * 1.85 + 0.07, mats.tail, 0.01))
  }
  jeep.add(boxAt(-3.32, -3.0, 0.4, 0.47, -0.45, 0.45, mats.chrome, 0.01))
  jeep.add(boxAt(-3.14, -3.02, 0.5, 0.62, -1.0, -0.45, mats.chrome, 0.02))
  jeep.add(boxAt(-3.14, -3.02, 0.5, 0.62, 0.45, 1.0, mats.chrome, 0.02))
  for (const z of [0.82, -0.82]) jeep.add(boxAt(-2.42, -2.4, 0.1, 0.55, z - 0.16, z + 0.16, mats.red, 0.0))

  // --- Wheels
  for (const x of [WHEEL.front, WHEEL.rear]) {
    for (const z of [WHEEL.z, -WHEEL.z]) {
      const w = wheel(mats)
      w.position.set(x, WHEEL.r, z)
      jeep.add(w)
    }
  }

  // Centre the jeepney over the turntable.
  jeep.position.x = -0.04
  return jeep
}
