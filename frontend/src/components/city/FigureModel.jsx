/**
 * FigureModel.jsx
 * GLB 피규어 모델 (도시 방 — 바닥 배치, 부드러운 부유 효과)
 *
 * - phaseOffset: 피규어마다 다른 타이밍으로 부유
 * - autoRotate: 상세 패널에서 켜면 천천히 회전
 * - isDragging: 드래그 이동 (선반 아님, 바닥 평면)
 * - isSelected: 바닥 선택 링
 */
import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import { toProxyUrl } from '../../utils/modelUrl'

function applyMattePBR(mat) {
  if ('roughness' in mat) { mat.roughnessMap = null; mat.roughness = 1.0 }
  if ('metalness' in mat) { mat.metalnessMap = null; mat.metalness = 0.0 }
  if ('envMapIntensity' in mat) mat.envMapIntensity = 0.0
  mat.flatShading = false
  mat.needsUpdate = true
}

// ── 플레이스홀더 — 선반 위 3D 홀로그램 구 ────────────────────────────────────
export function PlaceholderFigure({
  slotPosition, positionOffset, scale = 1,
  label, isSelected, onPointerDown, phaseOffset = 0,
}) {
  const sphereRef = useRef()
  const glowRef   = useRef()
  const ringRef   = useRef()
  const [hovered, setHovered] = useState(false)
  const [slotX, slotY, slotZ] = slotPosition ?? [0, 0, 0]
  const { x: ox = 0, y: oy = 0, z: oz = 0 } = positionOffset ?? {}

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.8 + phaseOffset
    // 구 천천히 Y축 회전
    if (sphereRef.current) sphereRef.current.rotation.y += 0.008
    // 글로우 구 펄스
    if (glowRef.current) {
      const pulse = (hovered ? 0.18 : 0.09) + Math.sin(t) * 0.05
      glowRef.current.material.opacity = pulse
      glowRef.current.material.emissiveIntensity = hovered ? 3.0 : 1.8 + Math.sin(t) * 0.4
    }
    // 선택 링 회전
    if (ringRef.current) ringRef.current.rotation.z += 0.012
  })

  // 부유 Y 값 (useFrame 내에서 직접 처리하지 않고 CSS처럼 구 position에 반영)
  const baseY = slotY + oy + 0.42   // 선반 위로 구 반지름만큼 들어올림

  return (
    <group
      position={[slotX + ox, baseY, slotZ + oz]}
      scale={scale}
      onPointerDown={onPointerDown}
      onPointerOver={() => { setHovered(true);  document.body.style.cursor = 'grab' }}
      onPointerOut={() =>  { setHovered(false); document.body.style.cursor = 'auto' }}
    >
      {/* ── 메인 구 (반투명 유리 느낌) ── */}
      <mesh ref={sphereRef} castShadow>
        <sphereGeometry args={[0.36, 24, 24]} />
        <meshStandardMaterial
          color={hovered ? '#1a2060' : '#0d1040'}
          emissive={hovered ? '#0044aa' : '#001166'}
          emissiveIntensity={hovered ? 0.6 : 0.3}
          metalness={0.25} roughness={0.15}
          transparent opacity={0.72}
        />
      </mesh>

      {/* ── 외부 글로우 구 (더 크고 부드러운 발광) ── */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.44, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? '#44aaff' : '#0077cc'}
          emissive={hovered ? '#44aaff' : '#0055bb'}
          emissiveIntensity={1.8}
          transparent opacity={0.09}
          toneMapped={false} depthWrite={false} side={2}
        />
      </mesh>

      {/* ── 내부 핵심 빛 (작은 밝은 구) ── */}
      <mesh>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial
          color={hovered ? '#88ddff' : '#44aaff'}
          emissive={hovered ? '#88ddff' : '#2299ee'}
          emissiveIntensity={hovered ? 4.0 : 2.5}
          transparent opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      {/* ── 적도 회전 링 ── */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.40, 0.018, 8, 48]} />
        <meshStandardMaterial
          color={hovered ? '#44ddff' : '#00aaff'}
          emissive={hovered ? '#44ddff' : '#0088ff'}
          emissiveIntensity={hovered ? 4.0 : 2.5}
          transparent opacity={0.8}
          toneMapped={false} depthWrite={false}
        />
      </mesh>

      {/* ── 선택 시 외곽 강조 링 ── */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.022, 8, 48]} />
          <meshStandardMaterial
            color="#00d4ff" emissive="#00d4ff"
            emissiveIntensity={5.0} transparent opacity={0.9}
            toneMapped={false} depthWrite={false}
          />
        </mesh>
      )}

      {/* ── 바닥 그림자 원 ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
        <circleGeometry args={[0.30, 20]} />
        <meshStandardMaterial color="#000033" transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* ── 호버 레이블 ── */}
      {label && hovered && (
        <Html center position={[0, 0.65, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,0,20,0.94)', border: '1px solid #00d4ff',
            borderRadius: '6px', padding: '3px 8px',
            color: '#80e8ff', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
          }}>{label}</div>
        </Html>
      )}
    </group>
  )
}

// ── GLB 모델 ──────────────────────────────────────────────────────────────────
const DEFAULT_OFFSET = { x: 0, y: 0, z: 0 }

function GLBMesh({
  url, slotPosition, scale, label,
  positionOffset = DEFAULT_OFFSET,
  figureRotationY = 0,
  autoRotate = false,
  isDragging = false,
  liveDragXZ = null,
  isSelected = false,
  onPointerDown,
  phaseOffset = 0,
}) {
  const proxyUrl = useMemo(() => toProxyUrl(url), [url])
  const { scene: src } = useGLTF(proxyUrl)
  const groupRef = useRef()
  const rotRef   = useRef(figureRotationY)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!autoRotate) rotRef.current = figureRotationY
  }, [figureRotationY, autoRotate])

  const { clone: clonedScene, autoYLift } = useMemo(() => {
    const clone = src.clone(true)
    clone.traverse((child) => {
      if (!child.isMesh) return
      if (child.geometry) {
        const geo = child.geometry.clone()
        geo.deleteAttribute('normal')
        geo.computeVertexNormals()
        child.geometry = geo
      }
      const cm = (m) => { const n = m.clone(); applyMattePBR(n); return n }
      child.material = Array.isArray(child.material)
        ? child.material.map(cm) : cm(child.material)
      child.castShadow    = true
      child.receiveShadow = true
    })
    const box      = new THREE.Box3().setFromObject(clone)
    const autoYLift = box.min.y < -0.01 ? -box.min.y : 0
    return { clone, autoYLift }
  }, [src])

  const [slotX, slotY, slotZ] = slotPosition
  const { x: ox = 0, y: oy = 0, z: oz = 0 } = positionOffset
  const normalX = slotX + ox
  const normalY = slotY + autoYLift + oy
  const normalZ = slotZ + oz

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return

    if (isDragging && liveDragXZ?.current) {
      // 드래그 중: XZ는 마우스 위치, Y는 살짝 들어올림
      groupRef.current.position.x = liveDragXZ.current.x
      groupRef.current.position.y = normalY + 0.45
      groupRef.current.position.z = liveDragXZ.current.z
    } else {
      // 부드러운 부유 애니메이션
      const floatY = normalY + Math.sin(clock.elapsedTime * 0.8 + phaseOffset) * 0.07
      groupRef.current.position.x = normalX
      groupRef.current.position.y = floatY
      groupRef.current.position.z = normalZ
    }

    // 회전
    if (autoRotate) rotRef.current += delta * 1.2
    groupRef.current.rotation.y = rotRef.current
  })

  return (
    <group
      ref={groupRef}
      position={[normalX, normalY, normalZ]}
      scale={scale}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown?.() }}
      onPointerOver={() => {
        setHovered(true)
        document.body.style.cursor = isDragging ? 'grabbing' : 'grab'
      }}
      onPointerOut={() => {
        setHovered(false)
        if (!isDragging) document.body.style.cursor = 'auto'
      }}
    >
      <primitive object={clonedScene} />

      {/* 호버 오라 */}
      {hovered && !isDragging && (
        <mesh>
          <sphereGeometry args={[1.15, 8, 8]} />
          <meshStandardMaterial color="#00d4ff" transparent opacity={0.05} side={2} />
        </mesh>
      )}

      {/* 드래그 중 글로우 */}
      {isDragging && (
        <>
          <mesh>
            <sphereGeometry args={[1.3, 8, 8]} />
            <meshStandardMaterial color="#00d4ff" transparent opacity={0.09} side={2} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -(autoYLift + oy) + 0.02, 0]}>
            <ringGeometry args={[0.5, 0.72, 32]} />
            <meshStandardMaterial
              color="#00d4ff" emissive="#00aaff"
              emissiveIntensity={1.5} transparent opacity={0.65} toneMapped={false}
            />
          </mesh>
        </>
      )}

      {/* 선택 바닥 링 */}
      {isSelected && !isDragging && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -(autoYLift + oy) + 0.02, 0]}>
          <ringGeometry args={[0.5, 0.68, 32]} />
          <meshStandardMaterial
            color="#00d4ff" emissive="#00d4ff"
            emissiveIntensity={2.0} transparent opacity={0.8} toneMapped={false}
          />
        </mesh>
      )}

      {/* 호버 레이블 */}
      {label && hovered && !isDragging && (
        <Html center position={[0, 2.4, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,0,20,0.95)', border: '1px solid #00d4ff',
            borderRadius: '6px', padding: '3px 9px',
            color: '#80e8ff', fontSize: '11px', fontWeight: 600,
            whiteSpace: 'nowrap', boxShadow: '0 0 10px rgba(0,180,255,0.35)',
          }}>{label}</div>
        </Html>
      )}
    </group>
  )
}

// ── 공개 컴포넌트 ─────────────────────────────────────────────────────────────
export default function FigureModel({
  url, slotPosition = [0, 0, 0], scale = 1, label,
  positionOffset, figureRotationY = 0, autoRotate = false,
  isDragging = false, liveDragXZ = null, isSelected = false,
  onPointerDown, phaseOffset = 0,
}) {
  if (!url) return null
  return (
    <GLBMesh
      url={url} slotPosition={slotPosition} scale={scale} label={label}
      positionOffset={positionOffset} figureRotationY={figureRotationY}
      autoRotate={autoRotate} isDragging={isDragging} liveDragXZ={liveDragXZ}
      isSelected={isSelected} onPointerDown={onPointerDown} phaseOffset={phaseOffset}
    />
  )
}
