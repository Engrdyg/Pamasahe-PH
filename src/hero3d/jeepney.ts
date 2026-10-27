import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Procedural "patok" jeepney (the souped-up Cubao–Antipolo kind), roughly to
 * scale in metres: x points to the front, y up, z across (+z is the right /
 * kerb side, the driver sits on the left). Ground is y = 0.
 *
 * Stainless body with airbrushed flames, open cab doorways on both sides with
 * the driver's seat and dash inside, open passenger windows with visors, a
 * rear entrance, chrome mags on low-profile tyres, bull bar, twin headlights,
 * chrome horses, LED strips, antennas and underglow.
 */

const RED = '#d0102b'
const YELLOW = '#ffc72c'
const BLUE = '#0b3d91'
const CYAN = '#22d3ee'
const PINK = '#f0abfc'

// Passenger body extent (side profile); the livery texture spans exactly this.
const BODY = { x0: -3.0, x1: 1.45, y0: 0.5, y1: 1.5 }
// Cab doorway (both sides): open from the step up to the roof.
const DOOR = { x0: 0.55, x1: 1.38, sill: 0.9 }
const WHEEL = { r: 0.44, w: 0.32, rim: 0.33, front: 2.05, rear: -1.85, z: 0.84 }
const ARCH = 0.54

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

/** Side livery: polished stainless with airbrushed flames sweeping back from the cab. */
function liveryTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 256, (g) => {
    const steel = g.createLinearGradient(0, 0, 0, 256)
    steel.addColorStop(0, '#f4f6f8')
    steel.addColorStop(0.45, '#c3cad3')
    steel.addColorStop(0.55, '#e9edf1')
    steel.addColorStop(1, '#b9c1cb')
    g.fillStyle = steel
    g.fillRect(0, 0, 1024, 256)
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`
      g.fillRect(Math.random() * 1024, Math.random() * 256, 40 + Math.random() * 160, 1)
    }
    // Flames: tongues starting at the cab (right) licking toward the back (left).
    const flame = (y: number, len: number, thick: number, colors: string[]) => {
      const grad = g.createLinearGradient(1024, 0, 1024 - len, 0)
      colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c))
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(1024, y - thick)
      const tongues = 5
      for (let i = 0; i < tongues; i++) {
        const x0 = 1024 - (len * i) / tongues
        const x1 = 1024 - (len * (i + 1)) / tongues
        g.quadraticCurveTo(x0 - (x0 - x1) * 0.3, y - thick * (1.6 - i * 0.2), x1, y - thick * 0.2)
        g.quadraticCurveTo(x1 + (x0 - x1) * 0.5, y, x1 + (x0 - x1) * 0.15, y + thick * 0.15)
      }
      g.lineTo(1024 - len * 0.98, y + thick * 0.4)
      for (let i = tongues - 1; i >= 0; i--) {
        const x0 = 1024 - (len * i) / tongues
        const x1 = 1024 - (len * (i + 1)) / tongues
        g.quadraticCurveTo(x1 + (x0 - x1) * 0.4, y + thick * (1.5 - i * 0.18), x0, y + thick)
      }
      g.closePath()
      g.fill()
    }
    flame(150, 900, 46, [RED, '#f97316', YELLOW, 'rgba(255,199,44,0)'])
    flame(160, 640, 26, ['#fde047', '#fb923c', 'rgba(251,146,60,0)'])
    // Electric blue speed streaks above the flames
    for (const [y, len, w] of [[78, 760, 9], [96, 600, 6], [110, 420, 4]] as const) {
      const grad = g.createLinearGradient(1024, 0, 1024 - len, 0)
      grad.addColorStop(0, BLUE)
      grad.addColorStop(0.6, CYAN)
      grad.addColorStop(1, 'rgba(34,211,238,0)')
      g.fillStyle = grad
      g.fillRect(1024 - len, y, len, w)
    }
    // Black rocker with a chrome pinstripe
    g.fillStyle = '#111318'
    g.fillRect(0, 222, 1024, 34)
    g.fillStyle = PINK
    g.fillRect(0, 216, 1024, 4)
    g.fillStyle = '#8b939c'
    g.fillRect(0, 0, 1024, 6)
  })
}

function textTexture(
  text: string,
  { w = 1024, h = 128, bg = '#fffdf5', fg = '#111827', border = RED as string | null, italic = false, glow = null as string | null } = {},
): THREE.CanvasTexture {
  return canvasTexture(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg
      g.fillRect(0, 0, w, h)
    }
    if (border) {
      g.strokeStyle = border
      g.lineWidth = 10
      g.strokeRect(5, 5, w - 10, h - 10)
    }
    g.font = `${italic ? 'italic ' : ''}900 ${Math.round(h * 0.6)}px "Arial Black", Arial, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    if (glow) {
      g.shadowColor = glow
      g.shadowBlur = h * 0.15
    }
    if (!bg) {
      g.lineWidth = h * 0.09
      g.strokeStyle = '#111318'
      g.strokeText(text, w / 2, h / 2 + 4, w - 40)
    }
    g.fillStyle = fg
    g.fillText(text, w / 2, h / 2 + 4, w - 40)
  })
}

function glowTexture(color: string): THREE.CanvasTexture {
  return canvasTexture(256, 128, (g) => {
    const grad = g.createRadialGradient(128, 64, 4, 128, 64, 128)
    grad.addColorStop(0, color)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.setTransform(1, 0, 0, 0.5, 0, 32)
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
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

function rod(from: THREE.Vector3, to: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const len = from.distanceTo(to)
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat)
  m.position.copy(from).add(to).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
  m.castShadow = true
  return m
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

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

/** Decal on the outside of a side panel; reads correctly from both sides. */
function decal(tex: THREE.Texture, w: number, h: number, x: number, y: number, side: 1 | -1, zOut = 1.04): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.3, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 }),
  )
  m.position.set(x, y, side * zOut)
  if (side < 0) m.rotation.y = Math.PI
  return m
}

/** Rearing chrome horse silhouette, facing +x, about 0.3 m tall. */
function horseShape(): THREE.Shape {
  const p = [
    [0, 0], [0.05, 0.08], [0.03, 0.14], [0.0, 0.19], [-0.07, 0.14], [-0.03, 0.23], [0.05, 0.25], [0.15, 0.26],
    [0.19, 0.31], [0.22, 0.38], [0.25, 0.4], [0.3, 0.37], [0.28, 0.34], [0.24, 0.33], [0.23, 0.27], [0.3, 0.27],
    [0.33, 0.21], [0.29, 0.22], [0.25, 0.23], [0.2, 0.2], [0.16, 0.16], [0.09, 0.15], [0.11, 0.06], [0.09, 0.0],
  ]
  const s = new THREE.Shape()
  s.moveTo(p[0][0], p[0][1])
  for (const [x, y] of p.slice(1)) s.lineTo(x, y)
  s.closePath()
  return s
}

type Mats = Record<'tire' | 'chrome' | 'dark' | 'rimBarrel', THREE.Material>

/** Low-profile tyre on a ten-spoke chrome mag. */
function wheel(mats: Mats): THREE.Group {
  const g = new THREE.Group()
  const { r, w, rim } = WHEEL
  const c = 0.05
  const pts: THREE.Vector2[] = [new THREE.Vector2(rim, -w / 2 + 0.02)]
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2)
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, -w / 2 + c + Math.sin(a) * c))
  }
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2)
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, w / 2 - c + Math.sin(a) * c))
  }
  pts.push(new THREE.Vector2(rim, w / 2 - 0.02))
  const tire = new THREE.Mesh(new THREE.LatheGeometry(pts, 56), mats.tire)
  tire.rotation.x = Math.PI / 2
  tire.castShadow = true
  g.add(tire)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rim, rim, w - 0.05, 48, 1, true), mats.rimBarrel)
  barrel.rotation.x = Math.PI / 2
  g.add(barrel)
  for (const s of [1, -1]) {
    const face = new THREE.Group()
    face.position.z = s * (w / 2 - 0.035)
    const lip = new THREE.Mesh(new THREE.TorusGeometry(rim - 0.01, 0.022, 10, 56), mats.chrome)
    face.add(lip)
    const dish = new THREE.Mesh(new THREE.CircleGeometry(rim - 0.02, 48), mats.dark)
    dish.position.z = -s * 0.03
    if (s < 0) dish.rotation.y = Math.PI
    face.add(dish)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.035, 0.03, 2, 0.01), mats.chrome)
      spoke.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0)
      spoke.rotation.z = a
      face.add(spoke)
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.05, 32), mats.chrome)
    hub.rotation.x = Math.PI / 2
    face.add(hub)
    g.add(face)
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

  const paint = (color: string) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 })
  const glowMat = (color: string, k = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.3 })
  const mats = {
    livery: new THREE.MeshPhysicalMaterial({ map: livery, metalness: 0.6, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    steel: new THREE.MeshStandardMaterial({ color: '#d7dce2', metalness: 0.9, roughness: 0.22 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.06 }),
    red: paint(RED),
    blue: paint(BLUE),
    black: paint('#0f1115'),
    roof: paint('#14161b'),
    interior: new THREE.MeshStandardMaterial({ color: '#15181f', roughness: 0.9 }),
    panel: new THREE.MeshStandardMaterial({ color: '#cbb89a', roughness: 0.6 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.7, side: THREE.DoubleSide }),
    floor: new THREE.MeshStandardMaterial({ color: '#2a2e36', metalness: 0.6, roughness: 0.5 }),
    seat: new THREE.MeshStandardMaterial({ color: '#8b1020', roughness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: '#202329', metalness: 0.5, roughness: 0.5 }),
    rimBarrel: new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 1, roughness: 0.25, side: THREE.DoubleSide }),
    tire: new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#2b3a4a', metalness: 0, roughness: 0.03, transparent: true, opacity: 0.45, envMapIntensity: 2, side: THREE.DoubleSide }),
    visor: new THREE.MeshPhysicalMaterial({ color: '#1e293b', roughness: 0.1, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    lamp: glowMat('#fffbeb', 1.2),
    led: glowMat('#ffffff', 2),
    cyan: glowMat(CYAN),
    pink: glowMat('#e879f9'),
    tail: glowMat('#ef4444', 1.4),
    amber: glowMat('#f59e0b', 1.2),
  }

  // --- Chassis and axles
  jeep.add(boxAt(-2.9, 2.75, 0.3, 0.5, -0.62, 0.62, mats.dark, 0.02))
  for (const x of [WHEEL.front, WHEEL.rear]) jeep.add(rod(v(x, WHEEL.r, -WHEEL.z), v(x, WHEEL.r, WHEEL.z), 0.05, mats.dark))

  // --- Body side profile: rear wheel arch and the cab doorway, extruded across the width.
  const a = Math.asin((BODY.y0 - WHEEL.r) / ARCH)
  {
    const s = new THREE.Shape()
    s.moveTo(BODY.x0, BODY.y0)
    s.lineTo(WHEEL.rear - Math.cos(a) * ARCH, BODY.y0)
    s.absarc(WHEEL.rear, WHEEL.r, ARCH, Math.PI - a, a, true)
    s.lineTo(BODY.x1, BODY.y0)
    s.lineTo(BODY.x1, DOOR.sill)
    s.lineTo(DOOR.x0 + 0.3, DOOR.sill)
    s.quadraticCurveTo(DOOR.x0, DOOR.sill, DOOR.x0, DOOR.sill + 0.3)
    s.lineTo(DOOR.x0, BODY.y1)
    s.lineTo(BODY.x0, BODY.y1)
    s.closePath()
    // Hollow body: two side walls, so the passenger cabin is open inside.
    for (const z of [0.965, -0.965]) {
      const wall = extrudeZ(s, 0.07, [mats.livery, mats.steel], 0.02)
      wall.position.z = z
      jeep.add(wall)
    }
    jeep.add(boxAt(1.42, 1.47, BODY.y0, DOOR.sill, -0.97, 0.97, mats.steel, 0.01)) // front of the cab step
    // Rear wall either side of the entrance
    for (const sgn of [1, -1]) jeep.add(boxAt(BODY.x0, BODY.x0 + 0.06, BODY.y0, BODY.y1, sgn > 0 ? 0.4 : -0.97, sgn > 0 ? 0.97 : -0.4, mats.steel, 0.01))
    jeep.add(boxAt(BODY.x0, BODY.x0 + 0.06, BODY.y0, 0.78, -0.4, 0.4, mats.steel, 0.01)) // under the entrance
    const flare = new THREE.Shape()
    flare.absarc(0, 0, ARCH + 0.09, Math.PI - a, a, true)
    flare.absarc(0, 0, ARCH, a, Math.PI - a, false)
    for (const z of [1.02, -1.02]) {
      const f = extrudeZ(flare, 0.09, mats.chrome, 0.015)
      f.position.set(WHEEL.rear, WHEEL.r, z)
      jeep.add(f)
    }
    // Chrome trim around the doorway edge
    for (const z of [1.015, -1.015]) {
      jeep.add(boxAt(DOOR.x0 - 0.02, DOOR.x0 + 0.02, DOOR.sill + 0.25, BODY.y1, z - 0.02, z + 0.02, mats.chrome, 0.01))
      jeep.add(boxAt(DOOR.x0 + 0.25, BODY.x1, DOOR.sill - 0.02, DOOR.sill + 0.02, z - 0.02, z + 0.02, mats.chrome, 0.01))
    }
  }
  // Side decals: jeepney name on the rear quarter
  {
    const name = textTexture('Antipolo Express', { w: 1024, h: 160, bg: '', fg: YELLOW, border: null, italic: true, glow: '#f97316' })
    for (const s of [1, -1] as const) jeep.add(decal(name, 1.5, 0.24, -2.15, 1.28, s, 1.037))
  }

  // --- Cab: open doorways on both sides with floor, seats, dash and steering wheel inside.
  jeep.add(boxAt(DOOR.x0 - 0.05, BODY.x1, DOOR.sill - 0.04, DOOR.sill, -0.96, 0.96, mats.floor, 0))
  jeep.add(boxAt(1.36, 1.5, DOOR.sill, 1.5, -0.97, 0.97, mats.black, 0.02)) // cowl under the windshield
  jeep.add(boxAt(1.12, 1.36, 1.22, 1.46, -0.92, 0.92, mats.dark, 0.04)) // dashboard
  jeep.add(boxAt(1.12, 1.14, 1.3, 1.36, -0.85, 0.85, mats.cyan, 0)) // dash LED strip
  for (const [z0, z1] of [[-0.9, -0.15], [0.12, 0.9]]) {
    jeep.add(boxAt(0.62, 1.0, DOOR.sill, 1.12, z0, z1, mats.seat, 0.05))
    jeep.add(boxAt(0.55, 0.66, 1.1, 1.62, z0, z1, mats.seat, 0.05))
  }
  {
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 10, 32), mats.black)
    sw.position.set(1.08, 1.52, -0.52)
    sw.rotation.y = Math.PI / 2
    sw.rotation.x = 0.0
    sw.rotateX(-0.5)
    jeep.add(sw)
    jeep.add(rod(v(1.08, 1.52, -0.52), v(1.25, 1.3, -0.52), 0.025, mats.dark))
    jeep.add(rod(v(1.05, 1.05, -0.55), v(1.2, 0.92, -0.55), 0.03, mats.chrome)) // gear stick
  }
  // Grab bars at the doorway
  for (const z of [0.99, -0.99]) jeep.add(rod(v(DOOR.x0 + 0.05, 1.1, z), v(DOOR.x0 + 0.05, 2.05, z), 0.018, mats.chrome))

  // --- Passenger cabin (open): floor, panelled walls, two long benches facing
  // each other, ceiling with lights and chrome grab rails.
  jeep.add(boxAt(0.45, 0.52, 0.75, 2.14, -0.95, 0.95, mats.interior, 0)) // partition behind the cab
  jeep.add(boxAt(BODY.x0 + 0.04, 0.46, 0.72, 0.78, -0.94, 0.94, mats.floor, 0))
  for (const z of [0.927, -0.927]) jeep.add(boxAt(BODY.x0 + 0.06, 0.45, 0.78, 1.5, z - 0.005, z + 0.005, mats.panel, 0))
  for (const z of [1, -1]) jeep.add(boxAt(WHEEL.rear - 0.5, WHEEL.rear + 0.5, 0.78, 0.98, z * 0.6, z * 0.92, mats.dark, 0.04)) // wheel wells
  for (const z of [1, -1]) {
    const inner = z * 0.5
    const wall = z * 0.92
    jeep.add(boxAt(-2.85, 0.38, 0.78, 1.04, Math.min(inner + z * 0.05, wall), Math.max(inner + z * 0.05, wall), mats.dark, 0.02)) // bench base
    jeep.add(boxAt(-2.88, 0.4, 1.04, 1.16, Math.min(inner, wall), Math.max(inner, wall), mats.seat, 0.045)) // cushion
    // Backrest: padded sections against the wall under the window sill
    for (let i = 0; i < 6; i++) {
      const x0 = -2.86 + i * 0.54
      jeep.add(boxAt(x0, x0 + 0.52, 1.2, 1.56, Math.min(wall, wall - z * 0.07), Math.max(wall, wall - z * 0.07), mats.seat, 0.035))
    }
  }
  jeep.add(boxAt(BODY.x0 + 0.04, 0.46, 2.12, 2.14, -0.94, 0.94, mats.ceiling, 0))
  for (let i = 0; i < 6; i++) jeep.add(boxAt(-2.6 + i * 0.55, -2.42 + i * 0.55, 2.1, 2.12, -0.12, 0.12, mats.pink, 0)) // ceiling lights
  // Grab rails (hawakan) along the ceiling, hung from short drops
  for (const z of [0.42, -0.42]) {
    jeep.add(rod(v(-2.92, 1.98, z), v(0.42, 1.98, z), 0.02, mats.chrome))
    for (let i = 0; i < 7; i++) jeep.add(rod(v(-2.8 + i * 0.52, 1.98, z), v(-2.8 + i * 0.52, 2.12, z), 0.012, mats.chrome))
  }
  {
    const lamp = new THREE.PointLight('#fff1dc', 3.5, 6, 1.6)
    lamp.position.set(-1.2, 1.95, 0)
    jeep.add(lamp)
  }
  const pillarXs = [-2.96, -2.4, -1.84, -1.28, -0.72, -0.16, 0.45]
  for (const x of pillarXs) {
    for (const z of [0.98, -0.98]) jeep.add(boxAt(x - 0.04, x + 0.04, 1.5, 2.16, z - 0.035, z + 0.035, mats.chrome, 0.012))
  }
  for (const z of [1.0, -1.0]) {
    jeep.add(boxAt(BODY.x0, DOOR.x0, 1.49, 1.54, z - 0.03, z + 0.03, mats.chrome, 0.01)) // belt trim
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.35, 12), mats.blue)
    curtain.rotation.z = Math.PI / 2
    curtain.position.set(-1.25, 2.08, z * 1.01)
    jeep.add(curtain)
    // Tinted rain visor over the windows
    const vis = boxAt(-3.0, 0.5, 2.0, 2.03, -0.1, 0.1, mats.visor, 0)
    vis.position.z = z * 1.08
    vis.rotation.x = z * 0.5
    jeep.add(vis)
  }

  // --- Roof: black, with front visor spoiler, LED strips, rear spoiler, route boards, antennas.
  jeep.add(boxAt(-3.12, 1.78, 2.14, 2.24, -1.08, 1.08, mats.roof, 0.04))
  {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(0.26, -0.07)
    s.lineTo(0.26, -0.1)
    s.lineTo(0, -0.05)
    s.closePath()
    const vs = extrudeZ(s, 2.12, mats.black, 0.015)
    vs.position.set(1.72, 2.22, 0)
    jeep.add(vs)
    jeep.add(boxAt(1.8, 1.97, 2.12, 2.13, -1.0, 1.0, mats.cyan, 0)) // LED under the visor
    for (const z of [1.085, -1.085]) {
      jeep.add(boxAt(-3.1, 1.76, 2.15, 2.19, z - 0.01, z + 0.01, mats.cyan, 0))
      jeep.add(boxAt(-3.1, 1.76, 2.2, 2.23, z - 0.012, z + 0.012, mats.chrome, 0))
    }
    // Rear roof wing on two stalks
    jeep.add(boxAt(-3.2, -2.9, 2.36, 2.4, -1.02, 1.02, mats.black, 0.015))
    for (const z of [0.8, -0.8]) jeep.add(boxAt(-3.02, -2.98, 2.24, 2.36, z - 0.03, z + 0.03, mats.chrome, 0))
    const side = new THREE.MeshStandardMaterial({ map: textTexture('CUBAO • MARCOS HIGHWAY • ANTIPOLO', { w: 2048, h: 128, bg: YELLOW, fg: BLUE }), roughness: 0.5 })
    jeep.add(boxAt(-2.7, 1.0, 2.24, 2.44, -0.98, 0.98, [mats.red, mats.red, mats.roof, mats.roof, side, side], 0.0))
    const front = new THREE.MeshStandardMaterial({ map: textTexture('CUBAO – ANTIPOLO', { bg: '#fffdf5' }), roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.15 })
    front.emissiveMap = front.map
    jeep.add(boxAt(1.12, 1.28, 2.24, 2.58, -0.8, 0.8, [front, mats.red, mats.red, mats.red, mats.red, mats.red], 0.0))
    // Antennas with red tips, raked back
    const tip = glowMat('#ef4444', 1)
    for (const [x, z] of [[1.6, 1.0], [1.6, -1.0], [1.45, 0.9], [-3.0, -1.0]]) {
      const top = v(x - 0.35, 3.15, z * 1.02)
      jeep.add(rod(v(x, 2.24, z), top, 0.008, mats.chrome))
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), tip)
      ball.position.copy(top)
      jeep.add(ball)
    }
  }

  // --- Windshield: tinted split glass with a name banner across the top.
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
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.13),
      new THREE.MeshStandardMaterial({ map: textTexture('★ ANTIPOLO ★', { w: 1024, h: 96, bg: '#0b1b3f', fg: CYAN, border: null, glow: CYAN }), transparent: true, opacity: 0.95 }),
    )
    banner.rotation.y = Math.PI / 2
    banner.position.set(0.012, 0.55, 0)
    ws.add(banner)
    for (const z of [-0.97, 0, 0.97]) ws.add(boxAt(-0.04, 0.04, 0, 0.66, z - 0.04, z + 0.04, mats.chrome, 0.01))
    ws.add(boxAt(-0.04, 0.05, 0.6, 0.66, -1.0, 1.0, mats.chrome, 0.01))
    jeep.add(ws)
  }

  // --- Hood: stainless with a candy blue stripe, chrome horses and air horns.
  {
    const s = new THREE.Shape()
    s.moveTo(1.45, 0.58)
    s.lineTo(2.88, 0.58)
    s.lineTo(2.88, 1.16)
    s.quadraticCurveTo(2.2, 1.28, 1.45, 1.34)
    s.closePath()
    jeep.add(extrudeZ(s, 1.46, mats.steel, 0.05))
    const stripe = extrudeZ(s, 0.22, mats.blue, 0.02)
    stripe.scale.set(1.002, 1.012, 1)
    jeep.add(stripe)
    for (const z of [0.3, -0.3]) {
      const horse = extrudeZ(horseShape(), 0.035, mats.steel, 0.008)
      horse.position.set(2.4, 1.2, z)
      jeep.add(horse)
    }
    for (const z of [0.45, -0.45]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.36, 18, 1, true), mats.chrome)
      horn.rotation.z = -Math.PI / 2
      horn.position.set(1.85, 1.34, z)
      jeep.add(horn)
    }
  }

  // --- Front fenders (candy red), running boards with marker lights.
  {
    const R = ARCH + 0.08
    const f = new THREE.Shape()
    f.moveTo(-R, 0.0)
    f.absarc(0, 0, R, Math.PI, 0, true)
    f.lineTo(R + 0.08, 0.0)
    f.lineTo(R + 0.08, 0.06)
    f.lineTo(ARCH, 0.06)
    f.absarc(0, 0, ARCH, 0, Math.PI, false)
    f.lineTo(-R, 0.0)
    for (const z of [WHEEL.z, -WHEEL.z]) {
      const m = extrudeZ(f, 0.4, mats.red, 0.03)
      m.position.set(WHEEL.front, WHEEL.r + 0.04, z)
      jeep.add(m)
    }
    for (const z of [0.86, -0.86]) jeep.add(boxAt(1.0, 1.5, 0.4, 0.46, z - 0.2, z + 0.2, mats.chrome, 0.01))
  }
  // Chrome side skirts with blue marker lights
  for (const s of [1, -1]) {
    jeep.add(boxAt(-1.25, 1.0, 0.4, 0.52, s * 1.0 - 0.03, s * 1.0 + 0.03, mats.chrome, 0.015))
    jeep.add(boxAt(-3.0, -2.38, 0.4, 0.52, s * 1.0 - 0.03, s * 1.0 + 0.03, mats.chrome, 0.015))
    for (let i = 0; i < 7; i++) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), i % 2 ? mats.cyan : mats.amber)
      lamp.position.set(-1.1 + i * 0.32, 0.46, s * 1.035)
      jeep.add(lamp)
    }
  }

  // --- Front: grille, twin headlights, signals, bull bar, bumper and LED fog bar.
  jeep.add(boxAt(2.86, 2.93, 0.66, 1.12, -0.38, 0.38, mats.dark, 0.01))
  for (let i = 0; i < 11; i++) {
    const z = -0.34 + (i * 0.68) / 10
    jeep.add(boxAt(2.9, 2.97, 0.68, 1.1, z - 0.016, z + 0.016, mats.chrome, 0.008))
  }
  jeep.add(boxAt(2.88, 2.99, 1.1, 1.15, -0.4, 0.4, mats.chrome, 0.012))
  for (const s of [1, -1]) {
    // Twin round headlights per side (outer slightly behind the inner)
    for (const [z, x] of [[0.72, 2.88], [0.5, 2.9]]) {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 32), mats.chrome)
      bezel.rotation.z = Math.PI / 2
      bezel.position.set(x, 1.0, s * z)
      jeep.add(bezel)
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3), mats.lamp)
      lens.rotation.z = -Math.PI / 2
      lens.position.set(x + 0.01, 1.0, s * z)
      jeep.add(lens)
    }
    jeep.add(boxAt(2.86, 2.94, 0.76, 0.84, s * 0.72 - 0.07, s * 0.72 + 0.07, mats.amber, 0.01))
  }
  jeep.add(boxAt(2.92, 3.08, 0.46, 0.64, -1.02, 1.02, mats.chrome, 0.03))
  jeep.add(boxAt(3.08, 3.1, 0.5, 0.6, -0.6, 0.6, mats.led, 0)) // LED fog bar
  {
    const bx = 3.2
    jeep.add(rod(v(bx, 0.9, -0.72), v(bx, 0.9, 0.72), 0.03, mats.chrome))
    jeep.add(rod(v(bx, 0.7, -0.72), v(bx, 0.7, 0.72), 0.03, mats.chrome))
    for (const z of [-0.72, -0.25, 0.25, 0.72]) jeep.add(rod(v(bx, 0.55, z), v(bx, 0.95, z), 0.03, mats.chrome))
    for (const z of [-0.72, 0.72]) jeep.add(rod(v(3.06, 0.55, z), v(bx, 0.55, z), 0.03, mats.chrome))
  }

  // --- Side mirrors on chrome stalks
  for (const s of [1, -1]) {
    jeep.add(rod(v(1.48, 1.62, s * 0.98), v(1.6, 1.82, s * 1.22), 0.016, mats.chrome))
    jeep.add(boxAt(1.56, 1.62, 1.8, 2.04, s * 1.24 - 0.11, s * 1.24 + 0.11, mats.chrome, 0.03))
  }

  // --- Rear: open entrance, grab bars, step, LED tail lights, bumper, exhaust, mud flaps.
  for (const z of [0.47, -0.47]) {
    jeep.add(rod(v(-3.08, 0.6, z), v(-3.08, 2.1, z), 0.022, mats.chrome))
    jeep.add(boxAt(-3.07, -3.0, 0.75, 1.42, z * 1.9 - 0.06, z * 1.9 + 0.06, mats.tail, 0.01))
  }
  for (const sgn of [1, -1]) jeep.add(boxAt(-3.06, -3.02, 1.46, 1.5, sgn > 0 ? 0.5 : -0.95, sgn > 0 ? 0.95 : -0.5, mats.tail, 0)) // tail strip, clear of the entrance
  jeep.add(boxAt(-3.32, -3.0, 0.36, 0.43, -0.45, 0.45, mats.chrome, 0.01))
  jeep.add(boxAt(-3.14, -3.02, 0.46, 0.6, -1.0, -0.45, mats.chrome, 0.02))
  jeep.add(boxAt(-3.14, -3.02, 0.46, 0.6, 0.45, 1.0, mats.chrome, 0.02))
  jeep.add(rod(v(-2.6, 0.3, 0.62), v(-3.3, 0.3, 0.62), 0.05, mats.chrome))
  for (const z of [0.82, -0.82]) jeep.add(boxAt(-2.47, -2.45, 0.1, 0.5, z - 0.17, z + 0.17, mats.chrome, 0.0))

  // --- Wheels
  for (const x of [WHEEL.front, WHEEL.rear]) {
    for (const z of [WHEEL.z, -WHEEL.z]) {
      const w = wheel(mats)
      w.position.set(x, WHEEL.r, z)
      jeep.add(w)
    }
  }

  // --- Underglow on the ground
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 2.8),
    new THREE.MeshBasicMaterial({ map: glowTexture('rgba(217,70,239,0.85)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.set(-0.4, 0.012, 0)
  jeep.add(glow)

  jeep.position.x = -0.04
  return jeep
}
