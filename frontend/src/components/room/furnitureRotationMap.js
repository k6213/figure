/**
 * furnitureRotationMap.js
 * Registry of target Y rotation angles (radians) per furniture item
 *
 * Storing refs in Zustand causes serialization issues,
 * so this is separated into a module-level Map (same pattern as showcaseRegistry)
 *
 * Map<instanceId: string, targetRotationY: number>
 */
export const rotationTargetMap = new Map()
