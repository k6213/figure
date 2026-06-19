import { create } from 'zustand'

export const THEMES = {
  modern: {
    id: 'modern',
    name: 'Modern',
    icon: '🏠',
    bg: '#ede8dc',
    // Lighting
    ambient:    { color: '#ffe8c8', intensity: 0.75 },
    ceilingLED: { color: '#fff5e0', intensity: 40   },
    sunlight:   { color: '#c8dce8', intensity: 0.85 },
    frontFill:  { color: '#fff0e0', intensity: 0.45 },
    shelfFill:  { color: '#fff8ec', intensity: 28   },
    deskLamp:   { color: '#ffe090', intensity: 12   },
    // Wall / ceiling
    wall:      { color: '#ede8dc', roughness: 0.94, metalness: 0.0 },
    ceil:      { color: '#f5f2ea', roughness: 1.0,  metalness: 0.0 },
    baseboard: '#d4c8a8',
    // Floor
    floor: { color: '#c4984c', roughness: 0.82, seam: '#a07838', rug: '#6b3535', rugBorder: '#c4884a' },
    // Accent
    ceilingLightEmissive: '#ffe8a0',
    portalColor:   '#55bbff',
    portalEmissive:'#2299ee',
    // Postprocessing
    postprocessing: null,
  },
  naruto: {
    id: 'naruto',
    name: 'Naruto Ninja',
    icon: '🍥',
    bg: '#0d0600',
    // Lighting — orange torchlight
    ambient:    { color: '#ff6622', intensity: 0.5  },
    ceilingLED: { color: '#ff8800', intensity: 28   },
    sunlight:   { color: '#ff9944', intensity: 0.45 },
    frontFill:  { color: '#ff6600', intensity: 0.3  },
    shelfFill:  { color: '#ff8844', intensity: 20   },
    deskLamp:   { color: '#ff5500', intensity: 16   },
    // Wall / ceiling — dark wood
    wall:      { color: '#1c0a00', roughness: 0.88, metalness: 0.0 },
    ceil:      { color: '#110600', roughness: 1.0,  metalness: 0.0 },
    baseboard: '#2a1000',
    // Floor — dark bamboo mat
    floor: { color: '#251000', roughness: 0.92, seam: '#180a00', rug: '#6b0a0a', rugBorder: '#cc2200' },
    // Accent
    ceilingLightEmissive: '#ff6600',
    portalColor:   '#ff4422',
    portalEmissive:'#cc1100',
    // Postprocessing
    postprocessing: {
      bloom:   { intensity: 0.9, luminanceThreshold: 0.55, luminanceSmoothing: 0.9 },
      vignette:{ offset: 0.35, darkness: 0.85 },
    },
  },
}

export const useThemeStore = create((set) => ({
  themeId: 'modern',
  theme: THEMES.modern,

  toggleTheme() {
    set(s => {
      const next = s.themeId === 'modern' ? 'naruto' : 'modern'
      return { themeId: next, theme: THEMES[next] }
    })
  },

  setTheme(id) {
    if (THEMES[id]) set({ themeId: id, theme: THEMES[id] })
  },
}))
