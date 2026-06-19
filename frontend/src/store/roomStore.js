/**
 * roomStore.js
 * Virtual showroom layout state management (Zustand)
 *
 * - placedItems    : list of furniture placed in the room
 * - selectedId     : instanceId of currently selected furniture
 * - transformMode  : TransformControls mode
 * - snapTarget     : snap target slot calculated by SnapController
 * - figurePlacements: figure → display cabinet slot mapping
 */
import { create } from 'zustand'

let _counter = 0

// W=11, desk h=0.76 → group y=h so bottom touches floor
// bookshelf h=2.4 → group y=h/2 so centered box bottom touches floor
const INITIAL_PLACED_ITEMS = [
  {
    id: 'desk', instanceId: 'builtin-desk', name: 'Desk', icon: '🖥',
    type: 'desk', category: 'furniture', modelPath: null,
    dimensions: { w: 2.6, h: 0.76, d: 1.1 },
    position: [9.55, 0.76, 3.5],
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    id: 'bookshelf', instanceId: 'builtin-bookshelf', name: 'Bookshelf', icon: '📚',
    type: 'bookshelf', category: 'storage', modelPath: null,
    dimensions: { w: 1.8, h: 2.4, d: 0.4 },
    // Geometry face is -Z; rotate -PI/2 so face points +X (into room from left wall)
    // X half-extent at -PI/2 = d/2 = 0.2 → center at -10.975 + 0.2 = -10.775
    position: [-10.775, 1.2, -5.0],
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    id: 'poster', instanceId: 'builtin-poster-1', name: 'Green Poster', icon: '🖼️',
    type: 'poster', category: 'decoration', modelPath: null,
    dimensions: { w: 1.1, h: 0.75, d: 0.025 },
    position: [-10.98, 1.5, 4.5],
    rotation: [0, Math.PI / 2, 0],
    color: '#1a3a1a', accentColor: '#44aa44',
  },
  {
    id: 'poster', instanceId: 'builtin-poster-2', name: 'Blue Poster', icon: '🖼️',
    type: 'poster', category: 'decoration', modelPath: null,
    dimensions: { w: 0.9, h: 1.2, d: 0.025 },
    position: [-10.98, 4.2, -6.0],
    rotation: [0, Math.PI / 2, 0],
    color: '#1a2a4a', accentColor: '#4488cc',
  },
  {
    id: 'poster', instanceId: 'builtin-poster-3', name: 'Purple Poster', icon: '🖼️',
    type: 'poster', category: 'decoration', modelPath: null,
    dimensions: { w: 1.0, h: 1.4, d: 0.025 },
    position: [10.98, 3.6, -1.5],
    rotation: [0, -Math.PI / 2, 0],
    color: '#2a1a3a', accentColor: '#8844cc',
  },
  {
    id: 'poster', instanceId: 'builtin-poster-4', name: 'Red Poster', icon: '🖼️',
    type: 'poster', category: 'decoration', modelPath: null,
    dimensions: { w: 0.9, h: 0.7, d: 0.025 },
    position: [10.98, 1.5, 6.0],
    rotation: [0, -Math.PI / 2, 0],
    color: '#2a1a1a', accentColor: '#cc4444',
  },
]

export const useRoomStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  placedItems: INITIAL_PLACED_ITEMS.map(i => ({ ...i, position: [...i.position], rotation: [...i.rotation] })),
  selectedId:        null, // instanceId | null
  transformMode:     'translate', // 'translate' | 'rotate'
  isOrbitBlocked:    false,  // OrbitControls disabled while TransformControls is active

  // Snap system
  snapTarget: null,   // { showcaseInstanceId, slotId, worldPos:[x,y,z] } | null

  // figure → display cabinet slot placement tracking
  figurePlacements: {},   // { [figureId]: { showcaseInstanceId, slotId } }

  // ── Add / remove furniture ──────────────────────────────────────────────────────
  addItem(catalogItem) {
    const instanceId = `${catalogItem.id}__${++_counter}`
    const item = {
      ...catalogItem,
      instanceId,
      position: [0, 0, 3],   // default position near front of room
      rotation: [0, 0, 0],
      // only showcase type has slots
      slots: catalogItem.defaultSlots
        ? catalogItem.defaultSlots.map(s => ({ ...s }))
        : undefined,
    }
    set(s => ({ placedItems: [...s.placedItems, item], selectedId: instanceId }))
    return instanceId
  },

  removeItem(instanceId) {
    set(s => ({
      placedItems: s.placedItems.filter(i => i.instanceId !== instanceId),
      selectedId:  s.selectedId === instanceId ? null : s.selectedId,
    }))
  },

  clearAll() {
    set({ placedItems: [], selectedId: null, figurePlacements: {} })
  },

  // ── Select / TransformControls ──────────────────────────────────────────────
  select(instanceId) {
    set({ selectedId: instanceId })
  },

  deselect() {
    set({ selectedId: null })
  },

  setTransformMode(mode) {
    set({ transformMode: mode })
  },

  setOrbitBlocked(v) {
    set({ isOrbitBlocked: v })
  },

  // ── Sync position/rotation ──────────────────────────────────────────────────────
  updateTransform(instanceId, position, rotation) {
    set(s => ({
      placedItems: s.placedItems.map(item =>
        item.instanceId === instanceId
          ? { ...item, position: [...position], rotation: [...rotation] }
          : item
      ),
    }))
  },

  // ── Occupy / vacate display cabinet slot ──────────────────────────────────────────────
  occupySlot(showcaseInstanceId, slotId, figureId) {
    set(s => ({
      placedItems: s.placedItems.map(item => {
        if (item.instanceId !== showcaseInstanceId || !item.slots) return item
        return {
          ...item,
          slots: item.slots.map(slot =>
            slot.id === slotId
              ? { ...slot, isOccupied: true, occupiedBy: figureId }
              : slot
          ),
        }
      }),
      figurePlacements: {
        ...s.figurePlacements,
        [figureId]: { showcaseInstanceId, slotId },
      },
    }))
  },

  vacateSlot(showcaseInstanceId, slotId) {
    set(s => {
      // Find which figure is occupying this slot
      const showcase = s.placedItems.find(i => i.instanceId === showcaseInstanceId)
      const slot = showcase?.slots?.find(sl => sl.id === slotId)
      const figureId = slot?.occupiedBy

      // Remove from figurePlacements
      const newPlacements = { ...s.figurePlacements }
      if (figureId) delete newPlacements[figureId]

      return {
        placedItems: s.placedItems.map(item => {
          if (item.instanceId !== showcaseInstanceId || !item.slots) return item
          return {
            ...item,
            slots: item.slots.map(sl =>
              sl.id === slotId
                ? { ...sl, isOccupied: false, occupiedBy: null }
                : sl
            ),
          }
        }),
        figurePlacements: newPlacements,
      }
    })
  },

  // Query which slot a figure is in (use getState() externally)
  getFigurePlacement(figureId) {
    return get().figurePlacements[figureId] ?? null
  },

  // ── Snap target ─────────────────────────────────────────────────────────────
  setSnapTarget(target) {
    set({ snapTarget: target })
  },

  clearSnapTarget() {
    set({ snapTarget: null })
  },
}))
