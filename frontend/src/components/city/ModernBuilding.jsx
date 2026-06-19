/**
 * ModernBuilding.jsx
 *
 * Loads and renders "modern_building_concepts.glb" — a Sketchfab-exported
 * architectural concept model (256 nodes, 173 meshes, 9 materials).
 *
 * Model stats:
 *   Original  : 65.8 MB  (no compression)
 *   Compressed: ~4.0 MB  (Draco level-7, served from /public/models/)
 *
 * Root node has a built-in matrix: scale=0.5 + Z-up→Y-up rotation.
 * After that transform, world-space bounds are:
 *   Width  (X): ~211 units   →  at scale=0.2  → ~42m  (1 city block)
 *   Height (Y): ~77.5 units  →  at scale=0.2  → ~15m  (5-story)
 *   Depth  (Z): ~52 units    →  at scale=0.2  → ~10m
 *   Ground (Y_min): ~-41.3   →  at scale=0.2  → -8.3m (bottom of model)
 *
 * ⚠  To place it on the ground, set  position={[x, 8.3, z]}  with scale=0.2
 *    (the 8.3 offset lifts the model bottom to y=0).
 *
 * Materials in the model:
 *   build_mat     — main structural concrete / metal (OPAQUE)
 *   glaze2        — window glazing with clearcoat  (BLEND)
 *   floor         — internal / podium floor       (OPAQUE)
 *   tree          — on-site trees                 (OPAQUE)
 *   site_2        — ground / hardscape            (OPAQUE)
 *   glass_mullion — curtain-wall mullions          (OPAQUE)
 *   grass         — planted areas                 (OPAQUE)
 *   lights_1      — lit facade / signage panels   (OPAQUE)
 *   water         — reflective pond (UV-animated) (OPAQUE)
 *
 * Extensions used by the model:
 *   KHR_materials_clearcoat  — handled natively by Three.js GLTFLoader
 *   KHR_texture_transform    — handled natively by Three.js GLTFLoader
 *
 * Usage:
 *   <Suspense fallback={<BuildingFallback />}>
 *     <ModernBuilding position={[60, 8.3, -80]} scale={0.2} />
 *   </Suspense>
 */
import { useRef, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Path helpers ──────────────────────────────────────────────────────────────

/** Draco-compressed file served from /public/models/ */
const MODEL_URL = '/models/modern_building_concepts.draco.glb'

// Draco decoder: pass `true` to useGLTF to use Google's CDN decoder, or
// host /public/draco/ locally for offline/intranet environments.
const USE_DRACO = true

// ── Loading fallback (used in the parent's <Suspense>) ────────────────────────

export function BuildingFallback() {
  return (
    <mesh>
      <boxGeometry args={[6, 12, 6]} />
      <meshStandardMaterial color="#b8c8d8" wireframe />
    </mesh>
  )
}

// ── Water UV animation helper ─────────────────────────────────────────────────

function useWaterAnimation(scene) {
  const waterMeshRef = useRef(null)

  useEffect(() => {
    if (!scene) return
    scene.traverse((obj) => {
      if (obj.isMesh && obj.material?.name === 'water') {
        waterMeshRef.current = obj
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    const mesh = waterMeshRef.current
    if (!mesh?.material?.map) return
    // Slowly scroll the UV to simulate water flow
    mesh.material.map.offset.x += delta * 0.03
    mesh.material.map.offset.y += delta * 0.015
    mesh.material.needsUpdate = false // offset change is enough
  })
}

// ── Material enhancement ──────────────────────────────────────────────────────
// Boost clearcoat on glazing to make it pop in the daytime scene.

function enhanceMaterials(scene) {
  scene.traverse((obj) => {
    if (!obj.isMesh) return
    const mat = obj.material
    if (!mat) return

    switch (mat.name) {
      case 'glaze2':
        // Increase clearcoat so the glass reads as reflective glass
        mat.clearcoat         = 1.0
        mat.clearcoatRoughness = 0.05
        mat.roughness          = 0.05
        mat.metalness          = 0.0
        mat.transparent        = true
        mat.opacity            = 0.55
        break

      case 'glass_mullion':
        mat.clearcoat          = 0.8
        mat.clearcoatRoughness = 0.1
        mat.metalness          = 0.6
        mat.roughness          = 0.2
        break

      case 'lights_1':
        // Emissive so facade panels glow slightly in day/night
        mat.emissive     = new THREE.Color('#fffbe8')
        mat.emissiveIntensity = 0.4
        break

      case 'water':
        mat.roughness  = 0.05
        mat.metalness  = 0.3
        mat.envMapIntensity = 1.5
        break

      default:
        break
    }

    mat.needsUpdate = true
  })
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {[x,y,z]} props.position   World-space position (default [0,0,0])
 * @param {number|[x,y,z]} props.scale  Uniform scale or per-axis (default 0.05)
 * @param {[x,y,z]} props.rotation   Euler rotation in radians (default [0,0,0])
 * @param {boolean} props.castShadow    (default true)
 * @param {boolean} props.receiveShadow (default true)
 * @param {boolean} props.animateWater  Scroll water UV (default true)
 * @param {function} props.onClick  Click handler for the whole building group
 */
export default function ModernBuilding({
  position   = [0, 0, 0],
  scale      = 0.05,
  rotation   = [0, 0, 0],
  castShadow    = true,
  receiveShadow = true,
  animateWater  = true,
  onClick,
}) {
  const { scene } = useGLTF(MODEL_URL, USE_DRACO)

  // Clone once so multiple instances don't share the same scene graph
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true)

    // Apply shadow flags and material tweaks to every mesh
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow    = castShadow
        obj.receiveShadow = receiveShadow
        // Frustum culling is ON by default — keep it (big performance win)
      }
    })

    enhanceMaterials(clone)
    return clone
  }, [scene, castShadow, receiveShadow])

  // Animated water (only touches the real material on the clone)
  const waterMeshRef = useRef(null)
  useEffect(() => {
    if (!animateWater) return
    clonedScene.traverse((obj) => {
      if (obj.isMesh && obj.material?.name === 'water') {
        waterMeshRef.current = obj
      }
    })
  }, [clonedScene, animateWater])

  useFrame((_, delta) => {
    if (!animateWater) return
    const mesh = waterMeshRef.current
    if (!mesh?.material?.map) return
    mesh.material.map.offset.x += delta * 0.03
    mesh.material.map.offset.y += delta * 0.015
  })

  return (
    <group
      position={position}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
      rotation={rotation}
      onClick={onClick}
    >
      <primitive object={clonedScene} />
    </group>
  )
}

// Preload so the model starts downloading immediately (before the component
// mounts) — eliminates pop-in when the user first enters the scene.
useGLTF.preload(MODEL_URL, USE_DRACO)
