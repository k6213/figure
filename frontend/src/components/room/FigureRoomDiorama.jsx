/**
 * FigureRoomDiorama.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Diorama buildings + indoor park decorations for the FigureRoom.
 *
 * The FigureRoom is a ~22×20×7 unit indoor space.  Both building GLBs are
 * full real-world scale (metres), so they must be heavily scaled down to work
 * as miniature display pieces.
 *
 * ┌─────────────────── QUICK TUNING ──────────────────────────────────────────┐
 * │  MODERN_SCALE   — resize modern_building_concepts diorama                │
 * │  ATLANTA_SCALE  — resize atlanta_office diorama                          │
 * │  PARK_W/D       — indoor park platform size (room units)                 │
 * │  PARK_X/Z       — park centre position in the room                       │
 * │  MiniTree height/color — tweak per-tree in TREE_DATA array               │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Layout overview (top-down, room is 22×20 units):
 *
 *   Z +10  ┌──────────────────────────────┐  ← entrance / portal
 *           │    [PARK: centre-front]      │
 *   Z   0   │  [Modern]          [Atlanta] │
 *           │  (diorama)        (diorama)  │
 *   Z -10  └──────────────────────────────┘  ← showcase cabinet (figures)
 *         X=-11                           X=+11
 */

import { Suspense, useRef, useMemo, useLayoutEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
//  SCALE CONSTANTS
//  Both buildings are real-world metres.  At 0.025:
//    Atlanta Office (61m wide, 97m tall) → ~1.5u wide, ~2.4u tall — fits nicely
//    Modern Building Concepts            → auto-sized via the same factor
// ─────────────────────────────────────────────────────────────────────────────

/** ↕ Resize the Modern Building diorama (increase = larger model) */
const MODERN_SCALE  = 0.025

/** ↕ Resize the Atlanta Office diorama */
const ATLANTA_SCALE = 0.022

// ─────────────────────────────────────────────────────────────────────────────
//  PARK LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Park platform width (X axis, room units) */
const PARK_W = 8.5
/** Park platform depth (Z axis, room units) */
const PARK_D = 5.0
/** Park centre X (0 = room centre) */
const PARK_X = 0
/** Park centre Z (positive = towards entrance) */
const PARK_Z = 4.8

// ─────────────────────────────────────────────────────────────────────────────
//  MODEL URLs  (Draco-compressed .glb in /public/models/)
// ─────────────────────────────────────────────────────────────────────────────
const MODERN_URL  = '/models/modern_building_concepts.draco.glb'
const ATLANTA_URL = '/models/atlanta_office.draco.glb'

// ─────────────────────────────────────────────────────────────────────────────
//  DIORAMA BUILDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DiagramBuilding
 *
 * Loads a GLB, auto-centres it so its base sits at Y=0, places it on a
 * glowing display pedestal, and adds a small accent light overhead.
 *
 * Props:
 *   url      — path to .draco.glb in /public/models/
 *   scale    — uniform scale applied to the model
 *   position — [x, y, z] group position in the room
 */
function DiagramBuilding({ url, scale, position }) {
  const { scene } = useGLTF(url, true)   // true = use Draco decoder
  const innerRef  = useRef()

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = o.receiveShadow = true
    })
    return c
  }, [scene])

  // Auto-centre: shift so model base rests exactly at local Y=0
  useLayoutEffect(() => {
    if (!innerRef.current) return
    const box = new THREE.Box3().setFromObject(cloned)
    const ctr = box.getCenter(new THREE.Vector3())
    innerRef.current.position.set(-ctr.x, -box.min.y, -ctr.z)
  }, [cloned])

  const PED_H = 0.07   // pedestal height (units)
  const PED_W = 1.9    // pedestal footprint (units)

  return (
    <group position={position}>

      {/* ── Pedestal body ── */}
      <mesh receiveShadow castShadow position={[0, PED_H / 2, 0]}>
        <boxGeometry args={[PED_W, PED_H, PED_W]} />
        <meshStandardMaterial color="#1c1c28" roughness={0.35} metalness={0.6} />
      </mesh>

      {/* ── Cyan rim glow on top of pedestal ── */}
      <mesh position={[0, PED_H + 0.005, 0]}>
        <boxGeometry args={[PED_W - 0.06, 0.01, PED_W - 0.06]} />
        <meshStandardMaterial
          color="#00d4ff" emissive="#00d4ff"
          emissiveIntensity={2.5}
          transparent opacity={0.75}
        />
      </mesh>

      {/* ── Building model (scaled + auto-centred) ── */}
      <group scale={[scale, scale, scale]} position={[0, PED_H, 0]}>
        <group ref={innerRef}>
          <primitive object={cloned} />
        </group>
      </group>

      {/* ── Accent spotlight above diorama ──
       *   Increase intensity to brighten the model. */}
      <pointLight
        position={[0, 3.2, 0.6]}
        intensity={5}
        color="#e8f4ff"
        distance={5}
        decay={2}
      />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  MINI TREE  (procedural geometry — no external asset)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MiniTree
 * Props:
 *   position — [x, y, z]
 *   height   — total height in room units
 *   color    — canopy hex colour
 */
function MiniTree({ position, height = 0.55, color = '#2d6a2d' }) {
  const trunkH   = height * 0.32
  const canopyH  = height * 0.70
  const trunkR   = height * 0.06
  const canopyR  = height * 0.38

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh castShadow position={[0, trunkH / 2, 0]}>
        <cylinderGeometry args={[trunkR, trunkR * 1.2, trunkH, 5]} />
        <meshStandardMaterial color="#5c3d1a" roughness={0.9} />
      </mesh>

      {/* Canopy cone */}
      <mesh castShadow position={[0, trunkH + canopyH * 0.45, 0]}>
        <coneGeometry args={[canopyR, canopyH, 6]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  INDOOR PARK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tree data.  Positions are relative to park centre (PARK_X, PARK_Z).
 * ↕ Adjust x/z to reposition; h to resize; c to recolour.
 */
const TREE_DATA = [
  { x: -3.4, z: -1.8, h: 0.60, c: '#3a8c3a' },
  { x: -2.8, z:  0.6, h: 0.48, c: '#2d6a2d' },
  { x: -3.6, z:  1.8, h: 0.65, c: '#4aaa4a' },
  { x:  3.0, z: -1.5, h: 0.52, c: '#2d6a2d' },
  { x:  3.5, z:  0.4, h: 0.42, c: '#3a8c3a' },
  { x:  2.8, z:  1.9, h: 0.58, c: '#4aaa4a' },
  { x: -1.6, z: -2.1, h: 0.36, c: '#2d6a2d' },
  { x:  1.7, z: -2.0, h: 0.36, c: '#3a8c3a' },
]

/**
 * Flower data — coloured discs scattered near trees.
 * ↕ Change c (hex) for palette; x/z for position.
 */
const FLOWER_DATA = [
  { x: -2.2, z:  0.0, c: '#ff6b6b' },
  { x: -3.0, z: -0.8, c: '#ffd93d' },
  { x:  2.4, z:  1.1, c: '#a29bfe' },
  { x:  3.2, z: -0.5, c: '#74b9ff' },
  { x: -1.4, z:  2.0, c: '#ff6b6b' },
  { x:  1.6, z:  1.7, c: '#ffd93d' },
]

/** S-curve stepping stone path across the park. */
const STONE_DATA = (() => {
  const pts = []
  const N = 9
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    pts.push({
      x: Math.sin(t * Math.PI * 1.4) * 1.9,
      z: -PARK_D / 2 + t * PARK_D,
      // alternate slight rotations for natural look
      ry: (i % 2 === 0 ? 0.2 : -0.15),
    })
  }
  return pts
})()

function IndoorPark() {
  return (
    <group position={[PARK_X, 0, PARK_Z]}>

      {/* ── Grass platform ── */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <planeGeometry args={[PARK_W, PARK_D]} />
        <meshStandardMaterial color="#3a7a2a" roughness={0.95} />
      </mesh>

      {/* ── Raised border edge ──
       *   Darker green strip that frames the park. */}
      <mesh receiveShadow position={[0, 0.012, 0]}>
        <boxGeometry args={[PARK_W + 0.12, 0.025, PARK_D + 0.12]} />
        <meshStandardMaterial color="#1e4016" roughness={1} />
      </mesh>

      {/* ── Stepping stone path ── */}
      {STONE_DATA.map(({ x, z, ry }, i) => (
        <mesh key={i} receiveShadow
              rotation={[-Math.PI / 2, ry, 0]}
              position={[x, 0.03, z]}>
          <planeGeometry args={[0.30, 0.22]} />
          <meshStandardMaterial color="#a09882" roughness={0.9} />
        </mesh>
      ))}

      {/* ── Mini trees ── */}
      {TREE_DATA.map(({ x, z, h, c }, i) => (
        <MiniTree key={i} position={[x, 0.025, z]} height={h} color={c} />
      ))}

      {/* ── Flower discs ── */}
      {FLOWER_DATA.map(({ x, z, c }, i) => (
        <mesh key={i} receiveShadow
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x, 0.035, z]}>
          <circleGeometry args={[0.20, 8]} />
          <meshStandardMaterial
            color={c} roughness={0.8}
            emissive={c} emissiveIntensity={0.12}
          />
        </mesh>
      ))}

      {/* ── Small bench (left of path) ── */}
      <group position={[-1.9, 0.025, 1.1]}>
        {/* Seat */}
        <mesh castShadow position={[0, 0.17, 0]}>
          <boxGeometry args={[0.58, 0.045, 0.17]} />
          <meshStandardMaterial color="#8c6030" roughness={0.85} />
        </mesh>
        {/* Legs */}
        {[-0.20, 0.20].map((x, i) => (
          <mesh key={i} castShadow position={[x, 0.09, 0]}>
            <boxGeometry args={[0.05, 0.17, 0.13]} />
            <meshStandardMaterial color="#303030" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* ── Tiny lamppost at park corner ── */}
      <group position={[-3.8, 0.025, -2.2]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.9, 6]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial
            color="#fffbe0" emissive="#ffe880" emissiveIntensity={5}
            transparent opacity={0.9}
          />
        </mesh>
        <pointLight position={[0, 0.95, 0]} intensity={2.5} color="#ffe880" distance={2.5} decay={2} />
      </group>

      {/* ── Second lamppost (right side) ── */}
      <group position={[3.8, 0.025, 2.0]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.9, 6]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial
            color="#fffbe0" emissive="#ffe880" emissiveIntensity={5}
            transparent opacity={0.9}
          />
        </mesh>
        <pointLight position={[0, 0.95, 0]} intensity={2.5} color="#ffe880" distance={2.5} decay={2} />
      </group>

      {/* ── Ambient fill light for the park ── */}
      <pointLight position={[0, 1.8, 0]} intensity={3} color="#b8eea0" distance={6} decay={2} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  PRELOAD
// ─────────────────────────────────────────────────────────────────────────────
useGLTF.preload(MODERN_URL,  true)
useGLTF.preload(ATLANTA_URL, true)

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * <FigureRoomDiorama />
 *
 * Drop inside a React Three Fiber Canvas (already inside CityScene.jsx).
 * No props needed — all tuning is via the constants at the top of this file.
 *
 * Placement summary:
 *   Modern Building diorama  →  left side  (X ≈ -5.5, Z ≈ -0.5)
 *   Atlanta diorama          →  right side (X ≈ +5.5, Z ≈ -0.5)
 *   Indoor park              →  centre-front (PARK_X, PARK_Z)
 *
 * To move either building:
 *   Change the position prop on <DiagramBuilding> below.
 * To resize:
 *   Change MODERN_SCALE / ATLANTA_SCALE at the top of this file.
 */
export default function FigureRoomDiorama() {
  return (
    <group>
      {/* ── Left diorama — Modern Building Concepts ──────────────────────────
       *   Position: [x, y, z] in room units.
       *   x=-5.5 puts it on the left side; z=-0.5 is mid-room depth.
       *   Resize via MODERN_SCALE constant. */}
      <Suspense fallback={null}>
        <DiagramBuilding
          url={MODERN_URL}
          scale={MODERN_SCALE}
          position={[-5.5, 0, -0.5]}
        />
      </Suspense>

      {/* ── Right diorama — Atlanta Corporate Office ─────────────────────────
       *   Mirror of above on the right side.
       *   Resize via ATLANTA_SCALE constant. */}
      <Suspense fallback={null}>
        <DiagramBuilding
          url={ATLANTA_URL}
          scale={ATLANTA_SCALE}
          position={[5.5, 0, -0.5]}
        />
      </Suspense>

      {/* ── Indoor park ──────────────────────────────────────────────────────
       *   Centre position controlled by PARK_X / PARK_Z constants.
       *   Size controlled by PARK_W / PARK_D constants. */}
      <IndoorPark />
    </group>
  )
}
