/**
 * CityFloor.jsx  →  StudentRoomFloor
 * Figure room — warm wood floor + figure display rug
 *
 * Room size: W=11 (half-width=total 22), D=10 (half-depth=total 20) — same as CityBuilding
 */
import { useMemo } from 'react'
import { useThemeStore } from '../../store/themeStore'

// Room dimensions (must stay in sync with CityBuilding's W and D)
const W = 11   // half-width → total 22
const D = 10   // half-depth → total 20

export default function RoomFloor() {
  const floorTheme = useThemeStore(s => s.theme.floor)

  // Floor plank lines (0.85 spacing in X direction, drawn inside room only)
  const planks = useMemo(
    () => Array.from({ length: 27 }, (_, i) => -W + 0.85 + i * 0.85),
    [],
  )

  return (
    <group>
      {/* ── Main floor ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W * 2, D * 2]} />
        <meshStandardMaterial color={floorTheme.color} roughness={floorTheme.roughness} metalness={0.0} />
      </mesh>

      {/* ── Floor plank seam lines ── */}
      {planks.map((x, i) => (
        <mesh key={`pk-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.001, 0]}>
          <planeGeometry args={[0.014, D * 2]} />
          <meshStandardMaterial color={floorTheme.seam} transparent opacity={0.35} />
        </mesh>
      ))}

      {/* ── Viewing area rug ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 2.0]}>
        <planeGeometry args={[18, 8]} />
        <meshStandardMaterial color={floorTheme.rug} roughness={1.0} metalness={0} transparent opacity={0.50} />
      </mesh>

      {/* ── Rug border ── */}
      {[
        [0,   4.1, 18.4, 0.055],
        [0,  -4.1, 18.4, 0.055],
        [ 9.3, 0,  0.055, 8.2],
        [-9.3, 0,  0.055, 8.2],
      ].map(([x, z, w, h], i) => (
        <mesh key={`rb-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.004, z + 2.0]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={floorTheme.rugBorder} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  )
}
