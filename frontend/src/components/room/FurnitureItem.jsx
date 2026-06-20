/**
 * FurnitureItem.jsx
 * Base R3F component for placed furniture
 *
 * Features:
 *  - Click to select / deselect
 *  - Mouse drag in overview mode → free movement on Y=0 plane
 *  - AABB collision check to prevent furniture overlap + room boundary clamping
 *  - Floor glow ring for selected state visualization
 *  - Y rotation interpolation animation via rotationTargetMap
 *  - Exposes internal group ref via forwardRef (used by ShowcaseItem)
 */
import { forwardRef, useRef, useEffect, useState } from 'react'
import { useFrame, useThree }            from '@react-three/fiber'
import * as THREE                        from 'three'

import FurnitureGeometry     from './FurnitureGeometry'
import { useRoomStore }      from '../../store/roomStore'
import { rotationTargetMap } from './furnitureRotationMap'
import {
  WALL_SNAP_DIST,
  clampToRoom,
  applyWallSnap,
} from './roomBounds'

// ── Reusable objects (prevent GC) ─────────────────────────────────────────────────
const _floor   = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _hitPt   = new THREE.Vector3()
const _lerpVec = new THREE.Vector3()


// ── AABB collision check (XZ footprint) ────────────────────────────────────────────
function hasCollision(nx, nz, selfId, dims, items) {
  const hw = (dims.w ?? 1) / 2 + 0.05
  const hd = (dims.d ?? dims.w ?? 1) / 2 + 0.05
  for (const other of items) {
    if (other.instanceId === selfId) continue
    const od  = other.dimensions
    const ohw = (od.w ?? 1) / 2 + 0.05
    const ohd = (od.d ?? od.w ?? 1) / 2 + 0.05
    const [ox,, oz] = other.position
    if (Math.abs(nx - ox) < hw + ohw && Math.abs(nz - oz) < hd + ohd) return true
  }
  return false
}

// ── Floor glow ring when selected (turns amber when snapped to wall) ──────────────────
function SelectionRing({ dims, wallSnapped = false }) {
  const r0 = Math.max(dims.w ?? 1, dims.d ?? dims.w ?? 1) / 2 + 0.05
  const color = wallSnapped ? '#ffaa00' : '#00d4ff'
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
      <ringGeometry args={[r0, r0 + 0.18, 48]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={3.5}
        transparent
        opacity={0.72}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Lighting sub-component ─────────────────────────────────────────────────────────
function LampLight({ lightProps, dimensions }) {
  const { color, intensity, distance, decay = 2, lightType, angle } = lightProps
  const yOff = dimensions.h * 0.88
  if (lightType === 'spot') {
    return (
      <spotLight
        position={[0, yOff, 0]}
        color={color} intensity={intensity} distance={distance}
        angle={angle ?? Math.PI / 5} penumbra={0.3} decay={decay} castShadow
        shadow-mapSize-width={512} shadow-mapSize-height={512}
      />
    )
  }
  return (
    <pointLight
      position={[0, yOff, 0]}
      color={color} intensity={intensity} distance={distance} decay={decay} castShadow
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
const FurnitureItem = forwardRef(function FurnitureItem(
  { item, cameraMode, children },
  forwardedRef,
) {
  const internalRef = useRef()
  const groupRef    = forwardedRef ?? internalRef

  const isDragging      = useRef(false)
  const dragOffset      = useRef({ x: 0, z: 0 })
  const wallSnappedRef  = useRef(false)
  const [isWallSnapped, setIsWallSnapped] = useState(false)

  const { gl } = useThree()

  const {
    selectedId, select,
    setOrbitBlocked, updateTransform,
  } = useRoomStore()

  const isSelected = selectedId === item.instanceId

  // ── Mount: set initial position/rotation, register in rotation registry ─────────────────────
  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(...item.position)
    groupRef.current.rotation.set(...item.rotation)
    rotationTargetMap.set(item.instanceId, item.rotation[1])
    return () => rotationTargetMap.delete(item.instanceId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── canvas pointerup → end drag ───────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement
    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setOrbitBlocked(false)
      if (wallSnappedRef.current) { wallSnappedRef.current = false; setIsWallSnapped(false) }
      if (groupRef.current) {
        const p = groupRef.current.position
        const r = groupRef.current.rotation
        updateTransform(item.instanceId, [p.x, p.y, p.z], [r.x, r.y, r.z])
      }
    }
    canvas.addEventListener('pointerup', onUp)
    return () => canvas.removeEventListener('pointerup', onUp)
  }, [gl, item.instanceId, setOrbitBlocked, updateTransform])

  // ── Frame loop ───────────────────────────────────────────────────────────
  useFrame(({ raycaster, pointer, camera }) => {
    if (!groupRef.current) return

    // [1] 드래그 이동
    if (isDragging.current) {
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(_floor, _hitPt)) {
        const nx   = _hitPt.x - dragOffset.current.x
        const nz   = _hitPt.z - dragOffset.current.z
        const rotY = groupRef.current.rotation.y
        const { x: cx, z: cz } = clampToRoom(nx, nz, item.dimensions, rotY)
        const { x: sx, z: sz, snapped } = applyWallSnap(cx, cz, item.dimensions, rotY)

        // Update snap indicator only on state change (avoids re-render every frame)
        if (snapped !== wallSnappedRef.current) {
          wallSnappedRef.current = snapped
          setIsWallSnapped(snapped)
        }

        const { placedItems } = useRoomStore.getState()
        if (!hasCollision(sx, sz, item.instanceId, item.dimensions, placedItems)) {
          groupRef.current.position.x = sx
          groupRef.current.position.z = sz
        }
      }
    } else {
      // Not dragging: smoothly lerp to store position
      _lerpVec.set(...item.position)
      groupRef.current.position.lerp(_lerpVec, 0.22)
    }

    // [2] Y rotation interpolation
    const tgt = rotationTargetMap.get(item.instanceId)
    if (tgt !== undefined) {
      const cur  = groupRef.current.rotation.y
      const diff = tgt - cur
      if (Math.abs(diff) > 0.0008) {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(cur, tgt, 0.16)
      } else if (diff !== 0) {
        groupRef.current.rotation.y = tgt
      }
    }
  })

  // ── pointerDown: select + start drag (drag only in overview mode) ────────────────
  const handlePointerDown = (e) => {
    e.stopPropagation()
    select(item.instanceId)

    if (cameraMode !== 'overview') return
    // e.ray: raycaster ray included in R3F ThreeEvent (at the time of the event)
    const hitPoint = new THREE.Vector3()
    if (e.ray && e.ray.intersectPlane(_floor, hitPoint)) {
      dragOffset.current = {
        x: hitPoint.x - (groupRef.current?.position.x ?? 0),
        z: hitPoint.z - (groupRef.current?.position.z ?? 0),
      }
      isDragging.current = true
      setOrbitBlocked(true)
    }
  }

  const handlePointerOver = (e) => {
    e.stopPropagation()
    document.body.style.cursor = isDragging.current ? 'grabbing' : 'pointer'
  }

  const handlePointerOut = (e) => {
    e.stopPropagation()
    if (!isDragging.current) document.body.style.cursor = 'auto'
  }

  return (
    <group ref={groupRef}>
      {/* Event receiver group */}
      <group
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {children ?? <FurnitureGeometry item={item} isSelected={isSelected} />}

        {/* Embedded light */}
        {(item.type === 'lamp' || item.type === 'spotlight') && item.lightProps && (
          <LampLight lightProps={item.lightProps} dimensions={item.dimensions} />
        )}
      </group>

      {/* Selection glow ring — amber when snapping to a wall */}
      {isSelected && <SelectionRing dims={item.dimensions} wallSnapped={isWallSnapped} />}
    </group>
  )
})

export default FurnitureItem
