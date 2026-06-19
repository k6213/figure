/**
 * VirtualCityScene.jsx — Virtual City 3D Scene (Canvas)
 *
 * - Renders a 10×10 procedural city via ProceduralCityGrid
 * - Reads user room position (roomCell) from useCityStore to set start point
 * - Updates playerPosRef / playerRotRef in useFrame → synced to external minimap
 */
import { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useCityStore, cellToWorld, CITY_HALF } from '../../store/cityStore'
import ProceduralCityGrid from './ProceduralCityGrid'
import ModernBuilding, { BuildingFallback } from './ModernBuilding'

// ── Movement constants ─────────────────────────────────────────────────────────────────
const ROT_SPEED  = 2.0
const MOVE_SPEED = 6.5
const BOUND      = CITY_HALF - 6   // movement boundary (6m inside city edge)

// ── Keyboard hook ─────────────────────────────────────────────────────────────────
function useKeys() {
  const keys = useRef({})
  useEffect(() => {
    const isTyping = () => {
      const tag = document.activeElement?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA'
    }
    const dn = (e) => { if (!isTyping()) keys.current[e.code] = true }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup',   up)
    }
  }, [])
  return keys
}

// ── Stick figure character ───────────────────────────────────────────────────────

const STICK_R   = 0.032
const STICK_MAT = { color: '#1a1a22', roughness: 0.65, metalness: 0.15 }
const ARM_LEN   = Math.sqrt(0.50 ** 2 + 0.30 ** 2)
const ARM_ANG   = Math.atan2(0.50, 0.30)
const LEG_LEN   = Math.sqrt(0.20 ** 2 + 0.80 ** 2)
const LEG_ANG   = Math.atan2(0.20, 0.80)

function CityCharacter({ charPos, charRot, isWalkingRef, cameraMode }) {
  const groupRef    = useRef()
  const leftArmRef  = useRef()
  const rightArmRef = useRef()
  const leftLegRef  = useRef()
  const rightLegRef = useRef()
  const walkTime    = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.position.copy(charPos.current)
    groupRef.current.rotation.y = charRot.current
    if (isWalkingRef.current) walkTime.current += delta
    const t     = walkTime.current
    const walk  = isWalkingRef.current
    const bob   = walk ? Math.abs(Math.sin(t * 7)) * 0.05 : 0
    groupRef.current.position.y = charPos.current.y + bob

    const swing = walk ? Math.sin(t * 7) * 0.55 : 0
    if (leftArmRef.current)  leftArmRef.current.rotation.x  =  swing
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing
    if (leftLegRef.current)  leftLegRef.current.rotation.x  = -swing
    if (rightLegRef.current) rightLegRef.current.rotation.x =  swing
  })

  if (cameraMode === 'first') return null

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh castShadow position={[0, 1.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, STICK_R, 8, 28]} />
        <meshStandardMaterial {...STICK_MAT} />
      </mesh>
      {/* Torso */}
      <mesh castShadow position={[0, 1.20, 0]}>
        <cylinderGeometry args={[STICK_R, STICK_R, 0.80, 6]} />
        <meshStandardMaterial {...STICK_MAT} />
      </mesh>
      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.06, 1.50, 0]} rotation={[0, 0, -ARM_ANG]}>
        <mesh castShadow position={[0, -ARM_LEN / 2, 0]}>
          <cylinderGeometry args={[STICK_R, STICK_R, ARM_LEN, 6]} />
          <meshStandardMaterial {...STICK_MAT} />
        </mesh>
      </group>
      {/* Right arm */}
      <group ref={rightArmRef} position={[0.06, 1.50, 0]} rotation={[0, 0, ARM_ANG]}>
        <mesh castShadow position={[0, -ARM_LEN / 2, 0]}>
          <cylinderGeometry args={[STICK_R, STICK_R, ARM_LEN, 6]} />
          <meshStandardMaterial {...STICK_MAT} />
        </mesh>
      </group>
      {/* Left leg */}
      <group ref={leftLegRef} position={[-0.08, 0.80, 0]} rotation={[0, 0, -LEG_ANG]}>
        <mesh castShadow position={[0, -LEG_LEN / 2, 0]}>
          <cylinderGeometry args={[STICK_R, STICK_R, LEG_LEN, 6]} />
          <meshStandardMaterial {...STICK_MAT} />
        </mesh>
      </group>
      {/* Right leg */}
      <group ref={rightLegRef} position={[0.08, 0.80, 0]} rotation={[0, 0, LEG_ANG]}>
        <mesh castShadow position={[0, -LEG_LEN / 2, 0]}>
          <cylinderGeometry args={[STICK_R, STICK_R, LEG_LEN, 6]} />
          <meshStandardMaterial {...STICK_MAT} />
        </mesh>
      </group>
      {/* Ground shadow circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.28, 16]} />
        <meshStandardMaterial color="#000" transparent opacity={0.28} />
      </mesh>
    </group>
  )
}

// ── First-person mouse look ─────────────────────────────────────────────────────────

function FirstPersonMouseLook({ active, charRot, pitchRef }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    if (!active) {
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      return
    }
    const onClick   = () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock() }
    const onMove    = (e) => {
      if (document.pointerLockElement !== canvas) return
      const sens = 0.0022
      charRot.current -= e.movementX * sens
      pitchRef.current = Math.max(-Math.PI * 0.42,
        Math.min(Math.PI * 0.42, pitchRef.current - e.movementY * sens))
    }
    canvas.addEventListener('click', onClick)
    document.addEventListener('mousemove', onMove)
    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('mousemove', onMove)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
  }, [active, gl])
  return null
}

// ── Camera controller ──────────────────────────────────────────────────────────

function CameraController({ charPos, charRot, cameraMode, controlsRef, pitchRef }) {
  const { camera } = useThree()
  const ovPos = useRef(new THREE.Vector3(0, 200, 220))
  const ovTgt = useRef(new THREE.Vector3(0, 0, 0))

  useFrame(() => {
    if (cameraMode === 'overview') {
      if (controlsRef.current) {
        controlsRef.current.object.position.lerp(ovPos.current, 0.035)
        controlsRef.current.target.lerp(ovTgt.current, 0.035)
        controlsRef.current.update()
      }
      return
    }

    const cx  = charPos.current.x
    const cy  = charPos.current.y
    const cz  = charPos.current.z
    const rot = charRot.current
    const fx  = Math.sin(rot)
    const fz  = Math.cos(rot)

    if (cameraMode === 'third') {
      const target = new THREE.Vector3(cx - fx * 7, cy + 3.5, cz - fz * 7)
      camera.position.lerp(target, 0.10)
      camera.lookAt(cx, cy + 1.2, cz)
    } else {
      const pitch = pitchRef?.current ?? 0
      camera.position.set(cx, cy + 1.72, cz)
      camera.lookAt(
        cx + fx * Math.cos(pitch) * 10,
        cy + 1.72 + Math.sin(pitch) * 10,
        cz + fz * Math.cos(pitch) * 10,
      )
    }
  })
  return null
}

// ── Scene contents ─────────────────────────────────────────────────────────────────

function SceneContents({
  cameraMode, onEnterRoom,
  roomCell,
  playerPosRef, playerRotRef,
}) {
  const controlsRef      = useRef()
  const firstPersonPitch = useRef(0)
  const isWalkingRef     = useRef(false)
  const keys             = useKeys()

  // Initial position: 8m in front of room building
  const initPos = useMemo(() => {
    if (!roomCell) return new THREE.Vector3(0, 0, 8)
    const rw = cellToWorld(roomCell.gx, roomCell.gz)
    return new THREE.Vector3(rw.x, 0, rw.z + 8)
  }, [roomCell])

  const charPos = useRef(initPos.clone())
  const charRot = useRef(Math.PI)  // π = -Z direction (facing the building)

  useEffect(() => {
    if (cameraMode !== 'first') firstPersonPitch.current = 0
  }, [cameraMode])

  useFrame((_, delta) => {
    if (cameraMode === 'overview') {
      // sync external ref even in overview mode
      if (playerPosRef) {
        playerPosRef.current.x = charPos.current.x
        playerPosRef.current.z = charPos.current.z
      }
      return
    }

    const k = keys.current
    let moving = false, turning = false

    if (k['KeyA'] || k['ArrowLeft'])  { charRot.current += ROT_SPEED * delta; turning = true }
    if (k['KeyD'] || k['ArrowRight']) { charRot.current -= ROT_SPEED * delta; turning = true }

    const fx = Math.sin(charRot.current)
    const fz = Math.cos(charRot.current)

    if (k['KeyW'] || k['ArrowUp']) {
      charPos.current.x += fx * MOVE_SPEED * delta
      charPos.current.z += fz * MOVE_SPEED * delta
      moving = true
    }
    if (k['KeyS'] || k['ArrowDown']) {
      charPos.current.x -= fx * MOVE_SPEED * delta
      charPos.current.z -= fz * MOVE_SPEED * delta
      moving = true
    }

    // clamp to city bounds
    charPos.current.x = Math.max(-BOUND, Math.min(BOUND, charPos.current.x))
    charPos.current.z = Math.max(-BOUND, Math.min(BOUND, charPos.current.z))

    isWalkingRef.current = moving || turning

    // sync external refs (for minimap)
    if (playerPosRef) {
      playerPosRef.current.x = charPos.current.x
      playerPosRef.current.z = charPos.current.z
    }
    if (playerRotRef) {
      playerRotRef.current = charRot.current
    }
  })

  return (
    <>
      {/* Daytime sky */}
      <Sky
        distance={9000}
        sunPosition={[100, 80, -30]}
        inclination={0.52}
        azimuth={0.25}
        turbidity={8}
        rayleigh={0.5}
      />

      <ProceduralCityGrid
        roomCell={roomCell}
        onEnterRoom={onEnterRoom}
        playerPosRef={playerPosRef}
      />

      {/* ── Modern Building landmark (Sketchfab GLB, Draco-compressed) ─────── */}
      {/* Position: NE quadrant of the city, elevated to sit on the ground.    */}
      {/* scale=0.2 → ~42m wide × 15m tall (one city block footprint).         */}
      {/* Rotate -30° so the facade faces toward the city center plaza.         */}
      <Suspense fallback={<BuildingFallback />}>
        <ModernBuilding
          position={[60, 8.3, -80]}
          scale={0.2}
          rotation={[0, -Math.PI / 6, 0]}
        />
      </Suspense>

      <CityCharacter
        charPos={charPos}
        charRot={charRot}
        isWalkingRef={isWalkingRef}
        cameraMode={cameraMode}
      />

      <FirstPersonMouseLook
        active={cameraMode === 'first'}
        charRot={charRot}
        pitchRef={firstPersonPitch}
      />

      <CameraController
        charPos={charPos}
        charRot={charRot}
        cameraMode={cameraMode}
        controlsRef={controlsRef}
        pitchRef={firstPersonPitch}
      />

      <OrbitControls
        ref={controlsRef}
        enabled={cameraMode === 'overview'}
        enablePan minDistance={10} maxDistance={450}
      />
    </>
  )
}

// ── Public component ─────────────────────────────────────────────────────────────

export default function VirtualCityScene({
  cameraMode = 'overview',
  onEnterRoom,
  playerPosRef,
  playerRotRef,
  className = '',
}) {
  // assign and subscribe to roomCell
  const { roomCell, assignRoom } = useCityStore()
  useEffect(() => { assignRoom() }, [])

  // Dynamic DPR adjustment (PerformanceMonitor callback)
  const [dpr, setDpr] = useState(1.0)

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [0, 200, 220], fov: 50, near: 0.5, far: 950 }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: 1, toneMappingExposure: 1.0 }}
      className={className}
      onCreated={({ gl, scene }) => {
        gl.shadowMap.enabled = true
        gl.shadowMap.type    = THREE.PCFShadowMap
        scene.background     = new THREE.Color('#87CEEB')
        scene.fog            = new THREE.FogExp2('#C8E4FF', 0.0012)
      }}
    >
      {/* FPS detection → auto lower DPR when low, raise on recovery */}
      <PerformanceMonitor
        ms={200}
        iterations={5}
        threshold={0.75}
        onIncline={() => setDpr(Math.min(window.devicePixelRatio, 1.5))}
        onDecline={() => setDpr(0.75)}
        onChange={({ factor }) => setDpr(0.75 + factor * 0.75)}
      />

      <Suspense fallback={null}>
        <SceneContents
          cameraMode={cameraMode}
          onEnterRoom={onEnterRoom}
          roomCell={roomCell}
          playerPosRef={playerPosRef}
          playerRotRef={playerRotRef}
        />
      </Suspense>
    </Canvas>
  )
}
