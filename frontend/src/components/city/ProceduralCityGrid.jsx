/**
 * ProceduralCityGrid.jsx — Daytime Seoul+New York mixed virtual city
 *
 * Structure:
 *  ProceduralCityGrid (default export)
 *    ├─ CityFloor          : Road · Sidewalk · Crosswalk canvas texture
 *    ├─ DaytimeLighting    : Sunlight · Ambient light · Hemisphere light
 *    ├─ StyleBuildings ×6  : InstancedMesh per building style
 *    ├─ StreetTrees        : Street tree InstancedMesh (trunk · canopy)
 *    ├─ CityVehicles       : Taxi · car InstancedMesh
 *    ├─ BuildingSigns      : Korean+English sign InstancedMesh
 *    ├─ HeroBuildings      : Detailed buildings near room
 *    └─ RoomBuilding       : User figure room entrance (daytime version)
 *
 * Performance: ~270 buildings → 6 InstancedMesh / ~140 street trees → 2 draw calls
 */
import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useTranslation } from 'react-i18next'
import * as THREE from 'three'
import { GRID_COLS, GRID_ROWS, CELL_SIZE, cellToWorld } from '../../store/cityStore'

// ── Utilities ─────────────────────────────────────────────────────────────────────

function seededRand(seed) {
  let s = (seed ^ 0x9e3779b9) >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = (s ^ (s >>> 16)) >>> 0
    return s / 0xffffffff
  }
}
function lerp(a, b, t) { return a + (b - a) * t }
const _dummy = new THREE.Object3D()

// ── Building styles (6 types) ─────────────────────────────────────────────────────────

const BUILDING_STYLES = [
  { color: '#8B5A2B', roughness: 0.88, metalness: 0.00 },  // NYC brownstone brick
  { color: '#C85030', roughness: 0.88, metalness: 0.00 },  // Red brick
  { color: '#F0EDE8', roughness: 0.80, metalness: 0.05 },  // Seoul white retail
  { color: '#E8E0CC', roughness: 0.75, metalness: 0.05 },  // Cream concrete
  { color: '#B8D0E4', roughness: 0.35, metalness: 0.55 },  // Glass office (blue)
  { color: '#D0DCC8', roughness: 0.40, metalness: 0.45 },  // Modern glass (light green)
]

// ── Sign data (Korean + English) ───────────────────────────────────────────────────

const SIGN_DATA = [
  { kr: '강호네 카페',   en: "KANGHO'S CAFE",  bg: '#CC2200', text: '#FFFFFF' },
  { kr: '24시 편의점',  en: '24HR MART',       bg: '#007722', text: '#FFFFFF' },
  { kr: '피규어 월드',  en: 'FIGURE WORLD',    bg: '#1144BB', text: '#FFDD00' },
  { kr: '가상 도시',    en: 'GA-SANG CITY',    bg: '#112244', text: '#FFFFFF' },
  { kr: '테크 하이브',  en: 'TECH HIVE',       bg: '#550088', text: '#FFFFFF' },
  { kr: '메가 쇼룸',   en: 'MEGA SHOWROOM',    bg: '#884400', text: '#FFFFFF' },
  { kr: '씨티 룸',      en: 'CITY ROOMS',      bg: '#0044AA', text: '#FFFFFF' },
  { kr: '탄불 BBQ',    en: 'TANBUL BBQ',       bg: '#AA2200', text: '#FFFFFF' },
  { kr: '전자상가',    en: 'TECH MARKET',      bg: '#003388', text: '#FFFFFF' },
  { kr: '피규어 컬렉션', en: 'FIGURE COLL.',   bg: '#882244', text: '#FFFFFF' },
]

// ── Texture generation ───────────────────────────────────────────────────────────────

const FLOOR_SIZE = GRID_COLS * CELL_SIZE + 60  // 560m (plane 크기)
const FLOOR_PX   = 2048

/** World coordinates → canvas pixels */
function wp(w) { return (w + FLOOR_SIZE / 2) / FLOOR_SIZE * FLOOR_PX }

/**
 * Generate road+sidewalk+crosswalk texture for entire city on a single 2048px canvas
 * Performance: 1 draw call floor (removes 22 line meshes)
 */
function makeDaytimeFloorTex() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = FLOOR_PX
  const ctx = canvas.getContext('2d')

  // ─ Base block area (light concrete) ─
  ctx.fillStyle = '#C2B89E'
  ctx.fillRect(0, 0, FLOOR_PX, FLOOR_PX)

  // ─ Road (grid boundary ±6m) ─
  const rh = 6 / FLOOR_SIZE * FLOOR_PX  // road half-width in px ≈ 21.9px
  const sw = 3 / FLOOR_SIZE * FLOOR_PX  // sidewalk width ≈ 10.9px

  ctx.fillStyle = '#484848'
  for (let gx = 0; gx <= GRID_COLS; gx++) {
    const px = wp(-GRID_COLS / 2 * CELL_SIZE + gx * CELL_SIZE)
    ctx.fillRect(px - rh, 0, rh * 2, FLOOR_PX)
  }
  for (let gz = 0; gz <= GRID_ROWS; gz++) {
    const pz = wp(-GRID_ROWS / 2 * CELL_SIZE + gz * CELL_SIZE)
    ctx.fillRect(0, pz - rh, FLOOR_PX, rh * 2)
  }

  // ─ Sidewalk (inside road, slightly lighter gray) ─
  ctx.fillStyle = '#B8AE9C'
  for (let gx = 0; gx < GRID_COLS; gx++) {
    for (let gz = 0; gz < GRID_ROWS; gz++) {
      const x0 = wp(-GRID_COLS / 2 * CELL_SIZE + gx * CELL_SIZE) + rh
      const z0 = wp(-GRID_ROWS / 2 * CELL_SIZE + gz * CELL_SIZE) + rh
      const cw2 = CELL_SIZE / FLOOR_SIZE * FLOOR_PX - rh * 2
      ctx.fillRect(x0, z0, cw2, cw2)
    }
  }

  // ─ Curb lines (road edge) ─
  ctx.fillStyle = '#868474'
  for (let gx = 0; gx <= GRID_COLS; gx++) {
    const px = wp(-GRID_COLS / 2 * CELL_SIZE + gx * CELL_SIZE)
    ctx.fillRect(px - rh - 1, 0, 2, FLOOR_PX)
    ctx.fillRect(px + rh - 1, 0, 2, FLOOR_PX)
  }
  for (let gz = 0; gz <= GRID_ROWS; gz++) {
    const pz = wp(-GRID_ROWS / 2 * CELL_SIZE + gz * CELL_SIZE)
    ctx.fillRect(0, pz - rh - 1, FLOOR_PX, 2)
    ctx.fillRect(0, pz + rh - 1, FLOOR_PX, 2)
  }

  // ─ Yellow center line (dashed) ─
  ctx.strokeStyle = '#F5C800'
  ctx.lineWidth = 3
  ctx.setLineDash([22, 16])
  for (let gx = 0; gx <= GRID_COLS; gx++) {
    const px = wp(-GRID_COLS / 2 * CELL_SIZE + gx * CELL_SIZE)
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, FLOOR_PX); ctx.stroke()
  }
  for (let gz = 0; gz <= GRID_ROWS; gz++) {
    const pz = wp(-GRID_ROWS / 2 * CELL_SIZE + gz * CELL_SIZE)
    ctx.beginPath(); ctx.moveTo(0, pz); ctx.lineTo(FLOOR_PX, pz); ctx.stroke()
  }
  ctx.setLineDash([])

  // ─ Crosswalk stripes (at each intersection) ─
  ctx.fillStyle = 'rgba(255,255,255,0.80)'
  const nS = 6
  for (let gx = 0; gx <= GRID_COLS; gx++) {
    for (let gz = 0; gz <= GRID_ROWS; gz++) {
      const ix = wp(-GRID_COLS / 2 * CELL_SIZE + gx * CELL_SIZE)
      const iz = wp(-GRID_ROWS / 2 * CELL_SIZE + gz * CELL_SIZE)
      const spacing = (rh * 2) / (nS + 1)
      const strW = 4.5
      // North/South crosswalk
      for (let s = 1; s <= nS; s++) {
        const sx = ix - rh + s * spacing
        ctx.fillRect(sx - strW / 2, iz + rh,      strW, sw * 0.88)
        ctx.fillRect(sx - strW / 2, iz - rh - sw * 0.88, strW, sw * 0.88)
      }
      // East/West crosswalk
      for (let s = 1; s <= nS; s++) {
        const sz = iz - rh + s * spacing
        ctx.fillRect(ix + rh,           sz - strW / 2, sw * 0.88, strW)
        ctx.fillRect(ix - rh - sw * 0.88, sz - strW / 2, sw * 0.88, strW)
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Daytime building window texture (glass/reflective feel) */
function makeWindowTexDaytime(seed = 1) {
  const cols = 4, rows = 8, cw = 32, rh = 20
  const canvas = document.createElement('canvas')
  canvas.width = cols * cw; canvas.height = rows * rh
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const r = seededRand(seed)
  const WIN_COLORS = [
    'rgba(180,215,255,0.58)',
    'rgba(200,228,255,0.48)',
    'rgba(160,195,240,0.62)',
    'rgba(215,235,255,0.42)',
    'rgba(240,248,255,0.36)',
  ]

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (r() < 0.82) {
        ctx.fillStyle = WIN_COLORS[Math.floor(r() * WIN_COLORS.length)]
        ctx.fillRect(col * cw + 2, row * rh + 2, cw - 4, rh - 4)
        ctx.strokeStyle = 'rgba(160,195,230,0.38)'
        ctx.lineWidth = 1
        ctx.strokeRect(col * cw + 2, row * rh + 2, cw - 4, rh - 4)
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

/** Hero building window texture (sharper detail) */
function makeWindowTexHero(seed, cols, rows) {
  const cw = 28, rh = 22
  const canvas = document.createElement('canvas')
  canvas.width = cols * cw; canvas.height = rows * rh
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const r = seededRand(seed + 999)
  const WIN_COLORS = [
    'rgba(185,218,255,0.65)',
    'rgba(205,230,255,0.55)',
    'rgba(165,200,244,0.70)',
  ]

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (r() < 0.80) {
        ctx.fillStyle = WIN_COLORS[Math.floor(r() * WIN_COLORS.length)]
        ctx.fillRect(col * cw + 2, row * rh + 2, cw - 4, rh - 4)
        ctx.strokeStyle = 'rgba(170,205,235,0.50)'
        ctx.lineWidth = 1
        ctx.strokeRect(col * cw + 2, row * rh + 2, cw - 4, rh - 4)
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Korean+English sign texture (256×96) */
function makeSignTex({ kr, en, bg, text }) {
  const W = 256, H = 96
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Border
  ctx.strokeStyle = text + 'AA'
  ctx.lineWidth = 3
  ctx.strokeRect(4, 4, W - 8, H - 8)

  // Korean
  ctx.fillStyle = text
  ctx.font = 'bold 26px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(kr, W / 2, H * 0.37)

  // English
  ctx.font = 'bold 15px monospace'
  ctx.fillText(en, W / 2, H * 0.72)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ── City layout generation ────────────────────────────────────────────────────────

function generateDaytimeLayout(roomCell) {
  const styles  = Array.from({ length: 6 }, () => [])  // 6 style buckets
  const hero    = []
  const signs   = []
  const { gx: rx, gz: rz } = roomCell ?? { gx: 5, gz: 5 }

  for (let gz = 0; gz < GRID_ROWS; gz++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      if (gx === rx && gz === rz) continue

      const seed     = gx * 1031 + gz * 37 + 7
      const r        = seededRand(seed)
      const cw2      = cellToWorld(gx, gz)
      const zone     = CELL_SIZE - 12   // 38m 건물 배치 범위
      const isHero   = Math.abs(gx - rx) <= 1 && Math.abs(gz - rz) <= 1
      const cellStyle = Math.floor(r() * 6) % 6

      const count = r() < 0.12 ? 1 : r() < 0.50 ? 2 : r() < 0.82 ? 3 : 4

      for (let b = 0; b < count; b++) {
        const isTall = b === 0 && r() < 0.18
        const isMid  = !isTall && r() < 0.58

        const h = isTall ? lerp(20, 52, r()) : isMid ? lerp(8, 20, r()) : lerp(3, 9, r())
        const w = isTall ? lerp(7,  15, r()) : isMid ? lerp(9, 22, r()) : lerp(8, 26, r())
        const d = w * lerp(0.55, 1.4, r())

        const ox = (r() - 0.5) * Math.max(0, zone - w)
        const oz = (r() - 0.5) * Math.max(0, zone - d)

        const bld = {
          x: cw2.x + ox, y: h / 2, z: cw2.z + oz,
          w, d, h, styleIdx: cellStyle,
          seed: seed * 100 + b,
          signIdx: Math.floor(r() * SIGN_DATA.length),
        }

        if (isHero) {
          hero.push(bld)
        } else {
          styles[cellStyle].push(bld)
        }

        // Sign (35% chance, attached to lower floors)
        if (!isHero && r() < 0.35) {
          signs.push({
            x:       bld.x,
            y:       lerp(2.2, Math.min(5.0, h * 0.35), r()),
            z:       bld.z + d / 2 + 0.14,
            w:       lerp(2.6, 5.0, r()),
            signIdx: bld.signIdx,
          })
        }
      }
    }
  }

  return { styles, hero, signs }
}

/** Street tree positions — placed every 14m along sidewalks */
function generateTreePositions(roomCell) {
  const trees = []
  const SPACING = 14
  const OFFSET  = 7   // 7m from road center
  const { gx: rx, gz: rz } = roomCell ?? { gx: 5, gz: 5 }

  // Horizontal roads (gz boundary)
  for (let gz = 1; gz < GRID_ROWS; gz++) {
    const roadZ = (-GRID_ROWS / 2 + gz) * CELL_SIZE
    for (let gx = 0; gx < GRID_COLS; gx++) {
      if (Math.abs(gx - rx) <= 1 && (Math.abs(gz - rz) <= 1 || Math.abs(gz - 1 - rz) <= 1)) continue
      const x0 = (-GRID_COLS / 2 + gx) * CELL_SIZE + 7
      const x1 = x0 + CELL_SIZE - 14
      for (let tx = x0; tx <= x1; tx += SPACING) {
        const jr = seededRand(Math.floor(tx * 7) + gz * 1000)
        const jx = (jr() - 0.5) * 3
        trees.push({ x: tx + jx, z: roadZ - OFFSET })
        trees.push({ x: tx + jx, z: roadZ + OFFSET })
      }
    }
  }

  // Vertical roads (gx boundary)
  for (let gx = 1; gx < GRID_COLS; gx++) {
    const roadX = (-GRID_COLS / 2 + gx) * CELL_SIZE
    for (let gz = 0; gz < GRID_ROWS; gz++) {
      if (Math.abs(gz - rz) <= 1 && (Math.abs(gx - rx) <= 1 || Math.abs(gx - 1 - rx) <= 1)) continue
      const z0 = (-GRID_ROWS / 2 + gz) * CELL_SIZE + 7
      const z1 = z0 + CELL_SIZE - 14
      for (let tz = z0; tz <= z1; tz += SPACING) {
        const jr = seededRand(Math.floor(tz * 7) + gx * 1000 + 5000)
        const jz = (jr() - 0.5) * 3
        trees.push({ x: roadX - OFFSET, z: tz + jz })
        trees.push({ x: roadX + OFFSET, z: tz + jz })
      }
    }
  }

  return trees
}

/** Vehicle (taxi·car) positions — parked along road edge */
function generateVehiclePositions(roomCell) {
  const taxis = []
  const cars  = []
  const { gx: rx, gz: rz } = roomCell ?? { gx: 5, gz: 5 }

  for (let gz = 1; gz < GRID_ROWS; gz++) {
    const roadZ = (-GRID_ROWS / 2 + gz) * CELL_SIZE
    for (let gx = 0; gx < GRID_COLS; gx++) {
      if (Math.abs(gx - rx) <= 1 && Math.abs(gz - rz) <= 1) continue
      const r = seededRand(gx * 73 + gz * 41 + 8888)
      if (r() < 0.40) {
        const cx  = (-GRID_COLS / 2 + gx + 0.5) * CELL_SIZE
        const x   = cx + (r() - 0.5) * 20
        const rot = r() < 0.5 ? 0 : Math.PI
        const side = r() < 0.5 ? -3.2 : 3.2
        if (r() < 0.45) {
          taxis.push({ x, z: roadZ + side, rot })
        } else {
          cars.push({ x, z: roadZ + side, rot,
            color: ['#CC2222','#2244AA','#224422','#666666','#553311'][Math.floor(r() * 5)]
          })
        }
      }
    }
  }
  for (let gx = 1; gx < GRID_COLS; gx++) {
    const roadX = (-GRID_COLS / 2 + gx) * CELL_SIZE
    for (let gz = 0; gz < GRID_ROWS; gz++) {
      if (Math.abs(gz - rz) <= 1 && Math.abs(gx - rx) <= 1) continue
      const r = seededRand(gx * 59 + gz * 83 + 7777)
      if (r() < 0.38) {
        const cz  = (-GRID_ROWS / 2 + gz + 0.5) * CELL_SIZE
        const z   = cz + (r() - 0.5) * 20
        const rot = r() < 0.5 ? Math.PI / 2 : -Math.PI / 2
        const side = r() < 0.5 ? -3.2 : 3.2
        if (r() < 0.45) {
          taxis.push({ x: roadX + side, z, rot })
        } else {
          cars.push({ x: roadX + side, z, rot,
            color: ['#CC2222','#2244AA','#224422','#666666','#553311'][Math.floor(r() * 5)]
          })
        }
      }
    }
  }

  return { taxis, cars }
}

// ── Components ──────────────────────────────────────────────────────────────────

function CityFloor() {
  const floorTex = useMemo(() => makeDaytimeFloorTex(), [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <meshStandardMaterial map={floorTex} roughness={0.90} metalness={0.0} />
    </mesh>
  )
}

function DaytimeLighting() {
  return (
    <>
      {/* Ambient light (warm daylight) */}
      <ambientLight intensity={1.80} color="#FFF0E0" />

      {/* Sun directional light + shadows */}
      <directionalLight
        position={[80, 130, 40]}
        intensity={3.5}
        color="#FFF8F0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={420}
        shadow-camera-left={-170}
        shadow-camera-right={170}
        shadow-camera-top={170}
        shadow-camera-bottom={-170}
        shadow-bias={-0.0002}
      />

      {/* Hemisphere light (sky ↔ ground tint) */}
      <hemisphereLight
        args={['#87CEEB', '#A09070', 1.20]}
      />

      {/* Opposite fill light (soften shadows) */}
      <directionalLight position={[-40, 60, -25]} intensity={0.70} color="#C8DCFF" />
    </>
  )
}

// ── InstancedMesh per building style ───────────────────────────────────────────────

function StyleBuildings({ buildings, styleIdx }) {
  const meshRef = useRef()
  const style   = BUILDING_STYLES[styleIdx]

  const material = useMemo(() => {
    const tex = makeWindowTexDaytime(styleIdx * 17 + 3)
    tex.repeat.set(2, 6)
    tex.needsUpdate = true
    return new THREE.MeshStandardMaterial({
      color:     new THREE.Color(style.color),
      map:       tex,
      roughness: style.roughness,
      metalness: style.metalness,
    })
  }, [styleIdx, style.color, style.roughness, style.metalness])

  useEffect(() => {
    if (!meshRef.current || buildings.length === 0) return
    buildings.forEach((b, i) => {
      _dummy.position.set(b.x, b.y, b.z)
      _dummy.scale.set(b.w, b.h, b.d)
      _dummy.rotation.set(0, 0, 0)
      _dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, _dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [buildings])

  if (buildings.length === 0) return null
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, buildings.length]}
      castShadow receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}

// ── Street tree InstancedMesh ──────────────────────────────────────────────────────

const TRUNK_GEO    = new THREE.CylinderGeometry(0.12, 0.18, 2.8, 6)
const TRUNK_MAT    = new THREE.MeshStandardMaterial({ color: '#4A3020', roughness: 0.90 })
const CANOPY1_GEO  = new THREE.SphereGeometry(1.80, 7, 5)
const CANOPY1_MAT  = new THREE.MeshStandardMaterial({ color: '#2D6B2A', roughness: 0.85 })
const CANOPY2_GEO  = new THREE.SphereGeometry(1.35, 7, 5)
const CANOPY2_MAT  = new THREE.MeshStandardMaterial({ color: '#3A8A34', roughness: 0.85 })

function StreetTrees({ positions }) {
  const trunkRef   = useRef()
  const canopy1Ref = useRef()
  const canopy2Ref = useRef()
  const N = positions.length

  useEffect(() => {
    if (!trunkRef.current || N === 0) return
    positions.forEach((p, i) => {
      // 기둥
      _dummy.position.set(p.x, 1.40, p.z)
      _dummy.scale.set(1, 1, 1)
      _dummy.rotation.set(0, 0, 0)
      _dummy.updateMatrix()
      trunkRef.current.setMatrixAt(i, _dummy.matrix)
      // Canopy 1
      _dummy.position.set(p.x, 3.80, p.z)
      _dummy.updateMatrix()
      canopy1Ref.current.setMatrixAt(i, _dummy.matrix)
      // Canopy 2 (slight offset)
      _dummy.position.set(p.x + 0.55, 4.70, p.z + 0.35)
      _dummy.updateMatrix()
      canopy2Ref.current.setMatrixAt(i, _dummy.matrix)
    })
    trunkRef.current.instanceMatrix.needsUpdate   = true
    canopy1Ref.current.instanceMatrix.needsUpdate = true
    canopy2Ref.current.instanceMatrix.needsUpdate = true
  }, [positions, N])

  if (N === 0) return null
  return (
    <>
      <instancedMesh ref={trunkRef}   args={[TRUNK_GEO,   TRUNK_MAT,   N]} castShadow />
      <instancedMesh ref={canopy1Ref} args={[CANOPY1_GEO, CANOPY1_MAT, N]} castShadow />
      <instancedMesh ref={canopy2Ref} args={[CANOPY2_GEO, CANOPY2_MAT, N]} castShadow />
    </>
  )
}

// ── Vehicle InstancedMesh ────────────────────────────────────────────────────────

const CAR_BODY_GEO   = new THREE.BoxGeometry(3.8, 1.2, 1.9)
const CAR_CABIN_GEO  = new THREE.BoxGeometry(2.4, 0.9, 1.7)
const TAXI_BODY_MAT  = new THREE.MeshStandardMaterial({ color: '#FFD700', roughness: 0.55, metalness: 0.30 })
const TAXI_CABIN_MAT = new THREE.MeshStandardMaterial({
  color: '#1A2A3A', roughness: 0.20, metalness: 0.65,
  transparent: true, opacity: 0.78,
})
// Cars have varied colors so individual meshes (few enough to be OK)
function CityVehicles({ taxis, cars }) {
  const taxiBodyRef  = useRef()
  const taxiCabinRef = useRef()
  const TN = taxis.length

  useEffect(() => {
    if (!taxiBodyRef.current || TN === 0) return
    taxis.forEach((v, i) => {
      _dummy.position.set(v.x, 0.60, v.z)
      _dummy.rotation.set(0, v.rot, 0)
      _dummy.scale.set(1, 1, 1)
      _dummy.updateMatrix()
      taxiBodyRef.current.setMatrixAt(i, _dummy.matrix)
      _dummy.position.set(v.x, 1.55, v.z)
      _dummy.updateMatrix()
      taxiCabinRef.current.setMatrixAt(i, _dummy.matrix)
    })
    taxiBodyRef.current.instanceMatrix.needsUpdate  = true
    taxiCabinRef.current.instanceMatrix.needsUpdate = true
  }, [taxis, TN])

  return (
    <>
      {TN > 0 && (
        <>
          <instancedMesh ref={taxiBodyRef}  args={[CAR_BODY_GEO,  TAXI_BODY_MAT,  TN]} castShadow />
          <instancedMesh ref={taxiCabinRef} args={[CAR_CABIN_GEO, TAXI_CABIN_MAT, TN]} castShadow />
        </>
      )}
      {/* Cars — few enough for individual meshes */}
      {cars.map((v, i) => (
        <group key={i} position={[v.x, 0, v.z]} rotation={[0, v.rot, 0]}>
          <mesh position={[0, 0.60, 0]} castShadow>
            <boxGeometry args={[3.8, 1.2, 1.9]} />
            <meshStandardMaterial color={v.color} roughness={0.55} metalness={0.30} />
          </mesh>
          <mesh position={[0, 1.55, 0]} castShadow>
            <boxGeometry args={[2.4, 0.9, 1.7]} />
            <meshStandardMaterial
              color="#1A2A3A" roughness={0.20} metalness={0.65}
              transparent opacity={0.78}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

// ── Building signs ─────────────────────────────────────────────────────────────────

function SignBucket({ signs, texture }) {
  const meshRef = useRef()
  const mat = useMemo(() => {
    const t1 = texture.clone(); t1.needsUpdate = true
    return new THREE.MeshStandardMaterial({
      map: t1, emissiveMap: t1,
      emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25,
      transparent: true, alphaTest: 0.05,
    })
  }, [texture])

  const signGeo = useMemo(() => new THREE.PlaneGeometry(1, 96 / 256), [])

  useEffect(() => {
    if (!meshRef.current || signs.length === 0) return
    signs.forEach((s, i) => {
      _dummy.position.set(s.x, s.y, s.z)
      _dummy.scale.set(s.w, s.w * (96 / 256), 1)
      _dummy.rotation.set(0, 0, 0)
      _dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, _dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [signs])

  if (signs.length === 0) return null
  return (
    <instancedMesh ref={meshRef} args={[signGeo, mat, signs.length]} />
  )
}

function BuildingSigns({ signs }) {
  const signTextures = useMemo(() => SIGN_DATA.map(s => makeSignTex(s)), [])

  const groups = useMemo(() => {
    const g = Array.from({ length: SIGN_DATA.length }, () => [])
    signs.forEach(s => g[s.signIdx]?.push(s))
    return g
  }, [signs])

  return (
    <>
      {groups.map((grp, si) => (
        grp.length > 0
          ? <SignBucket key={si} signs={grp} texture={signTextures[si]} />
          : null
      ))}
    </>
  )
}

// ── Detailed buildings (near room, Hero) ─────────────────────────────────────────────────

function HeroBuilding({ bld }) {
  const style   = BUILDING_STYLES[bld.styleIdx ?? 0]
  const winCols = Math.max(2, Math.floor(bld.w / 3.5))
  const winRows = Math.max(2, Math.floor(bld.h / 3.2))
  const winTex  = useMemo(
    () => makeWindowTexHero(bld.seed, winCols, winRows),
    [bld.seed, winCols, winRows],
  )

  return (
    <group position={[bld.x, 0, bld.z]}>
      {/* Building body */}
      <mesh castShadow receiveShadow position={[0, bld.y, 0]}>
        <boxGeometry args={[bld.w, bld.h, bld.d]} />
        <meshStandardMaterial
          color={style.color}
          roughness={style.roughness}
          metalness={style.metalness}
        />
      </mesh>
      {/* Front windows */}
      <mesh position={[0, bld.y, bld.d / 2 + 0.05]}>
        <planeGeometry args={[bld.w * 0.88, bld.h * 0.92]} />
        <meshStandardMaterial
          map={winTex} transparent alphaTest={0.01}
          roughness={0.18} metalness={0.50}
        />
      </mesh>
    </group>
  )
}

// ── User room building (daytime version) ────────────────────────────────────────────────────

export function RoomBuilding({ worldPos, showHint }) {
  const W = 9, D = 4, H = 5.5
  const { x, z } = worldPos
  const { t } = useTranslation()

  return (
    <group position={[x, 0, z]}>
      {/* Building body — white stucco */}
      <mesh position={[0, H / 2, -D]} castShadow receiveShadow>
        <boxGeometry args={[W * 2, H, D * 2]} />
        <meshStandardMaterial color="#F4F0E8" roughness={0.82} metalness={0.04} />
      </mesh>

      {/* Windows */}
      {[-5.5, 5.5].map((wx, i) => (
        <mesh key={i} position={[wx, 3.2, 0.04]}>
          <planeGeometry args={[2.4, 2.4]} />
          <meshStandardMaterial
            color="#88AACC" transparent opacity={0.55}
            roughness={0.15} metalness={0.70}
          />
        </mesh>
      ))}

      {/* Entrance columns — orange accent */}
      {[-1.65, 1.65].map((ax, i) => (
        <mesh key={i} position={[ax, 2.1, 0.07]}>
          <boxGeometry args={[0.18, 4.2, 0.12]} />
          <meshStandardMaterial color="#E05010" roughness={0.70} />
        </mesh>
      ))}
      {/* Entrance beam */}
      <mesh position={[0, 4.35, 0.07]}>
        <boxGeometry args={[3.5, 0.22, 0.13]} />
        <meshStandardMaterial color="#E05010" roughness={0.70} />
      </mesh>

      {/* Awning */}
      <mesh position={[0, 3.85, 0.80]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[3.2, 0.07, 1.50]} />
        <meshStandardMaterial color="#CC3300" roughness={0.75} />
      </mesh>

      {/* Sign */}
      <Html center position={[0, 5.8, 0.15]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: '#CC3300',
          border: '3px solid #FF6622',
          borderRadius: 7,
          padding: '5px 18px',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          letterSpacing: '0.06em',
          boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
          fontFamily: '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        }}>🏠 {t('room.myFigureRoom')}</div>
      </Html>

      {/* Proximity hint */}
      {showHint && (
        <Html center position={[0, 4.3, 0.22]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(224,80,16,0.92)',
            border: '1px solid #FF8833',
            borderRadius: 6,
            padding: '4px 14px',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>▶ {t('city.moveEnter')}</div>
        </Html>
      )}

      {/* Entrance point light */}
      <pointLight position={[0, 4.2, 1.8]} intensity={18} distance={10} decay={2} color="#FF8844" />
    </group>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProceduralCityGrid({
  roomCell,
  onEnterRoom,
  playerPosRef,
}) {
  const rc = roomCell ?? { gx: 5, gz: 5 }
  const rw = useMemo(() => cellToWorld(rc.gx, rc.gz), [rc.gx, rc.gz])

  const layout    = useMemo(() => generateDaytimeLayout(rc), [rc.gx, rc.gz])
  const treePoses = useMemo(() => generateTreePositions(rc), [rc.gx, rc.gz])
  const vehicles  = useMemo(() => generateVehiclePositions(rc), [rc.gx, rc.gz])

  const [showHint,    setShowHint]    = useState(false)
  const hintRef       = useRef(false)
  const hasEnteredRef = useRef(false)

  useFrame(() => {
    if (!playerPosRef?.current) return
    const px   = playerPosRef.current.x
    const pz   = playerPosRef.current.z
    const dist = Math.sqrt((px - rw.x) ** 2 + (pz - rw.z) ** 2)

    const near = dist < 10
    if (near !== hintRef.current) {
      hintRef.current = near
      setShowHint(near)
    }
    if (!hasEnteredRef.current && dist < 4.5) {
      hasEnteredRef.current = true
      onEnterRoom?.()
    }
  })

  return (
    <group>
      <CityFloor />
      <DaytimeLighting />

      {/* InstancedMesh per building style (6 draw calls) */}
      {layout.styles.map((buildings, si) => (
        <StyleBuildings key={si} buildings={buildings} styleIdx={si} />
      ))}

      {/* Detailed buildings near room */}
      {layout.hero.map((b, i) => <HeroBuilding key={i} bld={b} />)}

      {/* Street trees */}
      <StreetTrees positions={treePoses} />

      {/* Vehicles */}
      <CityVehicles taxis={vehicles.taxis} cars={vehicles.cars} />

      {/* Signs */}
      <BuildingSigns signs={layout.signs} />

      {/* User room building */}
      <RoomBuilding worldPos={rw} showHint={showHint} />
    </group>
  )
}
