/**
 * FurnitureGeometry.jsx
 * 가구 타입별 절차적(Procedural) Three.js 메시
 *
 * 타입: showcase, bookshelf, shelf, desk, bed, chair, sofa,
 *       lamp, carpet, poster, plant
 */

/* ── 공통 재질 상수 ─────────────────────────────────────────────────────────── */
const WOOD_L  = { color: '#b88a4a', roughness: 0.78, metalness: 0.0 }
const WOOD_D  = { color: '#8c6030', roughness: 0.82, metalness: 0.0 }
const METAL   = { color: '#2a2a2a', roughness: 0.35, metalness: 0.7 }
const FABRIC  = { color: '#4a5a6a', roughness: 1.0,  metalness: 0.0 }
const WHITE   = { color: '#f0ece4', roughness: 0.8,  metalness: 0.0 }
const CAB     = { color: '#1a1008', roughness: 0.28, metalness: 0.65 }

// ── 장식장 ────────────────────────────────────────────────────────────────────
function ShowcaseGeometry({ w, h, d }) {
  const SHELF_Y = [0.44, 2.3, 4.16].filter(y => y < h - 0.3)
  const hz = d / 2

  return (
    <group>
      {/* 뒷 판 */}
      <mesh position={[0, h / 2, -hz + 0.025]}>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial {...CAB} />
      </mesh>

      {/* 좌·우 측면 */}
      {[-w / 2 + 0.035, w / 2 - 0.035].map((x, i) => (
        <mesh key={i} position={[x, h / 2, 0]}>
          <boxGeometry args={[0.05, h, d]} />
          <meshStandardMaterial {...CAB} />
        </mesh>
      ))}

      {/* 상단 캡 */}
      <mesh position={[0, h + 0.04, 0]}>
        <boxGeometry args={[w + 0.04, 0.08, d + 0.04]} />
        <meshStandardMaterial {...CAB} />
      </mesh>

      {/* 선반 보드 */}
      {SHELF_Y.map((y, i) => (
        <mesh key={i} position={[0, y + 0.03, 0]}>
          <boxGeometry args={[w - 0.12, 0.06, d - 0.04]} />
          <meshStandardMaterial color="#2a1808" roughness={0.45} metalness={0.3} />
        </mesh>
      ))}

      {/* 수직 칸막이 (3개 → 4칸) */}
      {[-w / 3, 0, w / 3].map((x, i) => (
        <mesh key={i} position={[x, h / 2, 0.01]}>
          <boxGeometry args={[0.04, h - 0.08, d - 0.08]} />
          <meshStandardMaterial {...CAB} />
        </mesh>
      ))}

      {/* LED 띠 */}
      {SHELF_Y.map((y, i) => (
        <mesh key={i} position={[0, y + 0.072, hz - 0.055]}>
          <boxGeometry args={[w - 0.18, 0.012, 0.016]} />
          <meshStandardMaterial
            color="#fff8e0" emissive="#ffeebb"
            emissiveIntensity={4.0} toneMapped={false}
          />
        </mesh>
      ))}

      {/* 유리 전면 패널 */}
      {SHELF_Y.map((y, i) => {
        const topY = i < SHELF_Y.length - 1 ? SHELF_Y[i + 1] : h
        const panH = topY - y - 0.06
        const panY = y + 0.06 + panH / 2
        return (
          <mesh key={i} position={[0, panY, hz + 0.01]}>
            <planeGeometry args={[w - 0.12, panH]} />
            <meshStandardMaterial
              color="#b8d4f0" transparent opacity={0.13}
              roughness={0.0} metalness={0.45}
            />
          </mesh>
        )
      })}

      {/* 전면 외곽 프레임 */}
      <mesh position={[0, h, hz]}><boxGeometry args={[w + 0.04, 0.07, 0.06]} /><meshStandardMaterial {...CAB} /></mesh>
      <mesh position={[0, 0, hz]}><boxGeometry args={[w + 0.04, 0.06, 0.06]} /><meshStandardMaterial {...CAB} /></mesh>
      {[-w / 2 + 0.035, w / 2 - 0.035].map((x, i) => (
        <mesh key={i} position={[x, h / 2, hz]}>
          <boxGeometry args={[0.05, h + 0.08, 0.07]} />
          <meshStandardMaterial {...CAB} />
        </mesh>
      ))}
      {[-w / 3, 0, w / 3].map((x, i) => (
        <mesh key={i} position={[x, h / 2, hz]}>
          <boxGeometry args={[0.04, h + 0.04, 0.07]} />
          <meshStandardMaterial {...CAB} />
        </mesh>
      ))}
    </group>
  )
}

// ── 책장 ─────────────────────────────────────────────────────────────────────
// Convention: w = X extent (face width), d = Z extent (depth from wall)
// Open face is at local -Z; rotate Y = -PI/2 for left-wall placement (face → +X)
function BookshelfGeometry({ w, h, d }) {
  const shelves = [0.0, 0.52, 1.04, 1.56, 2.08].filter(y => y < h)
  const BOOK_COLORS = ['#c04040','#4060c0','#40a060','#d08030','#8040c0','#c06060','#5080c0','#c0a030']
  return (
    <group>
      {/* 본체 — w(X) × h(Y) × d(Z) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
      {/* 뒷판 — +Z쪽(벽면) */}
      <mesh position={[0, 0, d / 2 - 0.01]}>
        <boxGeometry args={[w - 0.04, h - 0.04, 0.02]} />
        <meshStandardMaterial color="#6a4520" roughness={0.9} />
      </mesh>
      {/* 선반 — X 방향으로 펼쳐짐 */}
      {shelves.map((y, i) => (
        <mesh key={i} position={[0, -h / 2 + y + 0.02, 0]}>
          <boxGeometry args={[w - 0.04, 0.04, d - 0.04]} />
          <meshStandardMaterial {...WOOD_L} />
        </mesh>
      ))}
      {/* 책들 — X 방향으로 배열, -Z면(정면)에서 보임 */}
      {shelves.slice(0, -1).map((y, si) =>
        BOOK_COLORS.slice(0, 5).map((color, bi) => {
          const bx = -w / 2 + 0.1 + bi * (w - 0.2) / 4
          const bh = 0.28 + (bi % 3) * 0.06
          return (
            <mesh key={`b-${si}-${bi}`} position={[bx, -h / 2 + y + 0.02 + bh / 2 + 0.04, 0]}>
              <boxGeometry args={[0.06 + (bi % 2) * 0.03, bh, d - 0.1]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
          )
        })
      )}
    </group>
  )
}

// ── 벽 선반 ──────────────────────────────────────────────────────────────────
function ShelfGeometry({ w, h, d }) {
  return (
    <group>
      {/* 선반 판 */}
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...WOOD_L} />
      </mesh>
      {/* 브라켓 2개 */}
      {[-w / 2 + 0.12, w / 2 - 0.12].map((x, i) => (
        <group key={i} position={[x, -0.14, -d / 2 + 0.02]}>
          <mesh>
            <boxGeometry args={[0.04, 0.28, 0.04]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
          <mesh position={[0, -0.14, 0.1]}>
            <boxGeometry args={[0.04, 0.04, 0.24]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── 책상 ─────────────────────────────────────────────────────────────────────
function DeskGeometry({ w, h, d }) {
  return (
    <group>
      {/* 상판 */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial {...WOOD_L} />
      </mesh>
      {/* 서랍 유닛 */}
      <mesh position={[w / 2 - 0.45, -h / 2, 0]} castShadow>
        <boxGeometry args={[0.82, h, d - 0.04]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
      {/* 서랍 손잡이 */}
      {[-0.16, 0.09, 0.34].map((dy, i) => (
        <mesh key={i} position={[w / 2 - 0.86, -dy, -d / 2 + 0.01]}>
          <boxGeometry args={[0.14, 0.02, 0.02]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      {/* 왼쪽 패널 */}
      <mesh position={[-w / 2 + 0.03, -h / 2, 0]}>
        <boxGeometry args={[0.05, h, d - 0.04]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
      {/* 모니터 */}
      <mesh position={[0, 0.55, -d / 2 + 0.12]} castShadow>
        <boxGeometry args={[1.0, 0.6, 0.06]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.55, -d / 2 + 0.145]}>
        <planeGeometry args={[0.9, 0.52]} />
        <meshStandardMaterial color="#0a1a35" emissive="#0d2a55" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.08, -d / 2 + 0.12]}>
        <cylinderGeometry args={[0.035, 0.045, 0.5, 8]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {/* 키보드 */}
      <mesh position={[0, 0.035, 0.05]}>
        <boxGeometry args={[0.7, 0.02, 0.24]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.55} />
      </mesh>
      {/* RGB LED 띠 */}
      <mesh position={[0, -0.04, d / 2 - 0.02]}>
        <boxGeometry args={[w - 0.15, 0.012, 0.012]} />
        <meshStandardMaterial color="#44aaff" emissive="#2266ff" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── 침대 ─────────────────────────────────────────────────────────────────────
function BedGeometry({ w, h, d }) {
  return (
    <group>
      {/* 프레임 */}
      <mesh position={[0, -h / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[w + 0.12, 0.2, d + 0.12]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
      {/* 매트리스 */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.45, d * 0.88]} />
        <meshStandardMaterial color="#e8e0d4" roughness={1.0} />
      </mesh>
      {/* 이불 */}
      <mesh position={[0, h * 0.15, d * 0.12]} castShadow>
        <boxGeometry args={[w - 0.06, h * 0.28, d * 0.72]} />
        <meshStandardMaterial color="#6a7a9a" roughness={1.0} />
      </mesh>
      {/* 베개 */}
      {[-w / 4 + 0.05, w / 4 - 0.05].map((x, i) => (
        <mesh key={i} position={[x, h * 0.16, -d / 2 + 0.18]} castShadow>
          <boxGeometry args={[w / 2 - 0.18, 0.1, 0.3]} />
          <meshStandardMaterial {...WHITE} />
        </mesh>
      ))}
      {/* 헤드보드 */}
      <mesh position={[0, h * 0.35, -d / 2 - 0.04]} castShadow>
        <boxGeometry args={[w + 0.14, h * 0.7, 0.08]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
    </group>
  )
}

// ── 의자 ─────────────────────────────────────────────────────────────────────
function ChairGeometry({ w, h, d }) {
  return (
    <group>
      {/* 시트 */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w, 0.08, d]} />
        <meshStandardMaterial {...FABRIC} />
      </mesh>
      {/* 등받이 */}
      <mesh position={[0, 0.38, -d / 2 + 0.04]} castShadow>
        <boxGeometry args={[w, 0.68, 0.06]} />
        <meshStandardMaterial {...FABRIC} />
      </mesh>
      {/* 기둥 */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.04, 0.055, 0.55, 8]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {/* 베이스 */}
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 5]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {/* 바퀴 5개 */}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, -0.63, Math.sin(a) * 0.22]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color="#111" roughness={0.5} />
          </mesh>
        )
      })}
      {/* 팔걸이 */}
      {[-w / 2 - 0.02, w / 2 + 0.02].map((x, i) => (
        <mesh key={i} position={[x, 0.25, 0]}>
          <boxGeometry args={[0.04, 0.46, d - 0.08]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
    </group>
  )
}

// ── 소파 ─────────────────────────────────────────────────────────────────────
function SofaGeometry({ w, h, d }) {
  return (
    <group>
      {/* 본체 프레임 */}
      <mesh position={[0, -h / 2 + 0.08, 0]} castShadow>
        <boxGeometry args={[w, 0.16, d]} />
        <meshStandardMaterial {...WOOD_D} />
      </mesh>
      {/* 좌석 쿠션 (2개) */}
      {[-w / 4, w / 4].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} castShadow>
          <boxGeometry args={[w / 2 - 0.04, h * 0.42, d * 0.72]} />
          <meshStandardMaterial {...FABRIC} />
        </mesh>
      ))}
      {/* 등받이 */}
      <mesh position={[0, h * 0.28, -d / 2 + 0.12]} castShadow>
        <boxGeometry args={[w, h * 0.55, 0.22]} />
        <meshStandardMaterial color="#3a4a5a" roughness={1.0} />
      </mesh>
      {/* 팔걸이 (좌·우) */}
      {[-w / 2 + 0.1, w / 2 - 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.1, 0]} castShadow>
          <boxGeometry args={[0.2, h * 0.7, d]} />
          <meshStandardMaterial color="#3a4a5a" roughness={1.0} />
        </mesh>
      ))}
      {/* 다리 */}
      {[[-w / 2 + 0.12, -d / 2 + 0.1], [w / 2 - 0.12, -d / 2 + 0.1],
        [-w / 2 + 0.12,  d / 2 - 0.1], [w / 2 - 0.12,  d / 2 - 0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, -h / 2 + 0.04, z]}>
          <cylinderGeometry args={[0.035, 0.04, 0.15, 6]} />
          <meshStandardMaterial {...WOOD_D} />
        </mesh>
      ))}
    </group>
  )
}

// ── 탁상 전등 ─────────────────────────────────────────────────────────────────
function DeskLampGeometry({ h }) {
  return (
    <group>
      {/* 베이스 */}
      <mesh position={[0, -h / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.04, 12]} />
        <meshStandardMaterial color="#222" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* 암 */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.015, 0.015, h * 0.72, 8]} />
        <meshStandardMaterial color="#333" roughness={0.35} metalness={0.65} />
      </mesh>
      {/* 갓 */}
      <mesh position={[0.06, h * 0.28, 0]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.09, 0.14, 12, 1, true]} />
        <meshStandardMaterial color="#e8d88a" roughness={0.5} metalness={0.1} side={2} />
      </mesh>
      {/* 전구 */}
      <mesh position={[0.09, h * 0.24, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#fffbe0" emissive="#ffe880" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── 플로어 스탠드 ─────────────────────────────────────────────────────────────
function FloorLampGeometry({ h }) {
  return (
    <group>
      {/* 베이스 */}
      <mesh position={[0, -h / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.04, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* 폴 */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.022, h * 0.88, 8]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.35} metalness={0.7} />
      </mesh>
      {/* 갓 */}
      <mesh position={[0, h / 2 - 0.1, 0]}>
        <coneGeometry args={[0.18, 0.28, 16, 1, true]} />
        <meshStandardMaterial color="#e8d88a" roughness={0.5} metalness={0.1} side={2} />
      </mesh>
      {/* 전구 */}
      <mesh position={[0, h / 2 - 0.14, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#fffbe0" emissive="#ffe880" emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── 천장 조명 ─────────────────────────────────────────────────────────────────
function CeilingLampGeometry({ w, d }) {
  return (
    <group>
      {/* 기구 박스 */}
      <mesh>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color="#f0ece4" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* 발광 패널 */}
      <mesh position={[0, -0.032, 0]}>
        <planeGeometry args={[w * 0.9, d * 0.9]} />
        <meshStandardMaterial
          color="#fffbe8" emissive="#ffe8a0"
          emissiveIntensity={2.5} toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── 카페트 ───────────────────────────────────────────────────────────────────
function CarpetGeometry({ w, h, d }) {
  const BORDER = 0.08
  return (
    <group>
      {/* 메인 카페트 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#7a4a4a" roughness={1.0} />
      </mesh>
      {/* 테두리 안쪽 패턴 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[w - BORDER * 2, d - BORDER * 2]} />
        <meshStandardMaterial color="#5a3535" roughness={1.0} />
      </mesh>
      {/* 테두리 장식 라인 */}
      {[
        [0,  d / 2 - BORDER / 2, w, BORDER],
        [0, -d / 2 + BORDER / 2, w, BORDER],
        [-w / 2 + BORDER / 2, 0, BORDER, d],
        [ w / 2 - BORDER / 2, 0, BORDER, d],
      ].map(([x, z, bw, bd], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.002, z]}>
          <planeGeometry args={[bw, bd]} />
          <meshStandardMaterial color="#c4884a" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ── 벽 포스터 ─────────────────────────────────────────────────────────────────
function PosterGeometry({ w, h, item }) {
  const color  = item?.color       ?? '#1a2a4a'
  const accent = item?.accentColor ?? '#4488cc'
  return (
    <group>
      {/* 프레임 */}
      <mesh>
        <boxGeometry args={[w + 0.06, h + 0.06, 0.025]} />
        <meshStandardMaterial color="#7a5a30" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* 포스터 배경 */}
      <mesh position={[0, 0, 0.014]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={0.15} />
      </mesh>
      {/* 그래픽 요소 */}
      <mesh position={[0, h * 0.15, 0.015]}>
        <planeGeometry args={[w * 0.65, h * 0.28]} />
        <meshStandardMaterial color={accent} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// ── 식물 ─────────────────────────────────────────────────────────────────────
function PlantGeometry({ h }) {
  return (
    <group>
      {/* 화분 */}
      <mesh position={[0, -h / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.2, 10]} />
        <meshStandardMaterial color="#8a5a2a" roughness={0.9} />
      </mesh>
      {/* 흙 */}
      <mesh position={[0, -h / 2 + 0.21, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.02, 10]} />
        <meshStandardMaterial color="#3a2a1a" roughness={1.0} />
      </mesh>
      {/* 줄기 */}
      <mesh position={[0, -h / 2 + 0.32, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.22, 6]} />
        <meshStandardMaterial color="#4a7a3a" roughness={0.8} />
      </mesh>
      {/* 잎 구체 (여러 개) */}
      {[
        [0, h / 2 - 0.08, 0, 0.14],
        [0.08, h / 2 - 0.16, 0.04, 0.1],
        [-0.08, h / 2 - 0.18, 0.02, 0.09],
        [0.04, h / 2 - 0.22, -0.06, 0.09],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 10, 10]} />
          <meshStandardMaterial color={i === 0 ? '#3a8a2a' : '#2e7020'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ── 선택 하이라이트 아웃라인 ──────────────────────────────────────────────────
function SelectionOutline({ dims }) {
  const { w, h, d } = dims
  return (
    <mesh>
      <boxGeometry args={[w + 0.06, h + 0.06, (d ?? w) + 0.06]} />
      <meshStandardMaterial
        color="#00d4ff" emissive="#00d4ff"
        emissiveIntensity={0.6} transparent opacity={0.12}
        side={2} toneMapped={false}
      />
    </mesh>
  )
}

// ── 메인 익스포트 ─────────────────────────────────────────────────────────────
export default function FurnitureGeometry({ item, isSelected }) {
  const { type, dimensions: dims } = item
  const { w = 1, h = 1, d = w } = dims

  let geo = null
  switch (type) {
    case 'showcase':  geo = <ShowcaseGeometry   w={w} h={h} d={d} />; break
    case 'bookshelf': geo = <BookshelfGeometry  w={w} h={h} d={d} />; break
    case 'shelf':     geo = <ShelfGeometry      w={w} h={h} d={d} />; break
    case 'desk':      geo = <DeskGeometry       w={w} h={h} d={d} />; break
    case 'bed':       geo = <BedGeometry        w={w} h={h} d={d} />; break
    case 'chair':     geo = <ChairGeometry      w={w} h={h} d={d} />; break
    case 'sofa':      geo = <SofaGeometry       w={w} h={h} d={d} />; break
    case 'lamp':
      if (item.id === 'lamp-desk')    geo = <DeskLampGeometry   h={h} />
      else if (item.id === 'lamp-ceiling') geo = <CeilingLampGeometry w={w} d={d} />
      else                            geo = <FloorLampGeometry  h={h} />
      break
    case 'carpet':    geo = <CarpetGeometry     w={w} h={h} d={d} />; break
    case 'poster':    geo = <PosterGeometry     w={w} h={h} item={item} />; break
    case 'plant':     geo = <PlantGeometry      h={h}             />; break
    default:
      geo = (
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#888" roughness={0.8} />
        </mesh>
      )
  }

  return (
    <>
      {geo}
      {isSelected && <SelectionOutline dims={dims} />}
    </>
  )
}
