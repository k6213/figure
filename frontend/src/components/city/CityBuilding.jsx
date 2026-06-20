/**
 * CityBuilding.jsx  →  StudentRoom
 * Figure room (22 × 20 × 7.0)
 *
 * Back wall: full-width glass display cabinet (4-shelf + LED lighting)
 * Left wall: window + bookshelf
 * Right wall: desk + PC setup
 * Front: virtual city portal
 */
import { useThemeStore } from '../../store/themeStore'

export const ROOM_W = 11      // half-width → total 22
export const ROOM_D = 10      // half-depth → total 20
export const ROOM_H = 7.0     // ceiling height

// ── Display cabinet dimensions ───────────────────────────────────────────────────────────────
export const CAB_DEPTH     = 1.3                    // cabinet depth
export const CAB_FRONT_Z   = -ROOM_D + CAB_DEPTH    // glass front Z = -8.7
export const SHELF_HEIGHTS = [0.08, 2.35, 4.62]         // shelf surface Y (3 shelves, height ~2.2m)

const W = ROOM_W
const D = ROOM_D
const H = ROOM_H

// ── Material palette ───────────────────────────────────────────────────────────────
const WALL      = { color: '#ede8dc', roughness: 0.94, metalness: 0.0 }
const CEIL      = { color: '#f5f2ea', roughness: 1.0,  metalness: 0.0 }
const WOOD_D    = { color: '#8c6030', roughness: 0.75, metalness: 0.0 }
const WOOD_L    = { color: '#b88a4a', roughness: 0.80, metalness: 0.0 }
const METAL     = { color: '#2a2a2a', roughness: 0.35, metalness: 0.6 }
const CAB_FRAME = { color: '#1a1008', roughness: 0.28, metalness: 0.65 }

// ── Figure display cabinet ─────────────────────────────────────────────────────────────
function DisplayCabinet() {
  const CW  = W * 2 - 0.2      // total width 21.8
  const CH  = H - 0.3          // height 5.2
  const CD  = CAB_DEPTH        // 1.3
  const CZM = -D + CD / 2      // center Z −9.35
  const CFZ = CAB_FRONT_Z      // glass front Z −8.7

  return (
    <group>
      {/* ── Back panel ── */}
      <mesh position={[0, CH / 2, -D + 0.03]}>
        <boxGeometry args={[CW, CH, 0.05]} />
        <meshStandardMaterial {...CAB_FRAME} />
      </mesh>

      {/* ── Left/right side panels ── */}
      {[-W + 0.07, W - 0.07].map((x, i) => (
        <mesh key={i} position={[x, CH / 2, CZM]}>
          <boxGeometry args={[0.07, CH, CD]} />
          <meshStandardMaterial {...CAB_FRAME} />
        </mesh>
      ))}

      {/* ── Top cap ── */}
      <mesh position={[0, CH + 0.04, CZM]}>
        <boxGeometry args={[CW + 0.04, 0.08, CD + 0.04]} />
        <meshStandardMaterial {...CAB_FRAME} />
      </mesh>

      {/* ── 3 shelves ── */}
      {SHELF_HEIGHTS.map((y, i) => (
        <mesh key={i} position={[0, y + 0.03, CZM]}>
          <boxGeometry args={[CW - 0.16, 0.06, CD - 0.04]} />
          <meshStandardMaterial color="#2a1808" roughness={0.45} metalness={0.3} />
        </mesh>
      ))}

      {/* ── 3 vertical dividers (separating 4 bays) ── */}
      {[-5.0, 0.0, 5.0].map((x, i) => (
        <mesh key={i} position={[x, CH / 2, CZM + 0.02]}>
          <boxGeometry args={[0.05, CH - 0.1, CD - 0.08]} />
          <meshStandardMaterial {...CAB_FRAME} />
        </mesh>
      ))}

      {/* ── LED strip (above each shelf front) ── */}
      {SHELF_HEIGHTS.map((y, i) => (
        <mesh key={i} position={[0, y + 0.072, CFZ - 0.055]}>
          <boxGeometry args={[CW - 0.2, 0.012, 0.016]} />
          <meshStandardMaterial
            color="#fff8e0" emissive="#ffeebb"
            emissiveIntensity={4.0} toneMapped={false}
          />
        </mesh>
      ))}

      {/* ── Glass front (per shelf section) ── */}
      {SHELF_HEIGHTS.map((y, i) => {
        const topY = i < SHELF_HEIGHTS.length - 1 ? SHELF_HEIGHTS[i + 1] : CH
        const panH = topY - y - 0.06
        const panY = y + 0.06 + panH / 2
        return (
          <mesh key={i} position={[0, panY, CFZ + 0.01]}>
            <planeGeometry args={[CW - 0.16, panH]} />
            <meshStandardMaterial
              color="#b8d4f0"
              transparent opacity={0.13}
              roughness={0.0} metalness={0.45}
            />
          </mesh>
        )
      })}

      {/* ── Front horizontal shelf border frames ── */}
      {SHELF_HEIGHTS.map((y, i) => (
        <mesh key={i} position={[0, y + 0.06, CFZ]}>
          <boxGeometry args={[CW - 0.12, 0.05, 0.06]} />
          <meshStandardMaterial {...CAB_FRAME} />
        </mesh>
      ))}

      {/* ── Front outer frame ── */}
      {/* Top */}
      <mesh position={[0, CH, CFZ]}>
        <boxGeometry args={[CW + 0.04, 0.07, 0.07]} />
        <meshStandardMaterial {...CAB_FRAME} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, 0, CFZ]}>
        <boxGeometry args={[CW + 0.04, 0.06, 0.07]} />
        <meshStandardMaterial {...CAB_FRAME} />
      </mesh>
      {/* Left */}
      <mesh position={[-W + 0.07, CH / 2, CFZ]}>
        <boxGeometry args={[0.07, CH + 0.08, 0.07]} />
        <meshStandardMaterial {...CAB_FRAME} />
      </mesh>
      {/* Right */}
      <mesh position={[W - 0.07, CH / 2, CFZ]}>
        <boxGeometry args={[0.07, CH + 0.08, 0.07]} />
        <meshStandardMaterial {...CAB_FRAME} />
      </mesh>

      {/* ── Front vertical divider frames ── */}
      {[-5.0, 0.0, 5.0].map((x, i) => (
        <mesh key={i} position={[x, CH / 2, CFZ]}>
          <boxGeometry args={[0.05, CH + 0.04, 0.07]} />
          <meshStandardMaterial {...CAB_FRAME} />
        </mesh>
      ))}
    </group>
  )
}

// ── Bookshelf ─────────────────────────────────────────────────────────────────────
function Bookshelf({ position }) {
  const shelves = [-0.72, -0.22, 0.28, 0.78]
  const books = [
    ['#c04040', 0.14, -0.64], ['#4060c0', 0.12, -0.50], ['#40a060', 0.16, -0.34],
    ['#d08030', 0.13, -0.20], ['#8040c0', 0.15, -0.04], ['#c06060', 0.12,  0.10],
    ['#5080c0', 0.14,  0.25], ['#40806a', 0.13,  0.40], ['#c0a030', 0.16,  0.55],
    ['#904050', 0.12, -0.64], ['#3060a0', 0.15, -0.48],
  ]

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.38, 2.2, 1.8]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
      <mesh position={[0.17, 0, 0]}>
        <boxGeometry args={[0.02, 2.1, 1.72]} />
        <meshStandardMaterial color="#6a4520" roughness={0.9} />
      </mesh>
      {shelves.map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.36, 0.04, 1.72]} />
          <meshStandardMaterial {...WOOD_L} />
        </mesh>
      ))}
      {books.map(([color, w, z], i) => {
        const shelfIdx = Math.floor(i / 3)
        const shelfY   = shelves[Math.min(shelfIdx, shelves.length - 1)] + 0.15
        return (
          <mesh key={i} position={[0, shelfY, z]}>
            <boxGeometry args={[0.24, 0.25, w]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

// ── Desk + PC setup ────────────────────────────────────────────────────────────
function Desk({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[2.6, 0.06, 1.1]} />
        <meshStandardMaterial {...WOOD_L} />
      </mesh>
      <mesh position={[0.88, 0.37, 0]} castShadow>
        <boxGeometry args={[0.82, 0.74, 1.04]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
      {[0.15, -0.18].map((dy, i) => (
        <mesh key={i} position={[0.46, 0.37 + dy, -0.54]}>
          <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      <mesh position={[-0.88, 0.37, 0]}>
        <boxGeometry args={[0.06, 0.74, 1.04]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>

      {/* Monitor */}
      <mesh position={[0, 1.26, -0.32]} castShadow>
        <boxGeometry args={[1.1, 0.65, 0.07]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 1.26, -0.285]}>
        <planeGeometry args={[1.0, 0.57]} />
        <meshStandardMaterial
          color="#0a1a35" emissive="#0d2a55"
          emissiveIntensity={1.2} toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.85, -0.32]}>
        <cylinderGeometry args={[0.04, 0.06, 0.18, 8]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.78, -0.32]}>
        <boxGeometry args={[0.28, 0.035, 0.2]} />
        <meshStandardMaterial {...METAL} />
      </mesh>

      {/* Keyboard + mouse */}
      <mesh position={[0, 0.80, 0.12]}>
        <boxGeometry args={[0.72, 0.022, 0.26]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh position={[0.55, 0.80, 0.12]}>
        <boxGeometry args={[0.08, 0.025, 0.13]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Cup */}
      <mesh position={[-0.8, 0.9, 0.2]}>
        <cylinderGeometry args={[0.055, 0.045, 0.13, 12]} />
        <meshStandardMaterial color="#3a6a9a" roughness={0.6} />
      </mesh>

      {/* Under-desk RGB LED */}
      <mesh position={[0, 0.72, 0.56]}>
        <boxGeometry args={[2.5, 0.015, 0.015]} />
        <meshStandardMaterial
          color="#44aaff" emissive="#2266ff"
          emissiveIntensity={1.8} toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── Poster/frame ───────────────────────────────────────────────────────────────
function PosterFrame({ position, rotation, w = 0.9, h = 1.1, color, accent }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[w + 0.06, h + 0.06, 0.025]} />
        <meshStandardMaterial color="#7a5a30" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0.014]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={color} emissive={accent} emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[0, h * 0.2, 0.015]}>
        <planeGeometry args={[w * 0.7, h * 0.3]} />
        <meshStandardMaterial color={accent} transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

// ── Window ─────────────────────────────────────────────────────────────────────
function Window({ position, rotation = [0, 0, 0], w = 2.6, h = 1.6 }) {
  const ft = 0.07
  const frameMat = { color: '#e8e0cc', roughness: 0.7, metalness: 0.05 }
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.3]}>
        <planeGeometry args={[w + 0.5, h + 0.5]} />
        <meshStandardMaterial
          color="#a8c8e0" emissive="#88b8d8"
          emissiveIntensity={0.7} toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.6, -0.3, -0.28]}>
        <planeGeometry args={[0.55, 0.8]} />
        <meshStandardMaterial color="#3a6a2a" emissive="#284820" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.5, -0.4, -0.28]}>
        <planeGeometry args={[0.45, 0.6]} />
        <meshStandardMaterial color="#2e5820" emissive="#203c16" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color="#b8d4e8" transparent opacity={0.35}
          roughness={0.0} metalness={0.15}
          emissive="#90b8d0" emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[w + ft, ft * 0.7, 0.035]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[ft * 0.7, h + ft, 0.035]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      {[
        [0,  (h + ft) / 2, [w + ft * 2, ft, 0.05]],
        [0, -(h + ft) / 2, [w + ft * 2, ft, 0.05]],
        [-(w + ft) / 2, 0, [ft, h, 0.05]],
        [ (w + ft) / 2, 0, [ft, h, 0.05]],
      ].map(([px, py, size], i) => (
        <mesh key={i} position={[px, py, 0.02]}>
          <boxGeometry args={size} />
          <meshStandardMaterial {...frameMat} />
        </mesh>
      ))}
    </group>
  )
}

// ── Ceiling light fixture ────────────────────────────────────────────────────────────
function CeilingLight({ position }) {
  const emissive = useThemeStore(s => s.theme.ceilingLightEmissive)
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.9, 0.06, 0.4]} />
        <meshStandardMaterial color="#f0ece4" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.032, 0]}>
        <planeGeometry args={[0.82, 0.34]} />
        <meshStandardMaterial color="#fffbe8" emissive={emissive} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── Japanese lantern (Naruto decor) ───────────────────────────────────────────────
function Lantern({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.44, 4]} />
        <meshStandardMaterial color="#2a1800" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.38, 10]} />
        <meshStandardMaterial color="#cc2200" emissive="#ff4400" emissiveIntensity={1.0} toneMapped={false} />
      </mesh>
      <mesh position={[0,  0.20, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.055, 10]} />
        <meshStandardMaterial color="#881400" />
      </mesh>
      <mesh position={[0, -0.20, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.055, 10]} />
        <meshStandardMaterial color="#881400" />
      </mesh>
      <mesh position={[0, 0, 0.162]}>
        <planeGeometry args={[0.07, 0.22]} />
        <meshStandardMaterial color="#fff8e0" emissive="#fffae8" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── Shuriken (4 overlapping boxes → 8-point star) ─────────────────────────────────
function Shuriken({ position, rotation }) {
  const mat = <meshStandardMaterial color="#3a3a3a" roughness={0.2} metalness={0.85} />
  return (
    <group position={position} rotation={rotation}>
      <mesh>{mat}<boxGeometry args={[0.24, 0.055, 0.055]} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>{mat}<boxGeometry args={[0.24, 0.055, 0.055]} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>{mat}<boxGeometry args={[0.24, 0.055, 0.055]} /></mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>{mat}<boxGeometry args={[0.24, 0.055, 0.055]} /></mesh>
      <mesh><cylinderGeometry args={[0.03, 0.03, 0.07, 8]} />{mat}</mesh>
    </group>
  )
}

// ── Kunai ─────────────────────────────────────────────────────────────────────────
function Kunai({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.18, 0]}>
        <coneGeometry args={[0.022, 0.28, 4]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.15} metalness={0.9} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.016, 0.016, 0.20, 6]} />
        <meshStandardMaterial color="#2a1400" roughness={0.82} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <torusGeometry args={[0.028, 0.006, 6, 10]} />
        <meshStandardMaterial color="#555" roughness={0.25} metalness={0.75} />
      </mesh>
    </group>
  )
}

// ── Ninja scroll ──────────────────────────────────────────────────────────────────
function NinjaScroll({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.065, 10]} />
        <meshStandardMaterial color="#8b5e2a" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.065, 10]} />
        <meshStandardMaterial color="#8b5e2a" roughness={0.6} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 0.64, 10]} />
        <meshStandardMaterial color="#f0e0b0" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.037]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.055, 0.5]} />
        <meshStandardMaterial color="#cc2200" emissive="#881100" emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── All Naruto-themed decorations ─────────────────────────────────────────────────
function NarutoDecor() {
  return (
    <group>
      {/* Hanging lanterns */}
      <Lantern position={[-5.5, 6.25, 2]} />
      <Lantern position={[ 5.5, 6.25, 2]} />
      <Lantern position={[  0,  6.25, -2]} />
      <Lantern position={[-8.5, 6.25, -4]} />
      <Lantern position={[ 8.5, 6.25, -4]} />
      {/* Lantern glow */}
      <pointLight position={[-5.5, 5.9, 2]}  color="#ff4400" intensity={7}  distance={4} decay={2} />
      <pointLight position={[ 5.5, 5.9, 2]}  color="#ff4400" intensity={7}  distance={4} decay={2} />
      <pointLight position={[  0,  5.9, -2]} color="#ff4400" intensity={7}  distance={4} decay={2} />
      <pointLight position={[-8.5, 5.9, -4]} color="#ff4400" intensity={5}  distance={3} decay={2} />
      <pointLight position={[ 8.5, 5.9, -4]} color="#ff4400" intensity={5}  distance={3} decay={2} />
      {/* Shurikens pinned on right wall */}
      <Shuriken position={[10.92, 3.2, 2.5]}  rotation={[0, -Math.PI/2, 0.0]}       />
      <Shuriken position={[10.92, 2.1, 5.0]}  rotation={[0, -Math.PI/2, Math.PI/7]} />
      <Shuriken position={[10.92, 4.5, 0.5]}  rotation={[0, -Math.PI/2, -Math.PI/5]}/>
      {/* Kunai embedded in left wall */}
      <Kunai position={[-10.92, 2.8, 3.5]}  rotation={[0, Math.PI/2, Math.PI/10]}  />
      <Kunai position={[-10.92, 4.0, 5.5]}  rotation={[0, Math.PI/2, -Math.PI/12]} />
      <Kunai position={[-10.92, 3.4, 1.5]}  rotation={[0, Math.PI/2, -Math.PI/8]}  />
      {/* Ninja scroll on right wall */}
      <NinjaScroll position={[10.92, 5.0, -3.5]} rotation={[0, -Math.PI/2, 0]} />
      {/* Floor seal circle (Naruto summoning array glow) */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.006, 2]}>
        <ringGeometry args={[3.5, 3.7, 64]} />
        <meshStandardMaterial color="#cc2200" emissive="#ff2200" emissiveIntensity={1.2} toneMapped={false} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.006, 2]}>
        <ringGeometry args={[2.2, 2.35, 64]} />
        <meshStandardMaterial color="#cc2200" emissive="#ff2200" emissiveIntensity={1.0} toneMapped={false} transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function StudentRoom() {
  const theme = useThemeStore(s => s.theme)
  const wall  = theme.wall
  const ceil  = theme.ceil
  const base  = theme.baseboard
  const pc    = theme.portalColor
  const pe    = theme.portalEmissive
  const isNaruto = theme.id === 'naruto'

  return (
    <group>
      {/* ══ Back wall ══ */}
      <mesh position={[0, H / 2, -D]} receiveShadow>
        <planeGeometry args={[W * 2, H]} />
        <meshStandardMaterial {...wall} />
      </mesh>

      {/* ══ Left wall ══ */}
      <mesh position={[-W, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D * 2, H]} />
        <meshStandardMaterial {...wall} />
      </mesh>

      {/* ══ Right wall ══ */}
      <mesh position={[W, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D * 2, H]} />
        <meshStandardMaterial {...wall} />
      </mesh>

      {/* ══ Ceiling ══ */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
        <meshStandardMaterial {...ceil} />
      </mesh>

      {/* ══ Baseboard ══ */}
      <mesh position={[0, 0.06, -D + 0.01]}>
        <boxGeometry args={[W * 2, 0.12, 0.025]} />
        <meshStandardMaterial color={base} roughness={0.9} />
      </mesh>
      <mesh position={[-W + 0.01, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[D * 2, 0.12, 0.025]} />
        <meshStandardMaterial color={base} roughness={0.9} />
      </mesh>
      <mesh position={[W - 0.01, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[D * 2, 0.12, 0.025]} />
        <meshStandardMaterial color={base} roughness={0.9} />
      </mesh>

      {/* ══ Figure display cabinet ══ */}
      <DisplayCabinet />

      {/* ══ Ceiling light fixtures ══ */}
      <CeilingLight position={[0, H - 0.031, -4]} />
      <CeilingLight position={[0, H - 0.031,  3]} />

      {/* ══ Front wall panels (arch opening) ══ */}
      <mesh position={[-(W + 2.8) / 2, H / 2, D - 0.02]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[W - 2.8, H]} />
        <meshStandardMaterial {...wall} />
      </mesh>
      <mesh position={[(W + 2.8) / 2, H / 2, D - 0.02]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[W - 2.8, H]} />
        <meshStandardMaterial {...wall} />
      </mesh>
      <mesh position={[0, (5.0 + H) / 2, D - 0.02]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[5.6, H - 5.0]} />
        <meshStandardMaterial {...wall} />
      </mesh>

      {/* Front wall baseboard */}
      <mesh position={[-(W + 2.8) / 2, 0.06, D - 0.04]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[W - 2.8, 0.12, 0.025]} />
        <meshStandardMaterial color={base} roughness={0.9} />
      </mesh>
      <mesh position={[(W + 2.8) / 2, 0.06, D - 0.04]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[W - 2.8, 0.12, 0.025]} />
        <meshStandardMaterial color={base} roughness={0.9} />
      </mesh>

      {/* ══ Portal arch ══ */}
      <mesh position={[-2.8, 2.5, D]}>
        <boxGeometry args={[0.14, 5.0, 0.14]} />
        <meshStandardMaterial color={pc} emissive={pe} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh position={[2.8, 2.5, D]}>
        <boxGeometry args={[0.14, 5.0, 0.14]} />
        <meshStandardMaterial color={pc} emissive={pe} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 5.07, D]}>
        <boxGeometry args={[5.74, 0.14, 0.14]} />
        <meshStandardMaterial color={pc} emissive={pe} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.01, D]}>
        <boxGeometry args={[5.6, 0.018, 0.3]} />
        <meshStandardMaterial color={pc} emissive={pe} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>

      {/* ══ Naruto-theme decorations ══ */}
      {isNaruto && <NarutoDecor />}
    </group>
  )
}

export { StudentRoom }
