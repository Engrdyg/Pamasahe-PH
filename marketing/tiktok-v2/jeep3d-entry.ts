// Bundled into jeep3d.js for the video: the app's jeepney on a dark turntable,
// rendered on demand for a given rotation (deterministic, no animation loop).
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildJeepney } from '../../src/hero3d/jeepney'

export function mount(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(canvas.width, canvas.height, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.8
  scene.add(new THREE.HemisphereLight('#ffffff', '#3b4660', 0.4))
  const key = new THREE.DirectionalLight('#fff4e0', 2.2)
  key.position.set(4, 8, 5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 })
  key.shadow.radius = 5
  scene.add(key)
  const rim = new THREE.DirectionalLight('#8fb8ff', 2.0)
  rim.position.set(-6, 4, -5)
  scene.add(rim)
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.7, 0.12, 128),
    new THREE.MeshStandardMaterial({ color: '#22304d', metalness: 0.4, roughness: 0.45 }),
  )
  deck.position.y = -0.06
  deck.receiveShadow = true
  scene.add(deck)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.66, 0.03, 8, 160), new THREE.MeshStandardMaterial({ color: '#ffc72c', emissive: '#ffc72c', emissiveIntensity: 0.6 }))
  ring.rotation.x = Math.PI / 2
  scene.add(ring)
  const turn = new THREE.Group()
  turn.add(buildJeepney())
  turn.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true })
  scene.add(turn)
  const camera = new THREE.PerspectiveCamera(28, canvas.width / canvas.height, 0.1, 100)
  return {
    render(rotY: number, dist = 13, elevDeg = 16) {
      turn.rotation.y = rotY
      const e = THREE.MathUtils.degToRad(elevDeg)
      camera.position.set(0, 1.1 + Math.sin(e) * dist, Math.cos(e) * dist)
      camera.lookAt(0, 1.0, 0)
      renderer.render(scene, camera)
    },
  }
}
;(window as unknown as { jeep3d: unknown }).jeep3d = { mount }
