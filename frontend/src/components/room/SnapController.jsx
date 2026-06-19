/**
 * SnapController.jsx
 * Calculates snap to nearest display cabinet slot while dragging a figure
 *
 * Behavior:
 *  1. When draggingId exists, reads liveDragXZ.current to get current drag XZ position
 *  2. Calculates slot world coordinates from all display cabinet group refs in showcaseRegistry
 *  3. If the nearest empty slot is within SNAP_RADIUS, records it in snapTargetRef & roomStore
 *  4. Moves the snap indicator mesh to that position (direct manipulation without React state)
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { showcaseRegistry }    from './showcaseRegistry'
import { useRoomStore }        from '../../store/roomStore'

const SNAP_RADIUS = 1.6   // snap activates within this distance
const _sv = new THREE.Vector3()

export default function SnapController({ liveDragXZ, draggingId, snapTargetRef }) {
  const indicatorRef = useRef()
  const { setSnapTarget, clearSnapTarget } = useRoomStore()

  useFrame(() => {
    if (!draggingId || !liveDragXZ?.current) {
      if (indicatorRef.current) indicatorRef.current.visible = false
      snapTargetRef.current = null
      clearSnapTarget()
      return
    }

    const dragX = liveDragXZ.current.x
    const dragZ = liveDragXZ.current.z

    // Calculate for all slots of all placed display cabinets
    const { placedItems } = useRoomStore.getState()
    let bestDist = SNAP_RADIUS
    let best = null

    for (const item of placedItems) {
      if (item.type !== 'showcase' || !item.slots) continue
      const groupRef = showcaseRegistry.get(item.instanceId)
      if (!groupRef?.current) continue

      for (const slot of item.slots) {
        if (slot.isOccupied) continue

        // Slot local → world coordinate transform
        _sv.set(...slot.localPos)
        groupRef.current.localToWorld(_sv)

        const dx = _sv.x - dragX
        const dz = _sv.z - dragZ
        const dist = Math.sqrt(dx * dx + dz * dz)

        if (dist < bestDist) {
          bestDist = dist
          best = {
            showcaseInstanceId: item.instanceId,
            slotId:   slot.id,
            worldPos: [_sv.x, _sv.y, _sv.z],
          }
        }
      }
    }

    // Update snap target (ref + store)
    snapTargetRef.current = best
    if (best) {
      setSnapTarget(best)
      // Move indicator mesh
      if (indicatorRef.current) {
        indicatorRef.current.visible = true
        indicatorRef.current.position.set(...best.worldPos)
      }
    } else {
      clearSnapTarget()
      if (indicatorRef.current) indicatorRef.current.visible = false
    }
  })

  // Snap indicator ring (initially invisible)
  return (
    <mesh ref={indicatorRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.28, 0.42, 32]} />
      <meshStandardMaterial
        color="#00ffaa"
        emissive="#00ffaa"
        emissiveIntensity={3.5}
        transparent
        opacity={0.75}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}
