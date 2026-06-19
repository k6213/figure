/**
 * ShowcaseItem.jsx
 * Slot-based glass display cabinet component
 *
 * - Extends FurnitureItem (forwardRef)
 * - Slot visualization: shows semi-transparent ring on empty slots
 * - Registers group ref in showcaseRegistry → SnapController calculates world coordinates
 * - Highlights nearby slots while dragging a figure
 */
import { useRef, useEffect } from 'react'
import { useFrame }         from '@react-three/fiber'
import * as THREE           from 'three'

import FurnitureItem       from './FurnitureItem'
import FurnitureGeometry   from './FurnitureGeometry'
import { useRoomStore }    from '../../store/roomStore'
import { registerShowcase, unregisterShowcase } from './showcaseRegistry'

const _sv = new THREE.Vector3()

// ── Slot indicator ──────────────────────────────────────────────────────────────
function SlotIndicator({ slot, isSnapTarget, snapTarget }) {
  const meshRef = useRef()
  const isSnap = snapTarget?.slotId === slot.id

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    if (isSnap) {
      meshRef.current.material.opacity =
        0.65 + Math.sin(clock.elapsedTime * 5) * 0.25
    }
  })

  if (slot.isOccupied) return null

  return (
    <mesh
      ref={meshRef}
      position={slot.localPos}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.18, 0.24, 28]} />
      <meshStandardMaterial
        color={isSnap ? '#00ffaa' : '#44aaff'}
        emissive={isSnap ? '#00ffaa' : '#2266ff'}
        emissiveIntensity={isSnap ? 3.0 : 0.6}
        transparent
        opacity={isSnap ? 0.85 : 0.35}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ShowcaseItem({ item, cameraMode }) {
  const groupRef = useRef()

  const { snapTarget } = useRoomStore()
  const isMySlot = snapTarget?.showcaseInstanceId === item.instanceId

  // Register in showcaseRegistry
  useEffect(() => {
    if (groupRef.current) {
      registerShowcase(item.instanceId, groupRef)
    }
    return () => unregisterShowcase(item.instanceId)
  }, [item.instanceId])

  return (
    <FurnitureItem ref={groupRef} item={item} cameraMode={cameraMode}>
      {/* Display cabinet geometry */}
      <FurnitureGeometry item={item} isSelected={false} />

      {/* Slot indicators (local space → move with display cabinet) */}
      {item.slots?.map(slot => (
        <SlotIndicator
          key={slot.id}
          slot={slot}
          snapTarget={isMySlot ? snapTarget : null}
        />
      ))}
    </FurnitureItem>
  )
}
