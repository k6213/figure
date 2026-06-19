/**
 * FurnitureLayer.jsx
 * Iterates placedItems from Zustand store and renders furniture into the R3F scene
 *
 * - showcase → ShowcaseItem (slot system)
 * - others   → FurnitureItem (default)
 * - Keyboard shortcuts (window level):
 *     R           → rotate selected furniture +90° on Y axis (interpolated animation)
 *     Delete / Backspace → delete selected furniture
 */
import { useEffect }        from 'react'
import { useRoomStore }     from '../../store/roomStore'
import FurnitureItem        from './FurnitureItem'
import ShowcaseItem         from './ShowcaseItem'
import { rotationTargetMap } from './furnitureRotationMap'

export default function FurnitureLayer({ cameraMode }) {
  const placedItems = useRoomStore(s => s.placedItems)

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ignore when an input is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) return

      const sid = useRoomStore.getState().selectedId
      if (!sid) return

      // R → rotate 90° on Y axis
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        const cur    = rotationTargetMap.get(sid) ?? 0
        const newRot = cur + Math.PI / 2
        rotationTargetMap.set(sid, newRot)

        // Sync target rotation value to store immediately
        const { placedItems: items, updateTransform } = useRoomStore.getState()
        const it = items.find(i => i.instanceId === sid)
        if (it) updateTransform(sid, it.position, [0, newRot, 0])
      }

      // Delete / Backspace → delete selected furniture
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        useRoomStore.getState().removeItem(sid)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <group name="furniture-layer">
      {placedItems.map(item =>
        item.type === 'showcase' ? (
          <ShowcaseItem key={item.instanceId} item={item} cameraMode={cameraMode} />
        ) : (
          <FurnitureItem key={item.instanceId} item={item} cameraMode={cameraMode} />
        )
      )}
    </group>
  )
}
