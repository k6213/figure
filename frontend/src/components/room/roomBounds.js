/**
 * roomBounds.js
 * Shared room boundary constants + rotation-aware clamping / wall-snap helpers.
 *
 * Room: ROOM_W=11 (half-width), ROOM_D=10 (half-depth), ROOM_H=7
 *   Left / Right walls : x = ±11
 *   Front wall         : z = +10
 *   Back (cabinet)     : effective z = -8.7 → keep z ≥ -8.0
 */

export const ROOM_X_MAX     = 10.975   // wall ±11, 0.025 thickness clearance
export const ROOM_Z_FMAX    =  9.975   // front wall +10, 0.025 clearance
export const ROOM_Z_BMIN    = -8.0     // clear of display cabinet glass
export const WALL_SNAP_DIST =  0.8     // snap activation radius (world units)

/**
 * Compute the axis-aligned half-extents of a box with given dims rotated by rotY.
 *
 * For a Y-axis rotation the AABB half-extents are:
 *   hx_eff = |cos(rotY)| * (w/2) + |sin(rotY)| * (d/2)
 *   hz_eff = |sin(rotY)| * (w/2) + |cos(rotY)| * (d/2)
 */
export function getRotatedHalfExtents(dims, rotY = 0) {
  const hw   = (dims.w ?? 1) / 2
  const hd   = (dims.d ?? dims.w ?? 1) / 2
  const cosR = Math.abs(Math.cos(rotY))
  const sinR = Math.abs(Math.sin(rotY))
  return {
    hw: cosR * hw + sinR * hd,
    hd: sinR * hw + cosR * hd,
  }
}

/** Clamp item center so its rotated AABB stays fully inside the room. */
export function clampToRoom(x, z, dims, rotY = 0) {
  const { hw, hd } = getRotatedHalfExtents(dims, rotY)
  return {
    x: Math.max(-ROOM_X_MAX + hw, Math.min(ROOM_X_MAX - hw, x)),
    z: Math.max(ROOM_Z_BMIN  + hd, Math.min(ROOM_Z_FMAX - hd, z)),
  }
}

/**
 * Snap item center to wall when its AABB edge is within WALL_SNAP_DIST.
 * Returns snapped { x, z, snapped }.
 */
export function applyWallSnap(x, z, dims, rotY = 0) {
  const { hw, hd } = getRotatedHalfExtents(dims, rotY)
  const rightTarget = ROOM_X_MAX - hw
  const leftTarget  = -ROOM_X_MAX + hw
  const frontTarget = ROOM_Z_FMAX - hd

  let sx = x, sz = z, snapped = false
  if      (Math.abs(x - rightTarget) < WALL_SNAP_DIST) { sx = rightTarget; snapped = true }
  else if (Math.abs(x - leftTarget)  < WALL_SNAP_DIST) { sx = leftTarget;  snapped = true }
  if      (Math.abs(z - frontTarget) < WALL_SNAP_DIST) { sz = frontTarget; snapped = true }
  return { x: sx, z: sz, snapped }
}
