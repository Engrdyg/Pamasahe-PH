// B-roll for the video: the app's patok jeepney driving down a city street at
// golden hour. Deterministic: render(t, shot) draws one frame for time t.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildJeepney } from '../../src/hero3d/jeepney'

const SPEED = 9 // m/s along +x
const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })()

function windowsTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#2a3240'
  g.fillRect(0, 0, 64, 128)
  for (let y = 6; y < 128; y += 14) for (let x = 5; x < 64; x += 14) {
    g.fillStyle = rnd() < 0.45 ? '#ffd88a' : '#3c4a5e'
    g.fillRect(x, y, 8, 9)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function roadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#3a3d44'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
  }
  // dashed centre line (texture u runs along the road)
  g.fillStyle = '#f5f5f0'
  g.fillRect(0, 124, 150, 8)
  // yellow edge lines
  g.fillStyle = '#f2c230'
  g.fillRect(0, 6, 256, 6)
  g.fillRect(0, 244, 256, 6)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

export function mount(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(canvas.width, canvas.height, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  // Golden-hour sky gradient
  const sky = document.createElement('canvas')
  sky.width = 2
  sky.height = 256
  const sg = sky.getContext('2d')!
  const grad = sg.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#3d6fb6')
  grad.addColorStop(0.55, '#f6b26b')
  grad.addColorStop(1, '#ffd9a0')
  sg.fillStyle = grad
  sg.fillRect(0, 0, 2, 256)
  const skyTex = new THREE.CanvasTexture(sky)
  skyTex.colorSpace = THREE.SRGBColorSpace
  scene.background = skyTex
  scene.fog = new THREE.Fog('#f3c48c', 40, 160)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.7
  scene.add(new THREE.HemisphereLight('#ffe3b8', '#4a4f5c', 0.7))
  const sun = new THREE.DirectionalLight('#ffd29a', 2.6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 })
  scene.add(sun)
  scene.add(sun.target)

  // Road, sidewalks, buildings, street lights: a 400 m strip that the jeep drives along.
  const LEN = 400
  const road = roadTexture()
  road.repeat.set(LEN / 8, 1)
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 9), new THREE.MeshStandardMaterial({ map: road, roughness: 0.9 }))
  roadMesh.rotation.x = -Math.PI / 2
  roadMesh.position.set(LEN / 2 - 40, 0, 0)
  roadMesh.receiveShadow = true
  scene.add(roadMesh)
  const walkMat = new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.95 })
  for (const z of [-6.5, 6.5]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.2, 4), walkMat)
    w.position.set(LEN / 2 - 40, 0.1, z)
    w.receiveShadow = true
    scene.add(w)
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(LEN * 2, 300), new THREE.MeshStandardMaterial({ color: '#7d7a70', roughness: 1 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(LEN / 2 - 40, -0.02, 0)
  scene.add(ground)
  const winTex = windowsTexture()
  const facade = ['#d9c7a8', '#c9d4dc', '#e2b89b', '#b7c7b0', '#d6d0c4', '#9fb3c8']
  for (const side of [-1, 1]) {
    let x = -40
    while (x < LEN - 40) {
      const w = 6 + rnd() * 10
      const h = 6 + rnd() * (rnd() < 0.2 ? 40 : 18)
      const d = 8 + rnd() * 6
      const tex = winTex.clone()
      tex.needsUpdate = true
      tex.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 8)))
      const mats = [
        new THREE.MeshStandardMaterial({ color: facade[Math.floor(rnd() * facade.length)], roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffcf7a', emissiveMap: tex, emissiveIntensity: 0.25, roughness: 0.6 }),
      ]
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mats[0], mats[0], mats[0], mats[0], side > 0 ? mats[0] : mats[1], side > 0 ? mats[1] : mats[0]])
      b.position.set(x + w / 2, h / 2, side * (8.5 + d / 2))
      b.castShadow = true
      b.receiveShadow = true
      scene.add(b)
      x += w + 0.8 + rnd() * 2
    }
  }
  const poleMat = new THREE.MeshStandardMaterial({ color: '#5b6270', metalness: 0.6, roughness: 0.4 })
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffe08a', emissiveIntensity: 1.5 })
  for (let x = -30; x < LEN - 40; x += 22) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), poleMat)
      pole.position.set(x + (side > 0 ? 11 : 0), 3, side * 5.2)
      pole.castShadow = true
      scene.add(pole)
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), poleMat)
      arm.position.set(pole.position.x, 6, side * 4.5)
      scene.add(arm)
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), lampMat)
      lamp.position.set(pole.position.x, 5.94, side * 3.8)
      scene.add(lamp)
    }
  }
  // Parked / passing cars as simple coloured boxes for scale
  const carCols = ['#c0392b', '#2c3e50', '#ecf0f1', '#16a085', '#8e44ad']
  const cars: THREE.Mesh[] = []
  for (let i = 0; i < 14; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 1.8), new THREE.MeshStandardMaterial({ color: carCols[i % carCols.length], metalness: 0.5, roughness: 0.35 }))
    car.position.set(-20 + i * 26 + rnd() * 6, 0.75, i % 2 ? 2.6 : -2.4)
    car.castShadow = true
    car.userData.v = i % 2 ? -7 : 6.5 // oncoming on one lane
    car.userData.x0 = car.position.x
    scene.add(car)
    cars.push(car)
  }

  const jeep = buildJeepney()
  jeep.position.z = -2.2 // our lane
  scene.add(jeep)
  const wheels: THREE.Object3D[] = []
  jeep.traverse((o) => {
    if (o.userData.wheel) wheels.push(o)
    if ((o as THREE.Mesh).isMesh) o.castShadow = true
  })

  const camera = new THREE.PerspectiveCamera(32, canvas.width / canvas.height, 0.1, 400)

  type Shot = 'track' | 'front' | 'aerial' | 'wheel' | 'rear'
  return {
    render(t: number, shot: Shot, local: number) {
      const x = SPEED * t
      jeep.position.x = x
      jeep.position.y = Math.sin(t * 9) * 0.015 // engine idle shake
      for (const w of wheels) w.rotation.z = -(x / 0.44)
      for (const c of cars) c.position.x = c.userData.x0 + c.userData.v * t
      sun.position.set(x - 30, 25, -20)
      sun.target.position.set(x, 0, 0)
      const at = new THREE.Vector3(x + 0.4, 1.2, -2.2)
      // `local` is 0..1 progress within the shot, for slow camera moves
      switch (shot) {
        case 'track':
          // three-quarter tracking shot from across the street, drifting back
          camera.fov = 42
          camera.position.set(x + 7.5 - local * 5, 2.1 + local * 0.6, -2.2 + 8.2)
          break
        case 'front':
          camera.fov = 28
          camera.position.set(x + 11 - local * 3, 0.6 + local * 0.3, -2.2 + 5.5)
          at.set(x + 1.5, 1.0, -2.2)
          break
        case 'aerial':
          // high shot over the street, lowering as it follows
          camera.fov = 48
          camera.position.set(x - 6 + local * 5, 26 - local * 7, -2.2 + 3.5)
          at.set(x + 2, 0, -2.2)
          break
        case 'wheel':
          camera.fov = 22
          camera.position.set(x + 2.6 + local * 0.4, 0.55, -2.2 + 3.6 - local * 0.6)
          at.set(x + 2.05, 0.5, -2.2 + 0.86)
          break
        case 'rear':
          camera.fov = 34
          camera.position.set(x - 9 + local * 1.5, 2.6, -2.2 - 3.5)
          at.set(x + 1, 1.3, -2.2)
          break
      }
      camera.updateProjectionMatrix()
      camera.lookAt(at)
      renderer.render(scene, camera)
    },
  }
}
;(window as unknown as { broll: unknown }).broll = { mount }
