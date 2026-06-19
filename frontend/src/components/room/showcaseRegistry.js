/**
 * showcaseRegistry.js
 * Registry of Three.js group refs for display cabinets in the scene
 *
 * Used by SnapController when calculating slot world coordinates.
 * Managed as a module singleton because storing refs in Zustand would cause serialization issues.
 *
 * key: instanceId (string)
 * val: React ref { current: THREE.Group }
 */

/** @type {Map<string, React.RefObject<import('three').Group>>} */
export const showcaseRegistry = new Map()

export function registerShowcase(instanceId, ref) {
  showcaseRegistry.set(instanceId, ref)
}

export function unregisterShowcase(instanceId) {
  showcaseRegistry.delete(instanceId)
}
