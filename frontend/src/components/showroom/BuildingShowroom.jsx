/**
 * BuildingShowroom.jsx  — v2 "Corporate Campus Garden"
 * ─────────────────────────────────────────────────────────────────────────────
 * A completely redesigned showroom scene for the Atlanta Corporate Office
 * Building.  The previous rectangular-plaza layout has been replaced with:
 *
 *   • Organic winding pedestrian paths (multi-segment curved approach)
 *   • Three distinct low-poly tree varieties (roundhead, columnar, spreading)
 *   • A long reflecting pool with a crossing bridge (replaces circular fountain)
 *   • Colourful flower beds scattered along path edges
 *   • Dark-green hedge borders defining "garden rooms"
 *   • A tri-slab abstract entrance sculpture
 *   • Embedded path-marker lights (glowing ground dots)
 *   • Warmer dawn/morning sky and lighting palette
 *
 * ┌───────────────── TUNING QUICK-REFERENCE ───────────────────────────────┐
 * │  BUILDING_SCALE      overall model multiplier  (1.0 = real-world m)   │
 * │  PARK_HALF           half-extent of park in metres                    │
 * │  TREE_COUNTS         { round, columnar, spreading }  tree quantities  │
 * │  POOL_LENGTH         reflecting pool length (metres)                  │
 * │  SUN_POSITION        [x,y,z] — move to shift time-of-day              │
 * │  AMBIENT_INTENSITY   base fill light                                  │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Building footprint after auto-centering (scale 1.0):
 *   Width  ≈  61 m  (X axis)
 *   Depth  ≈ 212 m  (Z axis)
 *   Height ≈  97 m  (Y axis)
 *
 * Served from: /public/models/atlanta_office.draco.glb  (Draco-compressed)
 */

import {
  useRef, useMemo, useEffect, useLayoutEffect,
  Suspense, useState,
} from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  useGLTF, Sky, OrbitControls, PerformanceMonitor,
  ContactShadows, useProgress,
  KeyboardControls, useKeyboardControls,
} from '@react-three/drei'
import * as THREE from 'three'

// ══════════════════════════════════════════════════════════════════════════════
//  GLOBAL TUNING CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/** Scale applied to the entire building group. 1.0 = real-world metres. */
const BUILDING_SCALE = 1.0

/** Half-width / half-depth of the visible park ground (metres from centre). */
const PARK_HALF = 320

/**
 * Tree instance counts per variety.
 * Increase to add more trees; decrease for better GPU performance.
 */
const TREE_COUNTS = { round: 38, columnar: 26, spreading: 22 }

/** Reflecting pool length (metres). Width is POOL_LENGTH / 5.5. */
const POOL_LENGTH = 58

/** Sun direction vector [x, y, z]. Higher Y = midday; lower = morning/evening. */
const SUN_POSITION = [60, 90, 80]

/** Directional (sun) light intensity. */
const SUN_INTENSITY = 2.0

/** Ambient fill intensity — prevents fully-black shadows. */
const AMBIENT_INTENSITY = 0.50

// ── Model path ────────────────────────────────────────────────────────────────
const MODEL_URL = '/models/atlanta_office.draco.glb'

// ══════════════════════════════════════════════════════════════════════════════
//  WALK MODE — KEYBOARD + CHARACTER CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * KeyboardControls key map.
 * Add entries here to support extra bindings (e.g. gamepad axes).
 */
const KEYBOARD_MAP = [
  { name: 'forward',   keys: ['ArrowUp',    'KeyW'] },
  { name: 'backward',  keys: ['ArrowDown',  'KeyS'] },
  { name: 'leftward',  keys: ['ArrowLeft',  'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'run',       keys: ['ShiftLeft',  'ShiftRight'] },
]

/** Walking speed in metres per second. Increase for faster traversal. */
const WALK_SPEED = 30
/** Running speed (Shift held). */
const RUN_SPEED  = 70
/** Camera-follow smoothing factor per frame (0 = instant, higher = laggier). */
const CAM_LERP   = 0.07
/**
 * Camera offset from character in walk mode [x, y, z].
 * Positive Y = higher above character; positive Z = further behind.
 * Decrease Y for a more ground-level feel; decrease Z for closer framing.
 */
const CAM_OFFSET_Y = 26
const CAM_OFFSET_Z = 50
/** Character starts near the south entrance plaza. */
const CHAR_START = [0, 0, 250]

// ══════════════════════════════════════════════════════════════════════════════
//  SEEDED PRNG  (deterministic pseudo-random — same result on every render)
// ══════════════════════════════════════════════════════════════════════════════
function makePRNG(seed = 7) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROCEDURAL TEXTURES
// ══════════════════════════════════════════════════════════════════════════════

/** Fine grass texture with blade-stipple detail. */
function makeGrassTex(repeat = 40) {
  const S = 512, c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#4E7C3A'; ctx.fillRect(0, 0, S, S)
  const rng = makePRNG(1)
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = rng() > 0.5 ? '#3C6B2A' : '#5E9444'
    const x = rng() * S, y = rng() * S
    ctx.fillRect(x, y, rng() * 2 + 1, rng() * 6 + 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  return t
}

/** Brushed concrete / washed stone path texture. */
function makePathTex(repeat = 18) {
  const S = 512, c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#B8B0A2'; ctx.fillRect(0, 0, S, S)
  const rng = makePRNG(2)
  // irregular stone lines
  ctx.strokeStyle = '#A09890'; ctx.lineWidth = 2
  for (let i = 0; i < 28; i++) {
    ctx.beginPath()
    ctx.moveTo(rng() * S, rng() * S)
    ctx.bezierCurveTo(rng() * S, rng() * S, rng() * S, rng() * S, rng() * S, rng() * S)
    ctx.stroke()
  }
  // aggregate speckle
  for (let i = 0; i < 3000; i++) {
    const v = Math.floor(rng() * 30 - 15)
    ctx.fillStyle = `rgba(${160 + v},${152 + v},${144 + v},0.4)`
    ctx.beginPath(); ctx.arc(rng() * S, rng() * S, rng() * 3 + 1, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  return t
}

/** Base earth / mulch texture for garden beds and edges. */
function makeEarthTex(repeat = 25) {
  const S = 256, c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#6B5440'; ctx.fillRect(0, 0, S, S)
  const rng = makePRNG(3)
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = rng() > 0.5 ? '#5C4634' : '#7A6250'
    ctx.beginPath(); ctx.arc(rng() * S, rng() * S, rng() * 4 + 1, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  return t
}

// ══════════════════════════════════════════════════════════════════════════════
//  ATLANTA BUILDING  (GLB, auto-centred via Box3)
// ══════════════════════════════════════════════════════════════════════════════

function AtlantaBuilding() {
  const { scene } = useGLTF(MODEL_URL, true)   // true = Draco decoder
  const wrapRef   = useRef()

  const cloned = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = o.receiveShadow = true
    })
    return clone
  }, [scene])

  /**
   * Auto-centre:  the FBX→GLB export has a large hidden translation offset
   * buried in node matrices.  We compute the real bounding box AFTER Three.js
   * has resolved all transforms, then shift the wrapper group so the model
   * sits flush on y=0, centred at x=z=0.
   *
   * ↳ To intentionally offset the building:
   *     wrapRef.current.position.x += 20   // shift 20 m east
   *     wrapRef.current.position.z -= 15   // shift 15 m north
   */
  useLayoutEffect(() => {
    if (!wrapRef.current) return
    const box    = new THREE.Box3().setFromObject(cloned)
    const centre = box.getCenter(new THREE.Vector3())
    wrapRef.current.position.set(-centre.x, -box.min.y, -centre.z)
  }, [cloned])

  return (
    /**
     * BUILDING SIZE & ROTATION
     *   <group scale={1.5}>           → 50 % larger
     *   <group rotation={[0, Math.PI/2, 0]}>  → 90° turn
     */
    <group scale={[BUILDING_SCALE, BUILDING_SCALE, BUILDING_SCALE]}>
      <group ref={wrapRef}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}
useGLTF.preload(MODEL_URL, true)

// ══════════════════════════════════════════════════════════════════════════════
//  GROUND LAYERS  (base earth + lawn)
// ══════════════════════════════════════════════════════════════════════════════

function ParkGround() {
  const grassTex = useMemo(() => makeGrassTex(PARK_HALF / 7), [])
  const earthTex = useMemo(() => makeEarthTex(PARK_HALF / 11), [])
  const size = PARK_HALF * 2

  return (
    <group>
      {/* Wide earth base — sits just below grass to prevent z-fighting */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[size + 100, size + 100]} />
        <meshStandardMaterial map={earthTex} roughness={1} />
      </mesh>

      {/* Main lawn — grass over the park area */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={grassTex} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  WINDING PATH NETWORK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A "path" is an array of segment descriptors.  Each segment is a small flat
 * plane placed at an angle — enough segments create a convincing curved lane.
 *
 * Segment shape: [centerX, centerZ, width, segLen, rotY_radians]
 *
 * ↳ Add segments or adjust rotY to reshape any path.
 * ↳ Change 'w' (width) per segment for tapering effects.
 */

const W_MAIN = 12    // main approach path width (metres)
const W_SIDE = 8     // secondary path width
const W_CROSS = 6    // cross-connector width

/** Build a curved path by stepping along a sinusoidal spine. */
function genSinePath(zStart, zEnd, xAmplitude, xPhase, width, segCount = 14) {
  const segs = []
  const dz   = (zEnd - zStart) / segCount
  for (let i = 0; i < segCount; i++) {
    const z0  = zStart + i * dz
    const z1  = z0 + dz
    const x0  = xAmplitude * Math.sin(xPhase + (i / segCount) * Math.PI * 2)
    const x1  = xAmplitude * Math.sin(xPhase + ((i + 1) / segCount) * Math.PI * 2)
    const cx  = (x0 + x1) / 2
    const cz  = (z0 + z1) / 2
    const rotY = Math.atan2(x1 - x0, z1 - z0)  // tangent angle
    segs.push([cx, cz, width, Math.abs(dz) + 1.5, rotY])
  }
  return segs
}

/** Build a straight path from [x0,z0] to [x1,z1]. */
function genStraightPath(x0, z0, x1, z1, width) {
  const len  = Math.hypot(x1 - x0, z1 - z0)
  const rotY = Math.atan2(x1 - x0, z1 - z0)
  return [[(x0 + x1) / 2, (z0 + z1) / 2, width, len, rotY]]
}

const ALL_PATH_SEGMENTS = [
  // ── Main south approach (winding, 12 m wide) ─────────────────────────────
  // Runs from z=+120 (building south face) down to z=+300 (park edge)
  // Gentle S-curve: peak amplitude 18 m, phase offset 0.
  ...genSinePath(120, 300, 18, 0,   W_MAIN, 16),

  // ── North service path (straighter, narrower) ─────────────────────────────
  ...genSinePath(-120, -290, 10, 1.0, W_SIDE, 12),

  // ── East side path (runs along Z from -100 to +100, offset x=+70) ────────
  ...genSinePath(-100, 100,  8, 0.5, W_SIDE, 12).map(([x, z, w, d, r]) => [x + 70, z, w, d, r]),

  // ── West side path (mirror of east) ───────────────────────────────────────
  ...genSinePath(-100, 100,  8, 0.5, W_SIDE, 12).map(([x, z, w, d, r]) => [-x - 70, z, w, d, r]),

  // ── Cross connector (east–west at z=+130, connecting side paths) ──────────
  ...genStraightPath(-75, 160,  75, 160, W_CROSS),
  ...genStraightPath(-75,-145,  75,-145, W_CROSS),

  // ── Diagonal garden paths (NE and SW diagonals for visual interest) ────────
  ...genStraightPath( 78, 105, 155, 230, W_CROSS),
  ...genStraightPath(-78, 105,-155, 230, W_CROSS),
]

function WindingPaths() {
  const pathTex = useMemo(() => makePathTex(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    map: pathTex, roughness: 0.8, metalness: 0,
  }), [pathTex])

  return (
    <group position={[0, 0.02, 0]}>
      {ALL_PATH_SEGMENTS.map(([cx, cz, w, d, rotY], i) => (
        <mesh key={i} receiveShadow
              rotation={[-Math.PI / 2, 0, rotY]}
              position={[cx, 0, cz]}>
          <planeGeometry args={[w, d]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  REFLECTING POOL  (long rectangular, with bridge)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * The pool is positioned at the end of the main south approach,
 * directly in front of the building entrance.
 *
 * ↳ Change POOL_Z to move it closer or further from the entrance.
 * ↳ Change POOL_LENGTH (constant at top) to resize.
 * ↳ Change POOL_WIDTH_RATIO to alter proportions (default 1:5.5).
 */
const POOL_Z          = 155   // Z-centre of the pool (metres from scene origin)
const POOL_WIDTH_RATIO = 5.5  // length / width ratio

function ReflectingPool() {
  const poolLen   = POOL_LENGTH
  const poolW     = poolLen / POOL_WIDTH_RATIO
  const rimT      = 0.6   // rim thickness (metres)
  const rimH      = 0.45  // rim height above ground
  const waterRef  = useRef()

  /** Animate a subtle ripple by slowly panning the water colour offset. */
  useFrame((state) => {
    if (waterRef.current?.material) {
      const t = state.clock.elapsedTime
      waterRef.current.material.color.setHSL(0.58, 0.55, 0.35 + Math.sin(t * 0.4) * 0.04)
    }
  })

  return (
    <group position={[0, 0, POOL_Z]}>
      {/* Concrete basin floor (slightly recessed) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[poolW - rimT, poolLen - rimT]} />
        <meshStandardMaterial color="#8A9BA8" roughness={0.6} />
      </mesh>

      {/* Water surface */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[poolW - rimT - 0.3, poolLen - rimT - 0.3]} />
        <meshStandardMaterial
          color="#4A8EC4" roughness={0.05} metalness={0.3}
          transparent opacity={0.82} envMapIntensity={1.8}
        />
      </mesh>

      {/* Rim — four sides (north, south, east, west) */}
      {[
        { pos: [0, rimH / 2, poolLen / 2],  size: [poolW + rimT * 2, rimH, rimT] },
        { pos: [0, rimH / 2, -poolLen / 2], size: [poolW + rimT * 2, rimH, rimT] },
        { pos: [poolW / 2, rimH / 2, 0],    size: [rimT, rimH, poolLen] },
        { pos: [-poolW / 2, rimH / 2, 0],   size: [rimT, rimH, poolLen] },
      ].map(({ pos, size }, i) => (
        <mesh key={i} castShadow receiveShadow position={pos}>
          <boxGeometry args={size} />
          <meshStandardMaterial color="#CBBFAF" roughness={0.8} />
        </mesh>
      ))}

      {/* Bridge — thin slab crossing mid-pool */}
      <mesh castShadow receiveShadow position={[0, rimH + 0.12, 0]}>
        <boxGeometry args={[poolW + rimT * 2 + 1, 0.22, 2.5]} />
        <meshStandardMaterial color="#E0D8CC" roughness={0.65} />
      </mesh>

      {/* Bridge side rails */}
      {[-1.1, 1.1].map((side, i) => (
        <mesh key={i} castShadow position={[0, rimH + 0.55, side]}>
          <boxGeometry args={[poolW + rimT * 2, 0.08, 0.08]} />
          <meshStandardMaterial color="#999" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  THREE TREE VARIETIES  (low-poly, each via InstancedMesh)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Grove zones per tree variety.
 * Format: [xMin, xMax, zMin, zMax, count]
 *
 * ↳ TREE_COUNTS at top controls how many of each type to plant.
 * ↳ Add entries to GROVE_* arrays to extend planting areas.
 */
const GROVE_ROUND = [
  [-200, -80,  130,  300, 12],  // SW front grove
  [ 80,  200,  130,  300, 12],  // SE front grove
  [-200, -80, -300, -130,  8],  // NW rear grove
  [ 80,  200, -300, -130,  6],  // NE rear grove
]

const GROVE_COLUMNAR = [
  [-60,  -40,  120,  290,  8],  // west of approach path
  [  40,   60,  120,  290,  8],  // east of approach path
  [-60,  -40, -130, -280,  5],  // north-west line
  [  40,   60, -130, -280,  5],  // north-east line
]

const GROVE_SPREADING = [
  [-200, -80,  -90,   90, 10],  // west mid-park
  [ 80,  200,  -90,   90,  8],  // east mid-park
  [-40,   40,  200,  300,  4],  // behind front plaza
]

/** Scatter trees inside a rectangular zone, avoiding the building footprint. */
function scatterInZones(zones, countGoal, rng) {
  // Distribute count proportionally across zones by area
  const areas = zones.map(([x0, x1, z0, z1]) => (x1 - x0) * (z1 - z0))
  const totalA = areas.reduce((a, b) => a + b, 0)
  const trees = []

  zones.forEach(([x0, x1, z0, z1], zi) => {
    const n = Math.round((areas[zi] / totalA) * countGoal)
    for (let i = 0; i < n; i++) {
      const x = x0 + rng() * (x1 - x0)
      const z = z0 + rng() * (z1 - z0)
      // Skip if inside building footprint (±35 X, ±115 Z)
      if (Math.abs(x) < 36 && Math.abs(z) < 116) continue
      trees.push({ x, z, scale: 0.7 + rng() * 0.6, rotY: rng() * Math.PI * 2 })
    }
  })
  return trees
}

const _rng = makePRNG(99)
const ROUND_DATA     = scatterInZones(GROVE_ROUND,     TREE_COUNTS.round,     makePRNG(10))
const COLUMNAR_DATA  = scatterInZones(GROVE_COLUMNAR,  TREE_COUNTS.columnar,  makePRNG(20))
const SPREADING_DATA = scatterInZones(GROVE_SPREADING, TREE_COUNTS.spreading, makePRNG(30))

/** Helper: write instanced matrix for a trunk + canopy pair. */
function writeTrees(data, trunkRef, canopyRef, trunkH, canopyY, trunkGeo, canopyGeo) {
  if (!trunkRef.current || !canopyRef.current) return
  const mat = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const q   = new THREE.Quaternion()
  const sv  = new THREE.Vector3()

  data.forEach(({ x, z, scale, rotY }, i) => {
    q.setFromEuler(new THREE.Euler(0, rotY, 0))
    sv.set(scale, scale, scale)

    pos.set(x, (trunkH / 2) * scale, z)
    mat.compose(pos, q, sv); trunkRef.current.setMatrixAt(i, mat)

    pos.set(x, canopyY * scale, z)
    mat.compose(pos, q, sv); canopyRef.current.setMatrixAt(i, mat)
  })
  trunkRef.current.instanceMatrix.needsUpdate  = true
  canopyRef.current.instanceMatrix.needsUpdate = true
}

/** Variety A — Round-head deciduous (sphere canopy, 6-sided trunk). */
function RoundTrees() {
  const n    = ROUND_DATA.length
  const tRef = useRef(), cRef = useRef()

  const tGeo = useMemo(() => new THREE.CylinderGeometry(0.45, 0.70, 8, 6), [])
  const cGeo = useMemo(() => new THREE.SphereGeometry(5.5, 7, 5), [])
  const tMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6B3F1A', roughness: 0.9 }), [])
  const cMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3E8030', roughness: 0.85 }), [])

  useEffect(() => writeTrees(ROUND_DATA, tRef, cRef, 8, 12.5, tGeo, cGeo), [])

  return (
    <>
      <instancedMesh ref={tRef} args={[tGeo, tMat, n]} castShadow receiveShadow />
      <instancedMesh ref={cRef} args={[cGeo, cMat, n]} castShadow />
    </>
  )
}

/** Variety B — Columnar cypress / poplar (tall, narrow cone). */
function ColumnarTrees() {
  const n    = COLUMNAR_DATA.length
  const tRef = useRef(), cRef = useRef()

  const tGeo = useMemo(() => new THREE.CylinderGeometry(0.25, 0.35, 6, 5), [])
  const cGeo = useMemo(() => new THREE.ConeGeometry(2.0, 18, 5), [])
  const tMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A2E10', roughness: 0.9 }), [])
  const cMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2A6020', roughness: 0.9 }), [])

  useEffect(() => writeTrees(COLUMNAR_DATA, tRef, cRef, 6, 12, tGeo, cGeo), [])

  return (
    <>
      <instancedMesh ref={tRef} args={[tGeo, tMat, n]} castShadow receiveShadow />
      <instancedMesh ref={cRef} args={[cGeo, cMat, n]} castShadow />
    </>
  )
}

/** Variety C — Low spreading / umbrella tree (flat oblate sphere). */
function SpreadingTrees() {
  const n    = SPREADING_DATA.length
  const tRef = useRef(), cRef = useRef()

  const tGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.8, 5, 6), [])
  // Flat oblate sphere: SphereGeometry scaled non-uniformly in useEffect
  const cGeo = useMemo(() => new THREE.SphereGeometry(6, 8, 4), [])
  const tMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5A3512', roughness: 0.9 }), [])
  const cMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A8C38', roughness: 0.88 }), [])

  useEffect(() => {
    if (!tRef.current || !cRef.current) return
    const mat = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const q   = new THREE.Quaternion()
    const sv  = new THREE.Vector3()

    SPREADING_DATA.forEach(({ x, z, scale, rotY }, i) => {
      q.setFromEuler(new THREE.Euler(0, rotY, 0))

      // Trunk
      sv.set(scale, scale, scale)
      pos.set(x, 2.5 * scale, z)
      mat.compose(pos, q, sv); tRef.current.setMatrixAt(i, mat)

      // Canopy — flatten Y to 0.4× for umbrella shape
      sv.set(scale, scale * 0.4, scale)
      pos.set(x, 7.5 * scale, z)
      mat.compose(pos, q, sv); cRef.current.setMatrixAt(i, mat)
    })
    tRef.current.instanceMatrix.needsUpdate  = true
    cRef.current.instanceMatrix.needsUpdate  = true
  }, [])

  return (
    <>
      <instancedMesh ref={tRef} args={[tGeo, tMat, n]} castShadow receiveShadow />
      <instancedMesh ref={cRef} args={[cGeo, cMat, n]} castShadow />
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  HEDGE BORDERS  (define "garden rooms" along path edges)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Each entry: [cx, cy_base, cz, width, height, depth, rotY]
 * Hedges are 2 m tall by default.
 *
 * ↳ Change hedgeH to adjust hedge height globally.
 * ↳ Modify positions here to reshape garden room borders.
 */
function Hedges() {
  const hedgeH = 2.2   // ← hedge height (metres)
  const hedgeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#285E24', roughness: 0.95,
  }), [])

  /**
   * HEDGE LAYOUT
   * Hedges frame the two sides of the main approach path and the pool area.
   * cx, cz = centre; w = width along X; d = depth along Z
   */
  const hedges = [
    // Flanking main approach — east side
    { cx:  32, cz: 205, w: 2, d: 80 },
    { cx: -32, cz: 205, w: 2, d: 80 },
    // Enclosing front plaza forecourt
    { cx:  70, cz: 130, w: 2, d: 28 },
    { cx: -70, cz: 130, w: 2, d: 28 },
    { cx:  80, cz: 118, w: 24, d: 2 },
    { cx: -80, cz: 118, w: 24, d: 2 },
    // Cross hedge behind pool
    { cx:  55, cz: 180, w: 22, d: 2 },
    { cx: -55, cz: 180, w: 22, d: 2 },
    // Rear garden definition
    { cx:  35, cz:-130, w:  2, d: 60 },
    { cx: -35, cz:-130, w:  2, d: 60 },
  ]

  return (
    <group>
      {hedges.map(({ cx, cz, w, d }, i) => (
        <mesh key={i} castShadow receiveShadow
              position={[cx, hedgeH / 2, cz]}>
          <boxGeometry args={[w, hedgeH, d]} />
          <primitive object={hedgeMat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  FLOWER BEDS  (instanced flat cylinders with vivid colours)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Flower bed colours — change to restyle the planting palette.
 * ↳ Add more colour strings to increase variety.
 */
const FLOWER_PALETTE = ['#FF6B6B', '#FFD93D', '#A29BFE', '#74B9FF', '#FFA07A', '#90EE90']

const FLOWER_POSITIONS = (() => {
  const rng  = makePRNG(55)
  // Scatter beds along path edges and in open grass areas
  const zones = [
    [-55,  55,  122,  145, 14],
    [-120, -75,  140,  200, 10],
    [ 75,  120,  140,  200, 10],
    [-120, -75, -140, -200,  8],
    [ 75,  120, -140, -200,  8],
    [-40,   40,  220,  280,  8],
  ]
  const beds = []
  zones.forEach(([x0, x1, z0, z1, n]) => {
    for (let i = 0; i < n; i++) {
      beds.push({
        x: x0 + rng() * (x1 - x0),
        z: z0 + rng() * (z1 - z0),
        r: 1.8 + rng() * 2.4,
        color: FLOWER_PALETTE[Math.floor(rng() * FLOWER_PALETTE.length)],
      })
    }
  })
  return beds
})()

function FlowerBeds() {
  // Group beds by colour, one InstancedMesh per colour for efficiency
  const byColor = useMemo(() => {
    const map = {}
    FLOWER_POSITIONS.forEach((b) => {
      if (!map[b.color]) map[b.color] = []
      map[b.color].push(b)
    })
    return map
  }, [])

  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 0.35, 10), [])

  return (
    <>
      {Object.entries(byColor).map(([color, beds]) => {
        const ref = { current: null }
        return (
          <ColorBedInstanced key={color} geo={geo} color={color} beds={beds} />
        )
      })}
    </>
  )
}

function ColorBedInstanced({ geo, color, beds }) {
  const meshRef = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color, roughness: 0.8, emissive: color, emissiveIntensity: 0.12,
  }), [color])

  useEffect(() => {
    if (!meshRef.current) return
    const mat4 = new THREE.Matrix4()
    const pos  = new THREE.Vector3()
    const q    = new THREE.Quaternion()
    const sv   = new THREE.Vector3()

    beds.forEach(({ x, z, r }, i) => {
      sv.set(r, 1, r)
      pos.set(x, 0.18, z)
      mat4.compose(pos, q, sv)
      meshRef.current.setMatrixAt(i, mat4)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [beds])

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, beds.length]} receiveShadow />
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ABSTRACT ENTRANCE SCULPTURE  (three angled slabs — gunmetal finish)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sculpture sits at the head of the main approach path, directly in front
 * of the reflecting pool.
 *
 * ↳ Change sculptureZ to move it along the approach axis.
 * ↳ Adjust slab rotations for a different composition.
 */
function EntranceSculpture() {
  const sculptureZ = 120   // ← metres from origin (south of building entrance)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2A2E35', metalness: 0.75, roughness: 0.25,
  }), [])

  return (
    <group position={[0, 0, sculptureZ]}>
      {/* Central tall slab */}
      <mesh castShadow receiveShadow position={[0, 5, 0]} rotation={[0, 0.3, 0.15]}>
        <boxGeometry args={[1.2, 10, 3.5]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Left leaning slab */}
      <mesh castShadow receiveShadow position={[-3.2, 3, 0.5]} rotation={[0.1, 0.4, -0.35]}>
        <boxGeometry args={[0.9, 6.5, 2.8]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Right leaning slab */}
      <mesh castShadow receiveShadow position={[3.5, 2.5, -0.4]} rotation={[-0.1, -0.3, 0.4]}>
        <boxGeometry args={[0.9, 5.5, 2.4]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Plinth */}
      <mesh receiveShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[3.5, 3.8, 0.6, 12]} />
        <meshStandardMaterial color="#C8C0B4" roughness={0.75} />
      </mesh>
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PARK BENCHES  (low-poly wooden slats + metal legs via InstancedMesh)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Bench positions [cx, cz, rotY].
 * ↳ Add entries to place more benches; rotY rotates the bench to face a view.
 */
const BENCH_DATA = [
  // Alongside main approach path
  [ -20, 165,  0.3],  [  20, 165, -0.3],
  [ -20, 200,  0.2],  [  20, 200, -0.2],
  // Pool-side seating
  [ -14, 142, Math.PI / 2], [ 14, 142, -Math.PI / 2],
  [ -14, 172, Math.PI / 2], [ 14, 172, -Math.PI / 2],
  // Rear garden
  [ -28,-155, Math.PI], [ 28,-155, 0],
]

function ParkBenches() {
  const seatRef = useRef(), legRef = useRef()
  const n = BENCH_DATA.length

  const seatGeo = useMemo(() => new THREE.BoxGeometry(2.8, 0.14, 0.75), [])
  const legGeo  = useMemo(() => new THREE.BoxGeometry(0.12, 0.45, 0.7),  [])
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9C6E30', roughness: 0.85 }), [])
  const ironMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#303030', metalness: 0.6, roughness: 0.5 }), [])

  useEffect(() => {
    if (!seatRef.current || !legRef.current) return
    const m4  = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const q   = new THREE.Quaternion()
    const sv  = new THREE.Vector3(1, 1, 1)

    BENCH_DATA.forEach(([cx, cz, ry], i) => {
      q.setFromEuler(new THREE.Euler(0, ry, 0))
      pos.set(cx, 0.52, cz); m4.compose(pos, q, sv); seatRef.current.setMatrixAt(i, m4)
      pos.set(cx, 0.25, cz); m4.compose(pos, q, sv); legRef.current.setMatrixAt(i, m4)
    })
    seatRef.current.instanceMatrix.needsUpdate = true
    legRef.current.instanceMatrix.needsUpdate  = true
  }, [])

  return (
    <>
      <instancedMesh ref={seatRef} args={[seatGeo, woodMat, n]} castShadow />
      <instancedMesh ref={legRef}  args={[legGeo,  ironMat, n]} castShadow />
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PATH MARKER LIGHTS  (small glowing dots embedded in the path surface)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generates evenly-spaced ground lights along the main south approach path.
 * ↳ Change MARKER_SPACING to adjust gap between lights.
 * ↳ Change MARKER_X_OFFSET to move lights to path edges.
 */
const MARKER_SPACING  = 12   // metres between markers
const MARKER_X_OFFSET = 5.0  // offset from path centre (place on edges)

const MARKER_POSITIONS = (() => {
  const pts = []
  for (let z = 128; z <= 290; z += MARKER_SPACING) {
    const x = 16 * Math.sin((z / 290) * Math.PI * 2)  // follows path curve
    pts.push([x - MARKER_X_OFFSET, z])
    pts.push([x + MARKER_X_OFFSET, z])
  }
  return pts
})()

function PathMarkerLights() {
  const meshRef = useRef()
  const n = MARKER_POSITIONS.length

  const geo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFF8D0', emissive: '#FFE580', emissiveIntensity: 4.0,
  }), [])

  useEffect(() => {
    if (!meshRef.current) return
    const m4 = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const q   = new THREE.Quaternion()
    const sv  = new THREE.Vector3(1, 1, 1)

    MARKER_POSITIONS.forEach(([x, z], i) => {
      pos.set(x, 0.06, z)
      m4.compose(pos, q, sv)
      meshRef.current.setMatrixAt(i, m4)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])

  return <instancedMesh ref={meshRef} args={[geo, mat, n]} />
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHARACTER  (walk mode only)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Low-poly capsule character with WASD movement and third-person camera follow.
 *
 * Movement is constrained to the park floor (XZ plane, Y = 0).
 * The camera smoothly lerps to an offset above and behind the character.
 *
 * Props:
 *   charRef  — ref forwarded from parent (holds the character Group object)
 */
function Character({ charRef }) {
  const bodyRef  = useRef()
  const [, get]  = useKeyboardControls()

  // _vel reused every frame to avoid GC pressure
  const _vel = useMemo(() => new THREE.Vector3(), [])
  const _cam = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    if (!charRef.current) return

    const { forward, backward, leftward, rightward, run } = get()
    const speed = run ? RUN_SPEED : WALK_SPEED

    _vel.set(
      (rightward ? 1 : 0) - (leftward  ? 1 : 0),
      0,
      (backward  ? 1 : 0) - (forward   ? 1 : 0),
    )

    if (_vel.lengthSq() > 0) {
      _vel.normalize().multiplyScalar(speed * delta)
      charRef.current.position.add(_vel)

      // ── Floor boundary — clamp inside park ──────────────────────────────
      charRef.current.position.x = THREE.MathUtils.clamp(
        charRef.current.position.x, -PARK_HALF + 6, PARK_HALF - 6,
      )
      charRef.current.position.z = THREE.MathUtils.clamp(
        charRef.current.position.z, -PARK_HALF + 6, PARK_HALF - 6,
      )

      // ── Rotate body to face movement direction ───────────────────────────
      if (bodyRef.current) {
        const angle = Math.atan2(_vel.x, _vel.z)
        bodyRef.current.rotation.y = THREE.MathUtils.lerp(
          bodyRef.current.rotation.y, angle, 0.18,
        )
      }
    }

    // ── Third-person camera follow ─────────────────────────────────────────
    const p = charRef.current.position
    _cam.set(p.x, p.y + CAM_OFFSET_Y, p.z + CAM_OFFSET_Z)
    state.camera.position.lerp(_cam, CAM_LERP)
    state.camera.lookAt(p.x, p.y + 8, p.z)
  })

  return (
    <group ref={charRef} position={CHAR_START}>
      <group ref={bodyRef}>
        {/* ── Body (capsule) ── */}
        <mesh castShadow position={[0, 1.35, 0]}>
          <capsuleGeometry args={[0.55, 1.2, 4, 10]} />
          <meshStandardMaterial color="#6C5CE7" roughness={0.5} metalness={0.12} />
        </mesh>

        {/* ── Head ── */}
        <mesh castShadow position={[0, 2.82, 0]}>
          <sphereGeometry args={[0.46, 12, 8]} />
          <meshStandardMaterial color="#FDCB6E" roughness={0.55} />
        </mesh>

        {/* ── Direction indicator (forward dot) ── */}
        <mesh position={[0, 2.78, -0.50]}>
          <sphereGeometry args={[0.13, 6, 4]} />
          <meshStandardMaterial
            color="#E17055"
            emissive="#E17055"
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>

      {/* ── Soft ground shadow blob ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.65, 12]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCENE LIGHTING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Lighting rig:
 *   ambientLight          — soft uniform fill
 *   directionalLight      — primary sun, 2 048-px shadow map
 *   hemisphereLight       — warm sky / cool ground gradient
 *   pointLight ×4         — building lobby entrances + pool highlights
 *
 * ↳ SUN_POSITION and SUN_INTENSITY constants at top of file.
 * ↳ Increase shadow-mapSize to [4096,4096] for sharper shadows (GPU cost).
 */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={AMBIENT_INTENSITY} />

      <directionalLight
        castShadow
        position={SUN_POSITION}
        intensity={SUN_INTENSITY}
        color="#FFF3D5"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={10}
        shadow-camera-far={800}
        shadow-camera-left={-280}
        shadow-camera-right={280}
        shadow-camera-top={280}
        shadow-camera-bottom={-280}
        shadow-bias={-0.0003}
      />

      {/* Warm morning sky, cool green ground */}
      <hemisphereLight skyColor="#D4EAFF" groundColor="#7B9A52" intensity={0.65} />

      {/* South lobby accent */}
      <pointLight position={[0, 5, 95]}  intensity={80}  color="#FFE8A0" distance={90}  decay={2} />
      {/* North lobby accent */}
      <pointLight position={[0, 5, -95]} intensity={50}  color="#FFE0B0" distance={70}  decay={2} />
      {/* Pool shimmer */}
      <pointLight position={[0, 3, POOL_Z]} intensity={40} color="#A0D8EF" distance={60} decay={2} />
      {/* Sculpture highlight */}
      <pointLight position={[0, 15, 125]} intensity={30} color="#FFEECC" distance={40} decay={2} />
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOADING OVERLAY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * useProgress는 drei의 로딩 스토어(Zustand 기반)를 Canvas 밖에서 구독.
 * active가 false가 되는 순간 자동으로 언마운트됨.
 */
function LoadingOverlay() {
  const { progress, active } = useProgress()
  if (!active) return null
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center
                    bg-[#080e14] pointer-events-none select-none">
      <div className="w-12 h-12 border-4 border-brand-500/25 border-t-brand-500
                      rounded-full animate-spin mb-5" />
      <p className="text-zinc-300 text-sm tracking-wider font-medium">
        Loading Corporate Campus…
      </p>
      <p className="text-zinc-500 text-xs mt-1">
        {progress.toFixed(0)}% · atlanta_office.draco.glb
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  BUILDING WIREFRAME FALLBACK  (shown during Suspense)
// ══════════════════════════════════════════════════════════════════════════════

function BuildingFallback() {
  return (
    <mesh position={[0, 48, 0]} castShadow>
      <boxGeometry args={[61, 96, 212]} />
      <meshStandardMaterial color="#5A7A9A" wireframe opacity={0.4} transparent />
    </mesh>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCENE CONTENTS  (inside Canvas context)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SceneContents
 *
 * Props:
 *   mode    — 'overview' | 'walk'
 *   charRef — ref to the character Group (for walk mode)
 */
function SceneContents({ mode, charRef }) {
  return (
    <>
      {/* ── Atmosphere ── */}
      <Sky
        distance={5000}
        sunPosition={SUN_POSITION}
        inclination={0.46}
        azimuth={0.20}
        turbidity={5}
        rayleigh={1.0}
        mieCoefficient={0.006}
        mieDirectionalG={0.88}
      />

      <SceneLighting />

      {/* Soft contact shadows under trees + building base */}
      <ContactShadows
        position={[0, 0.05, 0]}
        opacity={0.35}
        scale={500}
        blur={2.5}
        far={25}
        color="#1A2A10"
      />

      {/* ── Building ── */}
      <Suspense fallback={<BuildingFallback />}>
        <AtlantaBuilding />
      </Suspense>

      {/* ── Park ground ── */}
      <ParkGround />

      {/* ── Paths & hardscape ── */}
      <WindingPaths />

      {/* ── Water feature ── */}
      <ReflectingPool />

      {/* ── Greenery ── */}
      <RoundTrees />
      <ColumnarTrees />
      <SpreadingTrees />
      <GrassPatches />
      <Hedges />
      <FlowerBeds />

      {/* ── Details ── */}
      <EntranceSculpture />
      <ParkBenches />
      <PathMarkerLights />

      {/* ── Camera controls — overview only ── */}
      {/**
       * CAMERA TUNING (Overview Mode)
       *   target={[0, 40, 0]}  → pivot rises to mid-building height
       *   minDistance          → closest zoom (metres)
       *   maxDistance          → furthest zoom
       *   minPolarAngle        → prevents going underground
       *   maxPolarAngle        → prevents top-down view
       *
       * OrbitControls is disabled in walk mode so useFrame can drive the camera.
       */}
      {mode === 'overview' && (
        <OrbitControls
          enablePan
          target={[0, 40, 0]}
          minDistance={20}
          maxDistance={700}
          minPolarAngle={Math.PI / 14}
          maxPolarAngle={Math.PI / 2.05}
          // Sensitivity — decrease for slower rotation/zoom
          rotateSpeed={0.55}
          zoomSpeed={0.9}
          panSpeed={0.7}
        />
      )}

      {/* ── Character — walk mode only ── */}
      {mode === 'walk' && <Character charRef={charRef} />}
    </>
  )
}

// Small grass accent patches (complements the main lawn)
function GrassPatches() {
  const tex = useMemo(() => makeGrassTex(16), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), [tex])

  /**
   * GRASS PATCH LAYOUT: [cx, cz, width, depth]
   * ↳ Adjust to reshape individual lawn areas.
   */
  const patches = [
    [-130,  190, 120, 110],
    [ 130,  190, 120, 110],
    [-130, -180, 120, 100],
    [ 130, -180, 120, 100],
    [   0, -200,  80,  90],
    [-100,    0,  70, 170],
    [ 100,    0,  70, 170],
  ]

  return (
    <group position={[0, 0.015, 0]}>
      {patches.map(([cx, cz, w, d], i) => (
        <mesh key={i} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
          <planeGeometry args={[w, d]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLIC EXPORT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * <BuildingShowroom />
 *
 * Renders a full-screen R3F canvas. Drop into any page that has a
 * BrowserRouter in the tree:
 *
 *   <div className="w-full h-screen">
 *     <BuildingShowroom />
 *   </div>
 *
 * Props:
 *   className — optional Tailwind / CSS classes on the outer wrapper
 */
export default function BuildingShowroom({ className = '' }) {
  const [dpr,  setDpr]  = useState(1.0)
  /**
   * mode: 'overview' | 'walk'
   *   'overview' — OrbitControls, free camera
   *   'walk'     — WASD character movement, third-person camera
   */
  const [mode, setMode] = useState('overview')

  // Ref to the character Group object (persists across mode switches)
  const charRef = useRef()

  function toggleMode() {
    setMode((m) => {
      const next = m === 'overview' ? 'walk' : 'overview'
      return next
    })
  }

  return (
    /**
     * KeyboardControls must wrap the Canvas (and any component using
     * useKeyboardControls). It intercepts keydown/keyup events globally
     * and exposes them via the useKeyboardControls() hook inside the Canvas.
     */
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className={`relative w-full h-full ${className}`}>
        {/* useProgress 기반 — GLB 로딩 완료 시 자동으로 사라짐 */}
        <LoadingOverlay />

        <Canvas
          shadows
          dpr={dpr}
          /**
           * INITIAL CAMERA
           *   position [east, height, south] — adjust for opening composition
           *   fov — field of view in degrees (lower = more telephoto / architectural)
           */
          camera={{ position: [100, 60, 200], fov: 46, near: 0.5, far: 1400 }}
          gl={{
            antialias:           false,
            powerPreference:     'high-performance',
            toneMapping:         THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
          }}
          onCreated={({ scene }) => {
            scene.background = new THREE.Color('#A8CCE8')
            scene.fog        = new THREE.FogExp2('#C8DFEE', 0.0007)
          }}
        >
          <PerformanceMonitor
            ms={200} iterations={5} threshold={0.75}
            onIncline={() => setDpr(Math.min(window.devicePixelRatio, 1.5))}
            onDecline={() => setDpr(0.75)}
            onChange={({ factor }) => setDpr(0.75 + factor * 0.75)}
          />

          <Suspense fallback={null}>
            <SceneContents mode={mode} charRef={charRef} />
          </Suspense>
        </Canvas>

        {/* ── Mode toggle button ── */}
        <button
          onClick={toggleMode}
          className="absolute bottom-4 right-4 flex items-center gap-2
                     bg-black/55 hover:bg-black/75 backdrop-blur-sm
                     border border-white/15 hover:border-white/30
                     rounded-xl px-4 py-2.5 transition-all duration-150
                     active:scale-95 select-none cursor-pointer"
        >
          {mode === 'overview' ? (
            <>
              {/* Walk icon */}
              <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor"
                   strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12l3-7 3 7M7 17l2-4h6l2 4" />
              </svg>
              <span className="text-xs font-medium text-zinc-200">Walk Mode</span>
            </>
          ) : (
            <>
              {/* Overview icon */}
              <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor"
                   strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
              </svg>
              <span className="text-xs font-medium text-zinc-200">Overview</span>
            </>
          )}
        </button>

        {/* ── HUD ── */}
        <div className="absolute bottom-4 left-4 pointer-events-none">
          <div className="bg-black/45 backdrop-blur-sm rounded-lg px-3 py-2 space-y-0.5">
            <p className="text-zinc-200 text-xs font-semibold tracking-wide">
              Atlanta Corporate Office
            </p>
            <p className="text-zinc-500 text-[10px]">
              {mode === 'overview'
                ? 'Drag · Scroll · Right-drag to pan'
                : 'WASD / Arrow keys · Shift to run'}
            </p>
          </div>
        </div>

        {/* ── Scene legend (overview only) ── */}
        {mode === 'overview' && (
          <div className="absolute top-16 right-4 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1">
              {[
                ['#3E8030', 'Round trees'],
                ['#2A6020', 'Columnar trees'],
                ['#4A8C38', 'Spreading trees'],
                ['#4A8EC4', 'Reflecting pool'],
                ['#FF6B6B', 'Flower beds'],
              ].map(([col, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                       style={{ background: col }} />
                  <span className="text-zinc-400 text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Walk mode minimap indicator ── */}
        {mode === 'walk' && (
          <div className="absolute top-16 right-4 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-zinc-400 text-[10px] mb-1">Controls</p>
              {[
                ['W / ↑', 'Forward'],
                ['S / ↓', 'Backward'],
                ['A / ←', 'Left'],
                ['D / →', 'Right'],
                ['Shift', 'Run'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <kbd className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5
                                  rounded text-zinc-300">{key}</kbd>
                  <span className="text-zinc-500 text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </KeyboardControls>
  )
}
