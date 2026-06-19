/**
 * cityStore.js — Virtual city global state (Zustand + localStorage persistence)
 *
 * Assigns a random grid position for the figure room on first visit,
 * stored in localStorage so the same position is maintained on subsequent visits.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Grid settings (must stay in sync with ProceduralCityGrid.jsx) ─────────────────────
export const GRID_COLS = 10        // number of cells in X direction
export const GRID_ROWS = 10        // number of cells in Z direction
export const CELL_SIZE = 50        // 1 cell = 50 world units (≈50m)
export const CITY_HALF = (GRID_COLS * CELL_SIZE) / 2  // 250

/** Grid coordinates (gx, gz) → world XZ center position */
export function cellToWorld(gx, gz) {
  return {
    x: (gx - GRID_COLS / 2 + 0.5) * CELL_SIZE,
    z: (gz - GRID_ROWS / 2 + 0.5) * CELL_SIZE,
  }
}

export const useCityStore = create(
  persist(
    (set, get) => ({
      /** User figure room grid position (randomly assigned on first visit, persisted) */
      roomCell: null,   // { gx: number, gz: number } | null

      /** Assign — random position if not yet set, no-op if already set */
      assignRoom() {
        if (get().roomCell) return
        set({
          roomCell: {
            gx: Math.floor(Math.random() * GRID_COLS),
            gz: Math.floor(Math.random() * GRID_ROWS),
          },
        })
      },

      /** Dev only: reset room position (new position assigned on next assignRoom() call) */
      resetRoom() { set({ roomCell: null }) },
    }),
    { name: 'heroFig-city-v1' },
  ),
)
