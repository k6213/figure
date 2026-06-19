import { useThemeStore } from '../../store/themeStore'

export default function RoomLights() {
  const theme = useThemeStore(s => s.theme)
  const { ambient, ceilingLED, sunlight, frontFill, shelfFill, deskLamp } = theme

  return (
    <>
      {/* ── Ambient ── */}
      <ambientLight intensity={ambient.intensity} color={ambient.color} />

      {/* ── Window / sunlight ── */}
      <directionalLight
        position={[-14, 6.0, -1.0]}
        intensity={sunlight.intensity}
        color={sunlight.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={9}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0005}
      />

      {/* ── 2 ceiling LEDs ── */}
      <pointLight position={[0, 6.7, -3]} intensity={ceilingLED.intensity} distance={22} decay={2} color={ceilingLED.color} />
      <pointLight position={[0, 6.7,  4]} intensity={ceilingLED.intensity} distance={22} decay={2} color={ceilingLED.color} />

      {/* ── Front fill ── */}
      <directionalLight position={[0, 5, 14]} intensity={frontFill.intensity} color={frontFill.color} />

      {/* ── Per-shelf fills for display cabinet ── */}
      <pointLight position={[0, 1.2, -8.5]} intensity={shelfFill.intensity} distance={14} decay={2} color={shelfFill.color} />
      <pointLight position={[0, 3.5, -8.5]} intensity={shelfFill.intensity} distance={14} decay={2} color={shelfFill.color} />
      <pointLight position={[0, 5.7, -8.5]} intensity={shelfFill.intensity} distance={14} decay={2} color={shelfFill.color} />

      {/* ── Desk lamp ── */}
      <pointLight position={[9.0, 2.2, 3.5]} intensity={deskLamp.intensity} distance={5.5} decay={2} color={deskLamp.color} />

      {/* ── Viewing area floor ambiance ── */}
      <pointLight position={[0, 1.8, 1.5]} intensity={5} distance={12} decay={2} color={ambient.color} />
    </>
  )
}
