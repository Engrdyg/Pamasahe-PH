import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildJeepney } from './jeepney'

export interface HeroScene {
  dispose: () => void
}

const SPIN = 0.35 // rad/s
const FIT_RADIUS = 3.45 // half the jeepney's diagonal, so it fits at any angle

/** Mounts a turntable with a rotating jeepney into `host`. Throws if WebGL is unavailable. */
export function mountHeroScene(host: HTMLElement, opts: { reducedMotion: boolean; onReady: () => void }): HeroScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'hero-canvas'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const env = pmrem.fromScene(room, 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.9

  const hemi = new THREE.HemisphereLight('#ffffff', '#5b6475', 0.6)
  scene.add(hemi)
  const key = new THREE.DirectionalLight('#fff4e0', 2.4)
  key.position.set(4, 8, 5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 5
  key.shadow.camera.bottom = -5
  key.shadow.camera.near = 1
  key.shadow.camera.far = 20
  key.shadow.radius = 4
  key.shadow.bias = -0.0005
  scene.add(key)
  const rim = new THREE.DirectionalLight('#9cc3ff', 1.1)
  rim.position.set(-6, 4, -5)
  scene.add(rim)

  // Turntable: a slightly reflective disc with a chrome edge ring.
  const deckMat = new THREE.MeshStandardMaterial({ color: '#cfd6e0', metalness: 0.3, roughness: 0.55 })
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.12, 96), deckMat)
  deck.position.y = -0.06
  deck.receiveShadow = true
  scene.add(deck)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.66, 0.025, 8, 128),
    new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.15 }),
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.0
  scene.add(ring)

  // Soft contact shadow under the jeepney (turns with it).
  const blob = document.createElement('canvas')
  blob.width = blob.height = 128
  const bg = blob.getContext('2d')!
  const grad = bg.createRadialGradient(64, 64, 4, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.55)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  bg.fillStyle = grad
  bg.fillRect(0, 0, 128, 128)
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 2.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }),
  )
  contact.rotation.x = -Math.PI / 2
  contact.position.y = 0.005

  const turn = new THREE.Group()
  turn.add(contact)
  turn.add(buildJeepney())
  turn.rotation.y = -0.6 // start at a front three-quarter view
  scene.add(turn)

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100)
  const target = new THREE.Vector3(0, 1.05, 0)

  const isDark = () => document.documentElement.classList.contains('dark')
  const applyTheme = () => {
    const dark = isDark()
    deckMat.color.set(dark ? '#273349' : '#cfd6e0')
    hemi.intensity = dark ? 0.35 : 0.6
    key.intensity = dark ? 1.9 : 2.4
    rim.intensity = dark ? 1.6 : 1.1
    scene.environmentIntensity = dark ? 0.7 : 0.9
  }
  applyTheme()
  const themeObs = new MutationObserver(() => {
    applyTheme()
    requestRender()
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  const resize = () => {
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Distance that fits FIT_RADIUS both horizontally and vertically, viewed from slightly above.
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2)
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect)
    const d = Math.max(FIT_RADIUS / Math.sin(hHalf), (FIT_RADIUS * 0.78) / Math.sin(vHalf)) * 1.04
    const elev = THREE.MathUtils.degToRad(13)
    camera.position.set(0, target.y + Math.sin(elev) * d, Math.cos(elev) * d)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    requestRender()
  }

  // Drag to spin (horizontal only; vertical drags keep scrolling the page).
  let dragging = false
  let lastX = 0
  let velocity = 0
  let resumeAt = 0
  const el = renderer.domElement
  const onDown = (e: PointerEvent) => {
    dragging = true
    lastX = e.clientX
    velocity = 0
    el.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    lastX = e.clientX
    turn.rotation.y += dx * 0.012
    velocity = dx * 0.012 * 60
    requestRender()
  }
  const onUp = () => {
    if (!dragging) return
    dragging = false
    resumeAt = performance.now() + 2500
    requestRender()
  }
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)

  let visible = true
  let raf = 0
  let last = performance.now()
  let first = true
  const animating = () => !opts.reducedMotion || Math.abs(velocity) > 0.01
  const frame = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!dragging) {
      if (Math.abs(velocity) > 0.01) {
        turn.rotation.y += velocity * dt
        velocity *= Math.pow(0.04, dt)
      } else if (!opts.reducedMotion && now > resumeAt) {
        turn.rotation.y += SPIN * dt
      }
    }
    renderer.render(scene, camera)
    if (first) {
      first = false
      opts.onReady()
    }
    if (visible && !document.hidden && (animating() || dragging)) raf = requestAnimationFrame(frame)
  }
  function requestRender() {
    if (!raf) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  const ro = new ResizeObserver(resize)
  ro.observe(host)
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) requestRender()
  })
  io.observe(host)
  const onVis = () => {
    if (!document.hidden) requestRender()
  }
  document.addEventListener('visibilitychange', onVis)
  resize()

  return {
    dispose() {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      themeObs.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry.dispose()
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
          mat.dispose()
        }
      })
      env.dispose()
      room.dispose()
      pmrem.dispose()
      renderer.dispose()
      el.remove()
    },
  }
}
