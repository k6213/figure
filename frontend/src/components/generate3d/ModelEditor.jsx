/**
 * ModelEditor.jsx
 * Interactive 3D editor built on React Three Fiber.
 *
 * Rendering quality:
 *  1. computeVertexNormals() — normal smoothing (always applied)
 *  2. SMAA + Bloom           — anti-aliasing + highlight glow
 *  3. Material presets        — plastic / matte / metal
 */
import React, {
  useRef, useState, useMemo, useEffect, useCallback, Suspense,
} from 'react'
import { Canvas }          from '@react-three/fiber'
import {
  OrbitControls, Environment, Center, useGLTF, ContactShadows,
} from '@react-three/drei'
import { GLTFExporter }     from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE           from 'three'
import toast                from 'react-hot-toast'
import { toProxyUrl }       from '../../utils/modelUrl'

/* ══════════════════════════════════════════════════════════
   Error Boundary — prevents page crash on Canvas / GLB load error
══════════════════════════════════════════════════════════ */
class ModelEditorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ModelEditor] Render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full gap-5 p-8 text-center bg-zinc-950 rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20
                          flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">Failed to load 3D viewer</p>
            <p className="text-xs text-zinc-500 mt-2 max-w-xs leading-relaxed">
              {this.state.error?.message || 'An error occurred during GLB file loading or WebGL rendering.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm
                       border border-zinc-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ══════════════════════════════════════════════════════════
   Material collection
══════════════════════════════════════════════════════════ */
function collectMaterials(scene) {
  const map = new Map(); let idx = 0
  scene.traverse((child) => {
    if (!child.isMesh) return
    const list = Array.isArray(child.material) ? child.material : [child.material]
    list.forEach((mat) => {
      if (map.has(mat.uuid)) return
      // Reflect values actually applied after applyMattePBR() as UI initial values
      map.set(mat.uuid, {
        uuid: mat.uuid, mat,
        name:              mat.name || child.name || `Material ${++idx}`,
        originalColor:        mat.color           ? '#' + mat.color.getHexString() : '#888888',
        originalRoughness:    mat.roughness        ?? 1.0,
        originalMetalness:    mat.metalness        ?? 0.0,
        originalEnvIntensity: mat.envMapIntensity  ?? 0.0,
      })
    })
  })
  return Array.from(map.values())
}

/* ══════════════════════════════════════════════════════════
   GLB scene — normal smoothing + auto PBR optimization
══════════════════════════════════════════════════════════ */

/** Automatically adjusts Meshy GLB materials to soft-touch matte plastic
 *
 *  Core issue: Meshy stores roughness/metalness in texture maps (roughnessMap, metalnessMap).
 *  In Three.js, final roughness = roughness(scalar) × roughnessMap(pixel).
 *  If roughnessMap pixel is 0, setting scalar to 0.78 gives 0×0.78=0 → still glossy.
 *
 *  Solution: Remove texture maps (set to null) → fully controlled by scalar value only
 *
 *  - roughness  0.78  : matte plastic (0=mirror, 1=full matte)
 *  - metalness  0.0   : plastic is non-metallic (metalnessMap also removed)
 *  - envMapIntensity 0.35 : minimize env map reflection
 */
function applyMattePBR(mat) {
  // Remove roughnessMap/metalnessMap → fully controlled by scalar only
  // roughness=1.0: Three.js maximum matte (Lambertian diffuse, specular 0%)
  if ('roughness' in mat) {
    mat.roughnessMap = null
    mat.roughness    = 1.0
  }
  if ('metalness' in mat) {
    mat.metalnessMap = null
    mat.metalness    = 0.0
  }
  // envMapIntensity=0: fully block env map reflection → artificial gloss 0%
  mat.envMapIntensity = 0.0
  mat.flatShading     = false
  mat.needsUpdate     = true
}

function GLBScene({ url, sceneRef, onLoad }) {
  const proxyUrl       = toProxyUrl(url)
  const { scene: src } = useGLTF(proxyUrl)

  const clone = useMemo(() => {
    const c = src.clone(true)
    c.traverse((child) => {
      if (!child.isMesh) return

      /* ① Geometry: recalculate normals (Shade Smooth)
         - computeVertexNormals() : averages adjacent polygon normals to smooth edges
         - deleteAttribute('normal') must be called first to override existing normals in GLB */
      if (child.geometry) {
        const geo = child.geometry.clone()
        geo.deleteAttribute('normal')   // remove existing normals → fully recalculate
        geo.computeVertexNormals()      // regenerate smooth shading normals
        child.geometry = geo
      }

      /* ② Clone materials + auto-apply matte PBR */
      const applyAndClone = (m) => {
        const n = m.clone()
        n.name = m.name
        applyMattePBR(n)
        return n
      }
      if (Array.isArray(child.material)) {
        child.material = child.material.map(applyAndClone)
      } else {
        child.material = applyAndClone(child.material)
      }

      child.castShadow    = true
      child.receiveShadow = true
    })
    return c
  }, [src])

  useEffect(() => {
    sceneRef.current = clone
    onLoad(collectMaterials(clone))
  }, [clone, sceneRef, onLoad])

  return <Center><primitive object={clone} /></Center>
}

/* ══════════════════════════════════════════════════════════
   Presets
══════════════════════════════════════════════════════════ */
/* Preset definitions
 * Matte figure (default): roughness 0.78 / metalness 0 / env 0.35
 *   → Original soft-touch matte plastic, no specular
 * Glossy figure:          roughness 0.22 / metalness 0 / env 1.8
 *   → Gloss-coated figure (Nendoroid glossy style)
 * Metal:                  roughness 0.15 / metalness 0.9 / env 2.5
 */
/* roughness 0=mirror, 1=full matte (Lambertian diffuse)
 * Three.js MeshStandardMaterial range is 0~1
 * "Roughness 2.0" in other tools is a different normalization; Three.js 1.0 = full matte */
const PRESETS = {
  flatMatte: { roughness: 1.0,  metalness: 0.0, envIntensity: 0.0  },  // Full matte: 100% light absorption/diffusion
  matte:     { roughness: 0.82, metalness: 0.0, envIntensity: 0.15 },  // Soft-touch matte (original figure)
  glossy:    { roughness: 0.22, metalness: 0.0, envIntensity: 1.8  },  // Glossy coating
  metal:     { roughness: 0.15, metalness: 0.9, envIntensity: 2.5  },  // Metal
}

/* ══════════════════════════════════════════════════════════
   UI components
══════════════════════════════════════════════════════════ */
function Slider({ label, value, min=0, max=1, step=0.01, accent='bg-brand-500', onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-400 font-mono">{value.toFixed(2)}</span>
      </div>
      <div className="relative h-1.5 bg-zinc-800 rounded-full">
        <div className={`absolute left-0 top-0 h-full ${accent} rounded-full pointer-events-none`}
             style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value}
               onChange={(e) => onChange(parseFloat(e.target.value))}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>
    </div>
  )
}

function MatRow({ entry, vals, onColor, onRoughness, onMetalness, onEnv }) {
  return (
    <div className="py-2 border-b border-zinc-800/50 space-y-2">
      <div className="flex items-center gap-2">
        <label className="relative cursor-pointer shrink-0">
          <div className="w-6 h-6 rounded-md border border-zinc-700 hover:border-brand-400 transition-colors"
               style={{ background: vals.color }} />
          <input type="color" value={vals.color}
                 className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                 onChange={(e) => onColor(entry.uuid, e.target.value)} />
        </label>
        <span className="text-[11px] text-zinc-300 truncate flex-1">{entry.name}</span>
      </div>
      {entry.mat.roughness != null && (
        <div className="pl-8 space-y-2">
          <Slider label="Roughness" value={vals.roughness} accent="bg-amber-500"
                  onChange={(v) => onRoughness(entry.uuid, v)} />
          <Slider label="Metallic"   value={vals.metalness} accent="bg-zinc-400"
                  onChange={(v) => onMetalness(entry.uuid, v)} />
          <Slider label="Env. Reflection" value={vals.envIntensity} min={0} max={3} step={0.05} accent="bg-emerald-500"
                  onChange={(v) => onEnv(entry.uuid, v)} />
        </div>
      )}
    </div>
  )
}

function ToolBtn({ active, onClick, children, className = '' }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                  border transition-all duration-150 ${className}
                  ${active
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border-transparent'}`}>
      {children}
    </button>
  )
}

/* ══════════════════════════════════════════════════════════
   Main editor
══════════════════════════════════════════════════════════ */
function ModelEditorCore({ src, filename = 'herofig-model' }) {
  const sceneRef = useRef(null)

  const [mats,      setMats]      = useState([])
  const [matVals,   setMatVals]   = useState({})
  const [wireframe, setWireframe] = useState(false)
  const [autoRot,   setAutoRot]   = useState(true)
  const [bg,        setBg]        = useState('dark')
  const [envPreset, setEnvPreset] = useState('studio')
  const [exporting, setExporting] = useState(false)
  const [loaded,    setLoaded]    = useState(false)

  const handleLoad = useCallback((entries) => {
    setMats(entries)
    const init = {}
    entries.forEach((e) => {
      init[e.uuid] = {
        color: e.originalColor, roughness: e.originalRoughness,
        metalness: e.originalMetalness, envIntensity: e.originalEnvIntensity,
      }
    })
    setMatVals(init)
    setLoaded(true)
  }, [])

  const handleColor = useCallback((uuid, hex) => {
    setMatVals((p) => ({ ...p, [uuid]: { ...p[uuid], color: hex } }))
    const e = mats.find((m) => m.uuid === uuid)
    if (e?.mat?.color) { e.mat.color.set(hex); e.mat.needsUpdate = true }
  }, [mats])

  const handleProp = useCallback((uuid, key, matKey, v) => {
    setMatVals((p) => ({ ...p, [uuid]: { ...p[uuid], [key]: v } }))
    const e = mats.find((m) => m.uuid === uuid)
    if (!e?.mat) return
    if (matKey === 'envMapIntensity') {
      e.mat.envMapIntensity = v
    } else if (matKey === 'roughness') {
      e.mat.roughnessMap = null   // remove map → slider value takes effect immediately
      e.mat.roughness    = v
    } else if (matKey === 'metalness') {
      e.mat.metalnessMap = null
      e.mat.metalness    = v
    }
    e.mat.needsUpdate = true
  }, [mats])

  const applyPreset = useCallback((preset) => {
    const upd = {}
    mats.forEach(({ uuid, mat, originalColor }) => {
      upd[uuid] = { color: matVals[uuid]?.color ?? originalColor, ...preset }
      // Remove texture maps → so scalar values take actual effect
      if ('roughness' in mat) { mat.roughnessMap = null; mat.roughness = preset.roughness }
      if ('metalness' in mat) { mat.metalnessMap = null; mat.metalness = preset.metalness }
      mat.envMapIntensity = preset.envIntensity
      mat.needsUpdate = true
    })
    setMatVals((p) => ({ ...p, ...upd }))
  }, [mats, matVals])

  const handleWireframe = useCallback((on) => {
    setWireframe(on)
    mats.forEach(({ mat }) => { mat.wireframe = on; mat.needsUpdate = true })
  }, [mats])

  const handleReset = useCallback(() => {
    const reset = {}
    mats.forEach(({ uuid, mat, originalColor, originalRoughness, originalMetalness, originalEnvIntensity }) => {
      reset[uuid] = { color: originalColor, roughness: originalRoughness, metalness: originalMetalness, envIntensity: originalEnvIntensity }
      if (mat.color) mat.color.set(originalColor)
      if (mat.roughness != null) mat.roughness = originalRoughness
      if (mat.metalness != null) mat.metalness = originalMetalness
      mat.envMapIntensity = originalEnvIntensity
      mat.needsUpdate = true
    })
    setMatVals(reset)
    toast.success('Materials reset')
  }, [mats])

  const handleExport = useCallback(() => {
    if (!sceneRef.current) return
    setExporting(true)
    new GLTFExporter().parse(
      sceneRef.current,
      (buf) => {
        const a = document.createElement('a')
        a.href  = URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' }))
        a.download = `${filename}.glb`; a.click(); URL.revokeObjectURL(a.href)
        toast.success('.glb download started!'); setExporting(false)
      },
      (err) => { console.error(err); toast.error('Export failed'); setExporting(false) },
      { binary: true },
    )
  }, [filename])

  const bgColor = bg === 'light' ? '#dfe0e2' : '#080810'

  return (
    <div className="flex flex-col w-full h-full overflow-hidden rounded-xl border border-ink-line">

      {/* ── 툴바 ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ink-line
                      bg-zinc-950/90 backdrop-blur shrink-0 flex-wrap">

        {/* Export */}
        <button onClick={handleExport} disabled={exporting || !loaded}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-brand-500 hover:bg-brand-400 text-white transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-brand-500/20">
          {exporting
            ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>}
          .glb Download
        </button>

        <div className="w-px h-4 bg-zinc-700" />

        {/* Material presets */}
        {[
          { label:'⬛ Matte',    key:'flatMatte', cls:'text-zinc-300'  },
          { label:'🎨 Semi-Matte', key:'matte',  cls:'text-pink-400'  },
          { label:'✨ Glossy',  key:'glossy',    cls:'text-sky-400'   },
          { label:'⚙️ Metal',   key:'metal',     cls:'text-amber-400' },
        ].map(({ label, key, cls }) => (
          <button key={key} onClick={() => applyPreset(PRESETS[key])} disabled={!loaded}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border border-transparent
                        hover:border-zinc-700 transition-colors disabled:opacity-40 ${cls}`}>
            {label}
          </button>
        ))}

        <div className="w-px h-4 bg-zinc-700" />

        <ToolBtn active={autoRot} onClick={() => setAutoRot(v => !v)}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
          Auto Rotate
        </ToolBtn>

        <ToolBtn active={wireframe} onClick={() => handleWireframe(!wireframe)}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg>
          Wireframe
        </ToolBtn>

        {/* Background */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {[['dark','Dark'],['light','Light']].map(([m,l]) => (
            <button key={m} onClick={() => setBg(m)}
              className={`px-2.5 py-1.5 text-xs transition-colors ${bg===m?'bg-zinc-700 text-zinc-100':'text-zinc-500 hover:text-zinc-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Lighting */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {[['studio','Studio'],['sunset','Sunset'],['warehouse','Warehouse']].map(([p,l]) => (
            <button key={p} onClick={() => setEnvPreset(p)}
              className={`px-2.5 py-1.5 text-xs transition-colors ${envPreset===p?'bg-zinc-700 text-zinc-100':'text-zinc-500 hover:text-zinc-300'}`}>
              {l}
            </button>
          ))}
        </div>

        <button onClick={handleReset} disabled={!loaded}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                     text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
          Reset
        </button>
      </div>

      {/* ── 본문 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* 3D 캔버스 */}
        <div className="relative flex-1" style={{ background: bgColor }}>
          <Canvas
            shadows
            camera={{ position: [0, 0.8, 3], fov: 40 }}
            gl={{
              antialias:           true,
              toneMapping:         THREE.ACESFilmicToneMapping,
              toneMappingExposure: bg === 'light' ? 1.0 : 1.2,
            }}
            onCreated={({ gl }) => {
              gl.shadowMap.enabled = true
              gl.shadowMap.type    = THREE.PCFSoftShadowMap
            }}
          >
            {/* Plastic figure lighting setup
                - ambientLight: ensures base light so shadow areas don't go fully black
                - Main key light (upper left): creates highlights for glossy feel
                - Supplemental fill light (right): slightly brightens the opposite side for depth
                - Rim light (back): silhouette separation, commercial figure photography technique */}
            <ambientLight intensity={bg === 'light' ? 1.2 : 0.5} />

            {/* Key light — main highlight */}
            <directionalLight
              position={[-3, 5, 4]} intensity={bg === 'light' ? 1.6 : 2.0}
              castShadow
              shadow-mapSize-width={2048} shadow-mapSize-height={2048}
              shadow-camera-near={0.5}  shadow-camera-far={30}
              shadow-camera-left={-3}   shadow-camera-right={3}
              shadow-camera-top={3}     shadow-camera-bottom={-3}
              shadow-bias={-0.001}
            />
            {/* Fill light — opposite side supplemental */}
            <directionalLight position={[4, 3, -2]}  intensity={0.8} />
            {/* Rim light — silhouette emphasis */}
            <directionalLight position={[0, 1, -5]}  intensity={0.5} />
            {/* Floor reflection */}
            <pointLight       position={[0, -2, 2]}  intensity={0.3} color="#ffffff" />

            <Suspense fallback={null}>
              <GLBScene
                url={src}
                sceneRef={sceneRef}
                onLoad={handleLoad}
              />
              {/* Environment: background=false → HDRI not shown in background
                  Only applied to material envMap, creating plastic spherical reflections */}
              {/* Keep env map reflection intensity low for matte figures
                  When glossy/metal preset is selected, material.envMapIntensity increases */}
              <Environment
                preset={envPreset}
                background={false}
                environmentIntensity={bg === 'light' ? 0.5 : 0.7}
              />
              <ContactShadows
                position={[0, -1.2, 0]}
                opacity={bg === 'light' ? 0.25 : 0.45}
                scale={8} blur={2.5} far={3}
              />
            </Suspense>

            <OrbitControls
              autoRotate={autoRot} autoRotateSpeed={0.9}
              enablePan enableZoom enableDamping dampingFactor={0.06}
              minDistance={0.3} maxDistance={20}
            />

          </Canvas>

          {/* Loading overlay */}
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/85">
              <svg className="w-10 h-10 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-sm text-zinc-400">
                Loading 3D model...
              </span>
            </div>
          )}

          {loaded && (
            <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-zinc-600 select-none pointer-events-none">
              <span>Drag: Rotate</span><span>Scroll: Zoom</span><span>Right-click: Pan</span>
            </div>
          )}
        </div>

        {/* ── Material edit panel ── */}
        <div className="w-56 shrink-0 flex flex-col border-l border-ink-line bg-zinc-900/70">
          <div className="px-3 py-2.5 border-b border-ink-line">
            <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Edit Material</h3>
            <p className="text-[10px] text-zinc-600 mt-0.5">Color · Roughness · Metallic · Env. Reflection</p>
          </div>

          <div className="px-3 py-2 border-b border-zinc-800/40 bg-zinc-950/30 space-y-1">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              ⬛ <span className="text-zinc-300">Matte</span> → 0% gloss, full light absorption<br/>
              🎨 <span className="text-pink-400">Semi-Matte</span> → soft-touch (original figure)<br/>
              ✨ <span className="text-sky-400">Glossy</span> → gloss-coated figure
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-1">
            {!loaded && (
              <div className="py-6 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-md bg-zinc-800"/>
                      <div className="flex-1 h-3 bg-zinc-800 rounded mt-1.5"/>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full ml-8"/>
                    <div className="h-1.5 bg-zinc-800 rounded-full ml-8"/>
                    <div className="h-1.5 bg-zinc-800 rounded-full ml-8"/>
                  </div>
                ))}
              </div>
            )}
            {loaded && mats.length === 0 && <p className="text-xs text-zinc-600 py-6 text-center">No materials</p>}
            {mats.map((entry) => {
              const v = matVals[entry.uuid] ?? {
                color: entry.originalColor, roughness: entry.originalRoughness,
                metalness: entry.originalMetalness, envIntensity: entry.originalEnvIntensity,
              }
              return (
                <MatRow key={entry.uuid} entry={entry} vals={v}
                  onColor={handleColor}
                  onRoughness={(u, val) => handleProp(u, 'roughness',    'roughness',       val)}
                  onMetalness={(u, val) => handleProp(u, 'metalness',    'metalness',       val)}
                  onEnv=      {(u, val) => handleProp(u, 'envIntensity', 'envMapIntensity', val)}
                />
              )
            })}
          </div>

          {loaded && mats.length > 0 && (
            <div className="px-3 py-2 border-t border-ink-line text-[10px] text-zinc-700">
              {mats.length} materials · PBR
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Public export — Error Boundary + Suspense built-in
   No separate Suspense needed in WorkspaceView / ResultModal
══════════════════════════════════════════════════════════ */
export default function ModelEditor(props) {
  return (
    <ModelEditorBoundary>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center w-full h-full gap-3 bg-zinc-950 rounded-xl">
            <svg className="w-10 h-10 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm text-zinc-400">Initializing 3D editor...</span>
          </div>
        }
      >
        <ModelEditorCore {...props} />
      </Suspense>
    </ModelEditorBoundary>
  )
}
