/**
 * convert_fbx.mjs
 * Node.js script: Walking.fbx → walking.glb (binary FBX → GLB)
 * Uses three.js FBXLoader + GLTFExporter with minimal DOM polyfills
 *
 * Run: node convert_fbx.mjs
 */
import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'
import { JSDOM } from 'jsdom'

const require = createRequire(import.meta.url)

// ── Minimal DOM/browser polyfills needed by three.js loaders ──────────────────
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.window      = dom.window
global.document    = dom.window.document
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true })
global.Blob        = dom.window.Blob
global.URL         = dom.window.URL
global.btoa        = (s) => Buffer.from(s, 'binary').toString('base64')
global.atob        = (s) => Buffer.from(s, 'base64').toString('binary')
global.TextDecoder = dom.window.TextDecoder
global.TextEncoder = dom.window.TextEncoder

// three.js needs a fake XMLHttpRequest for some loaders
global.XMLHttpRequest = class {
  open() {}
  send() {}
  setRequestHeader() {}
}

// FBXLoader / GLTFExporter need these browser APIs
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => 'blob:mock'
  global.URL.revokeObjectURL = () => {}
}
global.FileReader = class {
  _fire(result) {
    this.result = result
    this.onload?.({ target: { result } })
    this.onloadend?.({ target: { result } })
  }
  readAsArrayBuffer(blob) {
    const p = typeof blob.arrayBuffer === 'function'
      ? blob.arrayBuffer()
      : Promise.resolve(new ArrayBuffer(0))
    p.then(ab => this._fire(ab)).catch(e => this.onerror?.(e))
  }
  readAsDataURL(blob) {
    const p = typeof blob.arrayBuffer === 'function'
      ? blob.arrayBuffer()
      : Promise.resolve(new ArrayBuffer(0))
    p.then(ab => {
      const b64 = Buffer.from(ab).toString('base64')
      this._fire(`data:application/octet-stream;base64,${b64}`)
    }).catch(e => this.onerror?.(e))
  }
}

// ── Dynamic import three.js (ES module) from the project's node_modules ───────
const THREE = await import('./frontend/node_modules/three/build/three.module.js')
  .catch(() => import('./frontend/node_modules/three/build/three.cjs'))
  .catch(async () => {
    // Try CommonJS fallback
    const t = require('./frontend/node_modules/three/build/three.cjs.js')
    return { default: t, ...t }
  })

console.log('three.js loaded, version:', THREE.REVISION ?? THREE.default?.REVISION)

// Try to import FBXLoader
let FBXLoader, GLTFExporter

try {
  const m = await import('./frontend/node_modules/three/examples/jsm/loaders/FBXLoader.js')
  FBXLoader = m.FBXLoader
  console.log('FBXLoader imported')
} catch (e) {
  console.error('FBXLoader import failed:', e.message)
  process.exit(1)
}

try {
  const m = await import('./frontend/node_modules/three/examples/jsm/exporters/GLTFExporter.js')
  GLTFExporter = m.GLTFExporter
  console.log('GLTFExporter imported')
} catch (e) {
  console.error('GLTFExporter import failed:', e.message)
  process.exit(1)
}

// ── Load FBX ──────────────────────────────────────────────────────────────────
const fbxPath = 'C:/Users/zxdcf/Downloads/Walking.fbx'
console.log('Loading FBX:', fbxPath)

const fbxBuffer = readFileSync(fbxPath)
const loader = new FBXLoader()

let object3D
try {
  // FBXLoader can parse from ArrayBuffer directly
  object3D = loader.parse(fbxBuffer.buffer.slice(
    fbxBuffer.byteOffset,
    fbxBuffer.byteOffset + fbxBuffer.byteLength,
  ))
  console.log('FBX parsed. Type:', object3D.constructor.name)
  console.log('Animations:', object3D.animations?.length ?? 0)
  console.log('Children:', object3D.children?.length ?? 0)
} catch (e) {
  console.error('FBX parse error:', e.message)
  process.exit(1)
}

// ── Strip textures (GLTFExporter can't handle embedded FBX textures in Node.js)
// The animation + skeleton data is preserved; only visual textures are removed.
object3D.traverse((node) => {
  if (!node.material) return
  const mats = Array.isArray(node.material) ? node.material : [node.material]
  mats.forEach((mat) => {
    // Replace with plain MeshStandardMaterial (no textures) so GLTFExporter succeeds
    const color = mat.color?.clone?.() ?? new THREE.Color(0xcccccc)
    const plain = new THREE.MeshStandardMaterial({ color, skinning: true })
    Object.assign(node, node.material === mat ? { material: plain } : {})
    if (Array.isArray(node.material)) {
      const idx = node.material.indexOf(mat)
      if (idx !== -1) node.material[idx] = plain
    } else {
      node.material = plain
    }
  })
})
console.log('Textures stripped, exporting...')

// ── Export GLB ────────────────────────────────────────────────────────────────
const outPath = './frontend/public/models/walking.glb'
console.log('Exporting GLB to:', outPath)

const exporter = new GLTFExporter()
const opts = { binary: true, animations: object3D.animations ?? [] }

try {
  // r152+ has parseAsync that avoids the FileReader/Blob path in Node.js
  const result = await exporter.parseAsync(object3D, opts)
  const buf = result instanceof ArrayBuffer ? Buffer.from(result) : Buffer.from(result)
  writeFileSync(outPath, buf)
  console.log(`✓ Done! GLB saved: ${outPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`)
} catch (e) {
  console.error('parseAsync error:', e.message)
  process.exit(1)
}
