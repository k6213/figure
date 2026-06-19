/**
 * furnitureData.js
 * Virtual showroom furniture catalog
 *
 * Each item: id, name, type, category, dimensions, icon
 * showcase type: includes defaultSlots (3 tiers × 4 columns = 12 slots)
 */

// ── Showcase slot generation helper ──────────────────────────────────────────────────────
// Based on w=2.2, h=6.5, d=1.2 (3 tiers × 4 columns, tier height ~2.0m)
const SHELF_Y = [0.44, 2.3, 4.16]           // shelf surface Y (local)
const COL_X   = [-0.72, -0.24, 0.24, 0.72]  // 4 column X positions (local)

function makeShowcaseSlots() {
  const slots = []
  let n = 1
  for (const y of SHELF_Y) {
    for (const x of COL_X) {
      slots.push({
        id:          `slot-${n++}`,
        localPos:    [x, y + 0.04, 0.08],  // on shelf + toward front
        isOccupied:  false,
        occupiedBy:  null,
      })
    }
  }
  return slots  // 12 slots
}

// ── Catalog ──────────────────────────────────────────────────────────────────
export const FURNITURE_CATALOG = {

  // ── Storage furniture ──────────────────────────────────────────────────────────────
  storage: [
    {
      id:          'showcase-tall',
      name:        'Glass Showcase',
      type:        'showcase',
      category:    'storage',
      modelPath:   null,
      dimensions:  { w: 2.2, h: 6.5, d: 1.2 },
      defaultSlots: makeShowcaseSlots(),
      icon:        '🪟',
      description: '3-tier × 4-column figure display case',
    },
    {
      id:          'bookshelf',
      name:        'Bookshelf',
      type:        'bookshelf',
      category:    'storage',
      modelPath:   null,
      dimensions:  { w: 1.8, h: 2.4, d: 0.4 },
      icon:        '📚',
      description: '4-tier wooden bookshelf',
    },
    {
      id:          'floating-shelf',
      name:        'Wall Shelf',
      type:        'shelf',
      category:    'storage',
      modelPath:   null,
      dimensions:  { w: 1.4, h: 0.08, d: 0.28 },
      wallMount:   true,
      icon:        '📐',
      description: 'Single-tier floating shelf',
    },
  ],

  // ── General furniture ──────────────────────────────────────────────────────────────
  furniture: [
    {
      id:          'desk',
      name:        'Desk',
      type:        'desk',
      category:    'furniture',
      modelPath:   null,
      dimensions:  { w: 2.6, h: 0.76, d: 1.1 },
      icon:        '🖥',
      description: 'Wooden desk with drawer unit',
    },
    {
      id:          'bed-single',
      name:        'Bed (Single)',
      type:        'bed',
      category:    'furniture',
      modelPath:   null,
      dimensions:  { w: 1.1, h: 0.55, d: 2.2 },
      icon:        '🛏',
      description: 'Single size bed',
    },
    {
      id:          'chair-desk',
      name:        'Chair',
      type:        'chair',
      category:    'furniture',
      modelPath:   null,
      dimensions:  { w: 0.6, h: 1.05, d: 0.6 },
      icon:        '🪑',
      description: 'Wheeled desk chair',
    },
    {
      id:          'sofa-2seat',
      name:        'Sofa (2-Seater)',
      type:        'sofa',
      category:    'furniture',
      modelPath:   null,
      dimensions:  { w: 1.8, h: 0.9, d: 0.85 },
      icon:        '🛋',
      description: '2-seater fabric sofa',
    },
  ],

  // ── Lighting ──────────────────────────────────────────────────────────────────
  lighting: [
    {
      id:          'lamp-desk',
      name:        'Desk Lamp',
      type:        'lamp',
      category:    'lighting',
      modelPath:   null,
      dimensions:  { w: 0.2, h: 0.45, d: 0.2 },
      lightProps:  { color: '#ffe4b0', intensity: 12, distance: 5.5, decay: 2, lightType: 'point' },
      icon:        '💡',
      description: 'Adjustable desk lamp stand',
    },
    {
      id:          'lamp-floor',
      name:        'Floor Lamp',
      type:        'lamp',
      category:    'lighting',
      modelPath:   null,
      dimensions:  { w: 0.32, h: 1.8, d: 0.32 },
      lightProps:  { color: '#fff5e0', intensity: 22, distance: 9, decay: 2, lightType: 'point' },
      icon:        '🕯',
      description: '180cm floor lamp stand',
    },
    {
      id:          'lamp-ceiling',
      name:        'Ceiling Light',
      type:        'lamp',
      category:    'lighting',
      modelPath:   null,
      dimensions:  { w: 0.6, h: 0.18, d: 0.6 },
      lightProps:  { color: '#fffbe8', intensity: 40, distance: 14, decay: 2, lightType: 'spot', angle: Math.PI / 5 },
      icon:        '🔆',
      description: 'Round LED ceiling light',
    },
  ],

  // ── Decoration ──────────────────────────────────────────────────────────────────
  decoration: [
    {
      id:          'carpet-round',
      name:        'Carpet',
      type:        'carpet',
      category:    'decoration',
      modelPath:   null,
      dimensions:  { w: 2.8, h: 0.018, d: 2.0 },
      icon:        '🟫',
      description: 'Rectangular patterned carpet',
    },
    {
      id:          'poster',
      name:        'Wall Poster',
      type:        'poster',
      category:    'decoration',
      modelPath:   null,
      dimensions:  { w: 0.8, h: 1.1, d: 0.025 },
      wallMount:   true,
      icon:        '🖼',
      description: 'Wooden frame poster',
    },
    {
      id:          'plant-small',
      name:        'Plant (Small)',
      type:        'plant',
      category:    'decoration',
      modelPath:   null,
      dimensions:  { w: 0.26, h: 0.55, d: 0.26 },
      icon:        '🪴',
      description: 'Small potted plant',
    },
  ],
}

// Flat array of all catalog items
export const ALL_FURNITURE = Object.values(FURNITURE_CATALOG).flat()

// Category metadata
export const CATEGORIES = [
  { key: 'storage',    label: 'Storage',    icon: '🗄' },
  { key: 'furniture',  label: 'Furniture',  icon: '🛋' },
  { key: 'lighting',   label: 'Lighting',   icon: '💡' },
  { key: 'decoration', label: 'Decoration', icon: '🌿' },
]
