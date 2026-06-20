/**
 * CityScene.jsx  →  UrbanScene
 * Virtual city room R3F scene + character controller + 3 camera modes
 *
 * Camera modes:
 *  - 'overview'  : free orbit camera (click figure → zoom in)
 *  - 'third'     : third-person camera following behind character
 *  - 'first'     : first-person camera at character eye level
 *
 * Character controls (third-person / first-person mode):
 *  - W / ↑   : forward
 *  - S / ↓   : backward
 *  - A / ←   : turn left
 *  - D / →   : turn right
 *  - V       : cycle camera mode (handled in CityPage)
 */
import {
  Suspense, useState, useRef, useEffect, useCallback, useMemo,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls, ContactShadows, Html, PerformanceMonitor, useGLTF, useAnimations,
} from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import RoomFloor        from './CityFloor'
import RoomLights       from './CityLights'
import StudentRoom      from './CityBuilding'
import FigureModel      from './FigureModel'
import FurnitureLayer   from '../room/FurnitureLayer'
import SnapController   from '../room/SnapController'
import { useRoomStore }  from '../../store/roomStore'
import { useChatStore }  from '../../store/chatStore'
import { useThemeStore } from '../../store/themeStore'

// ── Room size constants (22×20, height 5.5) ──────────────────────────────────────────
const ROOM_W       = 10.2  // character movement X limit  (wall: ±11)
const ROOM_D_FRONT = 8.8   // Z max — crossing this exits to city (front: +10)
const ROOM_D_BACK  = -8.4  // Z min — in front of showcase glass (glass: -8.7)

// ── Figure drag coordinate clamp limits ────────────────────────────────────────────
const DRAG_X_MAX =  10.5   // 0.5 inside wall ±11
const DRAG_Z_MAX =   9.0   // entrance direction (front 10 reference)
const DRAG_Z_MIN =  -9.4   // allow up to back shelf slots (slot Z = -9.1)

// ── Figure slots (3 tiers × 4 columns = 12 — showcase shelf layout) ────────────────────────
// Synced with SHELF_HEIGHTS = [0.08, 2.35, 4.62]
export const PLAZA_SLOTS = [
  // Tier 1 (bottom shelf Y=0.08)
  { position: [-7.5, 0.08, -9.1], scale: 0.9, label: 'Slot 1'  },
  { position: [-2.5, 0.08, -9.1], scale: 0.9, label: 'Slot 2'  },
  { position: [ 2.5, 0.08, -9.1], scale: 0.9, label: 'Slot 3'  },
  { position: [ 7.5, 0.08, -9.1], scale: 0.9, label: 'Slot 4'  },
  // Tier 2 (middle shelf Y=2.35)
  { position: [-7.5, 2.35, -9.1], scale: 0.9, label: 'Slot 5'  },
  { position: [-2.5, 2.35, -9.1], scale: 0.9, label: 'Slot 6'  },
  { position: [ 2.5, 2.35, -9.1], scale: 0.9, label: 'Slot 7'  },
  { position: [ 7.5, 2.35, -9.1], scale: 0.9, label: 'Slot 8'  },
  // Tier 3 (top shelf Y=4.62)
  { position: [-7.5, 4.62, -9.1], scale: 0.9, label: 'Slot 9'  },
  { position: [-2.5, 4.62, -9.1], scale: 0.9, label: 'Slot 10' },
  { position: [ 2.5, 4.62, -9.1], scale: 0.9, label: 'Slot 11' },
  { position: [ 7.5, 4.62, -9.1], scale: 0.9, label: 'Slot 12' },
]

// Walking.glb: Mixamo character ~181 cm → scale 0.01 ≈ 1.81 scene units tall
const PLAYER_SCALE = 0.01

// ── Player character — Walking.glb (Mixamo rig) + useAnimations ───────────────
function PlayerCharacter({ charPos, charBodyFacing, walkTimeRef, isWalkingRef, cameraMode }) {
  const posRef   = useRef()   // outer group — world position only
  const groupRef = useRef()   // inner group — animation root + rotation

  const { scene, animations } = useGLTF('/models/walking.glb')
  const { actions, mixer }    = useAnimations(animations, groupRef)

  // Scale + center once (guard against double-apply on re-mount)
  useEffect(() => {
    if (Math.abs(scene.scale.x - PLAYER_SCALE) > 0.0001) {
      const box = new THREE.Box3().setFromObject(scene)
      const cx  = (box.min.x + box.max.x) / 2
      const cz  = (box.min.z + box.max.z) / 2
      scene.scale.setScalar(PLAYER_SCALE)
      scene.position.set(
        -cx        * PLAYER_SCALE,
        -box.min.y * PLAYER_SCALE,
        -cz        * PLAYER_SCALE,
      )
    }
    scene.traverse(n => {
      if (n.isMesh) { n.castShadow = true; n.frustumCulled = false }
    })
  }, [scene])

  useEffect(() => {
    const clip = animations.find(a => a.name === 'mixamo.com')
    if (!clip) return

    clip.tracks.forEach(track => {
      // 1) Remove root motion: zero out Hips XZ translation so animation plays in-place
      if (/hips/i.test(track.name) && track.name.endsWith('.position')) {
        for (let i = 0; i < track.values.length; i += 3) {
          track.values[i]     = 0   // X
          track.values[i + 2] = 0   // Z  (keep Y for body bob)
        }
      }

      // 2) Fix loop seam: append frame-0 values one frame after the last keyframe
      const FRAME = 1 / 30
      const patchedTime = clip.duration + FRAME
      if (track.times[track.times.length - 1] < patchedTime - 0.001) {
        const stride = track.values.length / track.times.length
        const t2 = new Float32Array(track.times.length + 1)
        t2.set(track.times); t2[track.times.length] = patchedTime
        const v2 = new Float32Array(track.values.length + stride)
        v2.set(track.values); v2.set(track.values.slice(0, stride), track.values.length)
        track.times = t2; track.values = v2
      }
    })
    clip.duration = clip.duration + 1 / 30
  }, [animations])

  useEffect(() => {
    const action = actions['mixamo.com']
    if (!action) return
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.clampWhenFinished = false
    action.reset().play()
    action.timeScale = 0
  }, [actions])

  const latestBubble = useChatStore(s => s.latestBubble)
  const showBubble   = !!latestBubble && cameraMode !== 'first'

  useFrame((_, delta) => {
    if (!posRef.current || !groupRef.current) return

    // Outer group: world position only
    posRef.current.position.set(charPos.current.x, charPos.current.y, charPos.current.z)
    // Inner group: rotation only (separate from position to guarantee it takes effect)
    groupRef.current.rotation.y = charBodyFacing.current

    const action = actions['mixamo.com']
    if (action) {
      action.setEffectiveWeight(1)
      if (isWalkingRef.current) {
        // Snap to full speed immediately so animation matches movement speed
        action.timeScale = 1
      } else {
        // Slow fade-out when stopping so the freeze doesn't look abrupt
        action.timeScale += (0 - action.timeScale) * Math.min(1, 6 * delta)
        if (action.timeScale < 0.01) action.timeScale = 0
      }
    }
  })

  if (cameraMode === 'first') return null

  return (
    <group ref={posRef}>
      <group ref={groupRef}>
      <primitive object={scene} />

      {/* Floor shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.32, 20]} />
        <meshStandardMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Name label (overview only) */}
      {cameraMode === 'overview' && !showBubble && (
        <Html center position={[0, 1.95, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,0,20,0.88)', border: '1px solid #00d4ff',
            borderRadius: '6px', padding: '2px 8px', color: '#00d4ff',
            fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
            letterSpacing: '0.1em', boxShadow: '0 0 8px rgba(0,212,255,0.4)',
          }}>PLAYER</div>
        </Html>
      )}

      {/* Chat bubble */}
      {showBubble && (
        <Html center position={[0, 2.05, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            position: 'relative', display: 'flex', flexDirection: 'row',
            alignItems: 'center', gap: '5px',
            background: 'rgba(6,6,22,0.92)',
            border: latestBubble.isMine
              ? '1px solid rgba(0,212,255,0.55)' : '1px solid rgba(255,255,255,0.18)',
            borderRadius: '20px', padding: '5px 12px', color: '#e4e4e7',
            fontSize: '11px', maxWidth: '260px', whiteSpace: 'nowrap',
            lineHeight: '1.4', backdropFilter: 'blur(10px)',
            boxShadow: latestBubble.isMine
              ? '0 0 14px rgba(0,212,255,0.22)' : '0 2px 10px rgba(0,0,0,0.5)',
            animation: 'chatBubbleFadeIn 0.18s ease',
          }}>
            <span style={{ fontSize: '9px', fontWeight: 700, flexShrink: 0,
              color: latestBubble.isMine ? 'rgba(0,212,255,0.9)' : '#22d3ee' }}>
              {latestBubble.isMine ? 'Me' : latestBubble.nickname}
            </span>
            <span style={{ width: '1px', height: '10px',
              background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {latestBubble.text.length > 24
                ? latestBubble.text.slice(0, 24) + '…' : latestBubble.text}
            </span>
            <div style={{
              position: 'absolute', bottom: '-7px', left: '50%',
              transform: 'translateX(-50%)', width: 0, height: 0,
              borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
              borderTop: latestBubble.isMine
                ? '7px solid rgba(0,212,255,0.55)' : '7px solid rgba(255,255,255,0.18)',
            }} />
          </div>
          <style>{`
            @keyframes chatBubbleFadeIn {
              from { opacity:0; transform:translateY(-4px) scale(0.96) }
              to   { opacity:1; transform:translateY(0)    scale(1)    }
            }
          `}</style>
        </Html>
      )}
      </group>
    </group>
  )
}
useGLTF.preload('/models/walking.glb')

// ── Mouse look (pointer lock) — first-person: yaw + pitch / third-person: yaw only ──
function MouseLook({ mode, charRot, charBodyFacing, pitchRef }) {
  const { gl } = useThree()
  const active = mode === 'first' || mode === 'third'

  useEffect(() => {
    const canvas = gl.domElement
    if (!active) {
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      return
    }

    const onClick = () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock()
    }

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return
      const sens = 0.0022
      charRot.current -= e.movementX * sens
      if (mode === 'first') {
        pitchRef.current = Math.max(
          -Math.PI * 0.42,
          Math.min(Math.PI * 0.42, pitchRef.current - e.movementY * sens),
        )
      }
    }

    canvas.addEventListener('click', onClick)
    document.addEventListener('mousemove', onMouseMove)

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('mousemove', onMouseMove)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
  }, [active, mode, gl])

  return null
}

// ── Camera controller (third-person / first-person) ──────────────────────────────────────────
function CameraController({ mode, charPos, charRot, controlsRef, focusTarget, pitchRef }) {
  const { camera } = useThree()
  const smoothPos  = useRef(new THREE.Vector3(0, 5, 14))
  const smoothTgt  = useRef(new THREE.Vector3(0, 1.5, 0))

  // overview mode focus target (only used when a figure is selected)
  const ovDesiredPos  = useRef(new THREE.Vector3(0, 14, 22))
  const ovDesiredTgt  = useRef(new THREE.Vector3(0, 2.5, -5))
  const lerpingRef    = useRef(false)

  // When entering overview mode from walk mode, snap to a good vantage point once
  const prevMode = useRef(mode)
  useEffect(() => {
    if (mode === 'overview' && prevMode.current !== 'overview') {
      if (camera.position.y < 4) {
        camera.position.set(0, 14, 22)
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 2.5, -5)
          controlsRef.current.update()
        }
      }
    }
    prevMode.current = mode
  }, [mode])

  // When focusTarget changes: start lerp to that figure; clear when no selection
  useEffect(() => {
    if (mode !== 'overview') { lerpingRef.current = false; return }
    if (focusTarget) {
      const [fx, fy = 0, fz] = focusTarget
      ovDesiredPos.current.set(fx * 0.4, fy + 4.5, fz + 8.5)
      ovDesiredTgt.current.set(fx * 0.4, fy + 1.0, fz)
      lerpingRef.current = true
    } else {
      lerpingRef.current = false
    }
  }, [mode, focusTarget])

  // Stop lerp when user rotates OrbitControls (so mouse takes over immediately)
  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const onStart = () => { lerpingRef.current = false }
    ctrl.addEventListener('start', onStart)
    return () => ctrl.removeEventListener('start', onStart)
  }, [])

  useFrame(() => {
    const pos = charPos.current
    const rot = charRot.current

    if (mode === 'overview') {
      if (!controlsRef.current) return
      if (lerpingRef.current) {
        camera.position.lerp(ovDesiredPos.current, 0.055)
        controlsRef.current.target.lerp(ovDesiredTgt.current, 0.055)
        controlsRef.current.update()
        if (camera.position.distanceTo(ovDesiredPos.current) < 0.08) {
          lerpingRef.current = false
        }
      }
      // No lerp when idle — OrbitControls handles camera freely
      return

    } else if (mode === 'third') {
      const dist = 5.5, h = 3.0
      const cx = pos.x - Math.sin(rot) * dist
      const cz = pos.z - Math.cos(rot) * dist
      smoothPos.current.set(cx, h, cz)
      camera.position.lerp(smoothPos.current, 0.1)
      smoothTgt.current.set(pos.x, pos.y + 1.1, pos.z)
      camera.lookAt(smoothTgt.current)

    } else if (mode === 'first') {
      const pitch = pitchRef?.current ?? 0
      camera.position.set(pos.x, pos.y + 1.72, pos.z)
      const dx = Math.sin(rot) * Math.cos(pitch)
      const dy = Math.sin(pitch)
      const dz = Math.cos(rot) * Math.cos(pitch)
      camera.lookAt(pos.x + dx * 10, pos.y + 1.72 + dy * 10, pos.z + dz * 10)
    }
  })
  return null
}

// ── Drag plane (reflects shelf Y height) ─────────────────────────────────────────
function DragPlane({ active, liveDragXZ, startXZ, dragMovedRef, planeYRef }) {
  const { camera, raycaster, pointer } = useThree()
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))

  useFrame(() => {
    if (!active) return
    // Update plane to match current dragged figure's shelf Y height
    planeRef.current.constant = -(planeYRef?.current ?? 0)
    raycaster.setFromCamera(pointer, camera)
    const pt = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(planeRef.current, pt)) {
      // Clamp XZ coordinates to keep object inside room
      const cx = Math.max(-DRAG_X_MAX, Math.min(DRAG_X_MAX, pt.x))
      const cz = Math.max( DRAG_Z_MIN, Math.min(DRAG_Z_MAX,  pt.z))
      liveDragXZ.current = { x: cx, z: cz }
      if (startXZ.current) {
        const dx = cx - startXZ.current.x
        const dz = cz - startXZ.current.z
        if (Math.sqrt(dx * dx + dz * dz) > 0.3) dragMovedRef.current = true
      }
    }
  })
  return null
}

// ── Figure display ──────────────────────────────────────────────────────────
function FigureDisplay({
  figures = [],
  onStartDrag,
  figureOffsets = {},
  figureSettings = {},
  draggingId,
  liveDragXZ,
  selectedFigureId,
}) {
  return (
    <group>
      {PLAZA_SLOTS.map((slot, i) => {
        const fig      = figures[i]
        const url      = fig?.assets?.model ?? null
        const figId    = fig?.id ?? fig?.generation_id ?? `slot-${i}`
        const offset   = figureOffsets[figId]  ?? { x: 0, y: 0, z: 0 }
        const settings = figureSettings[figId] ?? { rotationY: 0, autoRotate: false }

        return (
          <FigureModel
            key={i}
            url={url}
            slotPosition={slot.position}
            scale={slot.scale}
            label={fig ? (fig.prompt?.slice(0, 22) || slot.label) : slot.label}
            positionOffset={offset}
            figureRotationY={settings.rotationY}
            autoRotate={settings.autoRotate}
            isDragging={draggingId === figId}
            liveDragXZ={draggingId === figId ? liveDragXZ : null}
            isSelected={selectedFigureId === figId}
            phaseOffset={i * 0.55}
            onPointerDown={() => fig && onStartDrag(fig, figId, slot.position, offset)}
          />
        )
      })}
    </group>
  )
}

// ── Scene contents ──────────────────────────────────────────────────────────────────
function SceneContents({
  figures,
  onSelectFigure,
  focusTarget,
  figureOffsets,
  figureSettings,
  onDragEnd,
  selectedFigureId,
  cameraMode,
  onExitRoom,
}) {
  const controlsRef       = useRef()
  const firstPersonPitch  = useRef(0)  // first-person vertical view angle
  const isOrbitBlocked    = useRoomStore(s => s.isOrbitBlocked)

  // ── Reset pitch when leaving first-person mode ──
  useEffect(() => {
    if (cameraMode !== 'first') firstPersonPitch.current = 0
  }, [cameraMode])

  // ── Character refs (not React state → 60fps update without re-render) ──
  const charPos        = useRef(new THREE.Vector3(0, 0, 0))
  const charRot        = useRef(Math.PI)   // camera yaw (mouse-controlled in 1st/3rd person)
  const charBodyFacing = useRef(Math.PI)   // visual body rotation (follows velocity direction)
  const hasExitedRef   = useRef(false)
  const walkTimeRef    = useRef(0)
  const isWalkingRef   = useRef(false)
  const keys           = useRef({})

  // ── Register keyboard events ──
  useEffect(() => {
    // Ignore character movement when chat input (input/textarea) has focus
    const isTyping = () => {
      const tag = document.activeElement?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA'
    }
    const kd = (e) => { if (!isTyping()) keys.current[e.code] = true }
    const ku = (e) => {
      keys.current[e.code] = false   // keyup always releases (guarantees movement stops)
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup',   ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup',   ku)
    }
  }, [])

  // ── Character movement (Overwatch-style: WASD = directional, A/D = strafe) ──
  useFrame((state, delta) => {
    const k = keys.current
    const MOVE_SPEED = 4.5

    // 4-directional input — no keyboard rotation
    const inputFwd   = (k['KeyW'] || k['ArrowUp'])    ? 1 : (k['KeyS'] || k['ArrowDown'])  ? -1 : 0
    const inputRight = (k['KeyD'] || k['ArrowRight'])  ? 1 : (k['KeyA'] || k['ArrowLeft']) ? -1 : 0

    // In overview mode use OrbitControls camera direction as movement basis
    // In first/third person use mouse-controlled charRot
    let yaw = charRot.current
    if (cameraMode === 'overview') {
      const camDir = new THREE.Vector3()
      state.camera.getWorldDirection(camDir)
      camDir.y = 0
      if (camDir.lengthSq() > 0.001) {
        camDir.normalize()
        yaw = Math.atan2(camDir.x, camDir.z)
      }
    }

    // World-space velocity from yaw
    // Forward: (sin, cos) in (X, Z)   Right: (-cos, sin) in (X, Z)
    // Negated strafe so D = screen-right regardless of character facing
    const sin = Math.sin(yaw)
    const cos = Math.cos(yaw)
    const velX = sin * inputFwd - cos * inputRight
    const velZ = cos * inputFwd + sin * inputRight

    const spd    = Math.sqrt(velX * velX + velZ * velZ)
    const moving = spd > 0.001

    if (moving) {
      charPos.current.x += (velX / spd) * MOVE_SPEED * delta
      charPos.current.z += (velZ / spd) * MOVE_SPEED * delta

      // Smooth body rotation toward velocity direction (visual turn)
      const targetFacing = Math.atan2(velX / spd, velZ / spd)
      let diff = targetFacing - charBodyFacing.current
      while (diff >  Math.PI) diff -= 2 * Math.PI
      while (diff < -Math.PI) diff += 2 * Math.PI
      charBodyFacing.current += diff * Math.min(1, 10 * delta)
    } else {
      // Idle: hold the last facing direction
    }

    // Clamp to room bounds on all 4 sides — no exit trigger while walking
    charPos.current.x = Math.max(-ROOM_W,      Math.min(ROOM_W,       charPos.current.x))
    charPos.current.z = Math.max(ROOM_D_BACK,  Math.min(ROOM_D_FRONT, charPos.current.z))

    isWalkingRef.current = moving
    if (moving) walkTimeRef.current += delta
  })

  // ── Drag state ──
  const [draggingId, setDraggingId] = useState(null)
  const liveDragXZ    = useRef({ x: 0, z: 0 })
  const startXZ       = useRef(null)
  const dragMovedRef  = useRef(false)
  const dragInfoRef   = useRef(null)
  const dragFigRef    = useRef(null)
  const dragPlaneYRef = useRef(0)   // current drag shelf Y
  const snapTargetRef = useRef(null) // used by SnapController

  const handleStartDrag = useCallback((fig, figId, slotPos, offset) => {
    const [slotX, slotYVal, slotZ] = slotPos
    dragPlaneYRef.current = slotYVal + (offset.y ?? 0)
    const cx = slotX + (offset.x ?? 0)
    const cz = slotZ + (offset.z ?? 0)
    liveDragXZ.current   = { x: cx, z: cz }
    startXZ.current      = { x: cx, z: cz }
    dragMovedRef.current = false
    dragInfoRef.current  = { figId, slotX, slotZ, initOffY: offset.y ?? 0, slotYVal }
    dragFigRef.current   = fig
    setDraggingId(figId)
    document.body.style.cursor = 'grabbing'
  }, [])

  const handleDragEnd = useCallback(() => {
    if (!dragInfoRef.current) return
    const { figId, slotX, slotZ, initOffY, slotYVal } = dragInfoRef.current

    if (dragMovedRef.current) {
      const snap = snapTargetRef.current

      if (snap) {
        // ── Snap: place in showcase slot ─────────────────────────────────────
        const [wx, wy, wz] = snap.worldPos

        // Release previous slot
        const prevPlacement = useRoomStore.getState().getFigurePlacement(figId)
        if (prevPlacement) {
          useRoomStore.getState().vacateSlot(
            prevPlacement.showcaseInstanceId, prevPlacement.slotId
          )
        }
        // Occupy new slot
        useRoomStore.getState().occupySlot(snap.showcaseInstanceId, snap.slotId, figId)

        // Snap figure positionOffset to slot world coordinates
        onDragEnd?.(figId, {
          x: wx - slotX,
          y: wy - slotYVal,
          z: wz - slotZ,
        })
      } else {
        // ── Normal drag end ──────────────────────────────────────────────
        // Release slot if figure was taken out of showcase
        const prevPlacement = useRoomStore.getState().getFigurePlacement(figId)
        if (prevPlacement) {
          useRoomStore.getState().vacateSlot(
            prevPlacement.showcaseInstanceId, prevPlacement.slotId
          )
        }
        onDragEnd?.(figId, {
          x: liveDragXZ.current.x - slotX,
          y: initOffY,
          z: liveDragXZ.current.z - slotZ,
        })
      }
    } else {
      onSelectFigure?.(dragFigRef.current)
    }

    snapTargetRef.current = null
    useRoomStore.getState().clearSnapTarget()
    dragInfoRef.current  = null
    dragFigRef.current   = null
    startXZ.current      = null
    dragMovedRef.current = false
    setDraggingId(null)
    document.body.style.cursor = 'auto'
  }, [onDragEnd, onSelectFigure])

  useEffect(() => {
    const onUp = () => { if (draggingId) handleDragEnd() }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [draggingId, handleDragEnd])

  const theme = useThemeStore(s => s.theme)

  return (
    <>
      <color attach="background" args={[theme.bg]} />

      <RoomLights />
      <RoomFloor />

      <Suspense fallback={null}>
        <StudentRoom />
      </Suspense>

      {/* Player character (GLB model + procedural animation) */}
      <Suspense fallback={null}>
        <PlayerCharacter
          charPos={charPos}
          charBodyFacing={charBodyFacing}
          walkTimeRef={walkTimeRef}
          isWalkingRef={isWalkingRef}
          cameraMode={cameraMode}
        />
      </Suspense>

      {/* Mouse look: pointer-lock yaw in 3rd/1st person, pitch only in 1st */}
      <MouseLook
        mode={cameraMode}
        charRot={charRot}
        charBodyFacing={charBodyFacing}
        pitchRef={firstPersonPitch}
      />

      {/* Camera controller */}
      <CameraController
        mode={cameraMode}
        charPos={charPos}
        charRot={charRot}
        controlsRef={controlsRef}
        focusTarget={focusTarget}
        pitchRef={firstPersonPitch}
      />

      {/* Drag plane (shelf Y reference) */}
      <DragPlane
        active={!!draggingId}
        liveDragXZ={liveDragXZ}
        startXZ={startXZ}
        dragMovedRef={dragMovedRef}
        planeYRef={dragPlaneYRef}
      />

      <Suspense
        fallback={
          <Html center position={[0, 2, 0]}>
            <div style={{
              color: '#00d4ff', fontSize: 13, fontWeight: 600,
              background: 'rgba(0,0,20,0.95)',
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid rgba(0,180,255,0.3)',
            }}>
              Loading figures...
            </div>
          </Html>
        }
      >
        <FigureDisplay
          figures={figures}
          onStartDrag={handleStartDrag}
          figureOffsets={figureOffsets}
          figureSettings={figureSettings}
          draggingId={draggingId}
          liveDragXZ={liveDragXZ}
          selectedFigureId={selectedFigureId}
        />
      </Suspense>

      {/* Placed furniture layer */}
      <FurnitureLayer cameraMode={cameraMode} />

      {/* Showcase snap controller */}
      <SnapController
        liveDragXZ={liveDragXZ}
        draggingId={draggingId}
        snapTargetRef={snapTargetRef}
      />

      <ContactShadows
        position={[0, 0.005, -2]}
        opacity={0.38}
        scale={16}
        blur={1.2}
        far={0.5}
        resolution={512}
        color="#000015"
      />

      {/* OrbitControls — active only in overview mode (disabled while TransformControls in use) */}
      <OrbitControls
        ref={controlsRef}
        enabled={cameraMode === 'overview' && !draggingId && !isOrbitBlocked}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={24}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.02}
        autoRotate={false}
        target={[0, 1.5, 0]}
        dampingFactor={0.08}
        enableDamping
      />

      {/* Postprocessing — enabled only in Naruto theme */}
      {theme.postprocessing && (
        <EffectComposer>
          <Bloom
            intensity={theme.postprocessing.bloom.intensity}
            luminanceThreshold={theme.postprocessing.bloom.luminanceThreshold}
            luminanceSmoothing={theme.postprocessing.bloom.luminanceSmoothing}
            mipmapBlur
          />
          <Vignette
            offset={theme.postprocessing.vignette.offset}
            darkness={theme.postprocessing.vignette.darkness}
          />
        </EffectComposer>
      )}
    </>
  )
}

// ── Main canvas ──────────────────────────────────────────────────────────────
export default function CityScene({
  figures        = [],
  onSelectFigure,
  focusTarget    = null,
  figureOffsets  = {},
  figureSettings = {},
  onDragEnd,
  selectedFigureId = null,
  cameraMode     = 'overview',
  onExitRoom,
  className      = '',
}) {
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, 2))
  const canvasBg = useThemeStore(s => s.theme.bg)

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [0, 14, 22], fov: 55, near: 0.2, far: 80 }}
      style={{ background: canvasBg }}
      gl={{
        antialias:           true,
        powerPreference:     'high-performance',
        toneMapping:         THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true
        gl.shadowMap.type    = THREE.PCFSoftShadowMap
      }}
      onPointerMissed={() => useRoomStore.getState().deselect()}
      className={className}
    >
      <PerformanceMonitor
        onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio, d + 0.25))}
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
      />
      <SceneContents
        figures={figures}
        onSelectFigure={onSelectFigure}
        focusTarget={focusTarget}
        figureOffsets={figureOffsets}
        figureSettings={figureSettings}
        onDragEnd={onDragEnd}
        selectedFigureId={selectedFigureId}
        cameraMode={cameraMode}
        onExitRoom={onExitRoom}
      />
    </Canvas>
  )
}
