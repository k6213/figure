/**
 * CityMinimap.jsx — City minimap + My Room direction arrow
 *
 * - Updated every frame via Canvas 2D (requestAnimationFrame)
 * - playerPosRef / playerRotRef are React refs (no re-render)
 * - Shows nothing when roomCell is null
 */
import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GRID_COLS, GRID_ROWS, CELL_SIZE, cellToWorld } from '../../store/cityStore'

const MAP_SIZE  = 160                               // canvas px
const CITY_W    = GRID_COLS * CELL_SIZE             // 500m
const CITY_H    = GRID_ROWS * CELL_SIZE             // 500m
const SCALE     = MAP_SIZE / Math.max(CITY_W, CITY_H)  // px per world unit
const HALF_W    = CITY_W / 2
const HALF_H    = CITY_H / 2

/** World XZ → Canvas XY */
function toCanvas(wx, wz) {
  return {
    cx: (wx + HALF_W) * SCALE,
    cy: (wz + HALF_H) * SCALE,
  }
}

export default function CityMinimap({ playerPosRef, playerRotRef, roomCell }) {
  const canvasRef = useRef(null)
  const { t } = useTranslation()

  // ── Canvas update via requestAnimationFrame loop ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const roomWorld = roomCell ? cellToWorld(roomCell.gx, roomCell.gz) : null

    let raf
    function draw() {
      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE)

      // Background
      ctx.fillStyle = 'rgba(4,4,20,0.94)'
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE)

      // ── Grid cells (building blocks) ────────────────────────────────────────────
      const cellPx  = CELL_SIZE * SCALE
      const blockPx = cellPx * 0.70

      for (let gz = 0; gz < GRID_ROWS; gz++) {
        for (let gx = 0; gx < GRID_COLS; gx++) {
          const cw       = cellToWorld(gx, gz)
          const { cx, cy } = toCanvas(cw.x, cw.z)
          const isRoom   = roomCell && gx === roomCell.gx && gz === roomCell.gz

          if (isRoom) {
            const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.0035)
            ctx.fillStyle   = `rgba(0,212,255,${(0.18 * pulse).toFixed(2)})`
            ctx.strokeStyle = `rgba(0,212,255,${pulse.toFixed(2)})`
            ctx.lineWidth   = 1.4
            ctx.fillRect(cx - blockPx / 2, cy - blockPx / 2, blockPx, blockPx)
            ctx.strokeRect(cx - blockPx / 2, cy - blockPx / 2, blockPx, blockPx)
          } else {
            ctx.fillStyle = 'rgba(18,18,40,0.80)'
            ctx.fillRect(cx - blockPx / 2, cy - blockPx / 2, blockPx, blockPx)
          }
        }
      }

      // ── My room icon (center dot) ──────────────────────────────────────────
      if (roomWorld) {
        const { cx, cy } = toCanvas(roomWorld.x, roomWorld.z)
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.0035)

        // Outer glow
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 8)
        grad.addColorStop(0, `rgba(0,212,255,${(0.6 * pulse).toFixed(2)})`)
        grad.addColorStop(1, 'rgba(0,212,255,0)')
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Center dot
        ctx.beginPath()
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,255,${pulse.toFixed(2)})`
        ctx.fill()
      }

      // ── Player ─────────────────────────────────────────────────────────
      if (playerPosRef?.current) {
        const px = playerPosRef.current.x
        const pz = playerPosRef.current.z
        const { cx, cy } = toCanvas(px, pz)
        const rot = playerRotRef?.current ?? 0

        // Direction arrow
        const aLen = 12
        const ax   = cx + Math.sin(rot) * aLen
        const ay   = cy + Math.cos(rot) * aLen
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(ax, ay)
        ctx.strokeStyle = '#ffcc00'
        ctx.lineWidth   = 2
        ctx.stroke()

        // Arrowhead
        const aAngle = Math.atan2(ax - cx, ay - cy)
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(
          ax - 5 * Math.sin(aAngle - 0.45),
          ay - 5 * Math.cos(aAngle - 0.45),
        )
        ctx.lineTo(
          ax - 5 * Math.sin(aAngle + 0.45),
          ay - 5 * Math.cos(aAngle + 0.45),
        )
        ctx.closePath()
        ctx.fillStyle = '#ffcc00'
        ctx.fill()

        // Player dot
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffdd00'
        ctx.fill()
        ctx.strokeStyle = '#fff8'
        ctx.lineWidth   = 1
        ctx.stroke()
      }

      // ── Border ───────────────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(0,212,255,0.28)'
      ctx.lineWidth   = 1
      ctx.strokeRect(0.5, 0.5, MAP_SIZE - 1, MAP_SIZE - 1)

      // ── N indicator ─────────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,212,255,0.55)'
      ctx.font      = 'bold 9px monospace'
      ctx.fillText('N', 6, 14)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [roomCell, playerPosRef, playerRotRef])

  // ── Room direction arrow state (200ms update) ────────────────────────────────────
  const [roomArrow, setRoomArrow] = useState(null)

  useEffect(() => {
    if (!roomCell) return
    const rw = cellToWorld(roomCell.gx, roomCell.gz)

    const id = setInterval(() => {
      if (!playerPosRef?.current) return
      const dx   = rw.x - playerPosRef.current.x
      const dz   = rw.z - playerPosRef.current.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > 20) {
        setRoomArrow({
          angle: Math.atan2(dx, dz),
          dist:  Math.round(dist),
        })
      } else {
        setRoomArrow(null)
      }
    }, 200)

    return () => clearInterval(id)
  }, [roomCell, playerPosRef])

  if (!roomCell) return null

  return (
    <div style={{
      position:       'absolute',
      bottom:         24,
      right:          24,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'flex-end',
      gap:            8,
      zIndex:         20,
      pointerEvents:  'none',
      userSelect:     'none',
    }}>
      {/* ── My room direction arrow (shown only when distance > 20m) ── */}
      {roomArrow && (
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          background: 'rgba(0,5,20,0.88)',
          border:     '1px solid rgba(0,212,255,0.45)',
          borderRadius: 8,
          padding:    '4px 12px',
          color:      '#00d4ff',
          fontSize:   11,
          fontWeight: 700,
        }}>
          <span style={{
            display:   'inline-block',
            fontSize:  15,
            transform: `rotate(${roomArrow.angle}rad)`,
          }}>↑</span>
          {t('city.myRoom')} &nbsp;<span style={{ color: '#00d4ff88', fontWeight: 400 }}>
            {roomArrow.dist}m
          </span>
        </div>
      )}

      {/* ── Minimap canvas ── */}
      <div style={{
        borderRadius: 10,
        overflow:     'hidden',
        border:       '1px solid rgba(0,212,255,0.22)',
        boxShadow:    '0 4px 24px rgba(0,0,0,0.55)',
      }}>
        <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} />
      </div>

      {/* ── Legend ── */}
      <div style={{
        display:  'flex',
        gap:      10,
        fontSize: 9,
        color:    'rgba(255,255,255,0.38)',
      }}>
        <span style={{ color: '#ffdd00' }}>{t('minimap.me')}</span>
        <span style={{ color: '#00d4ff' }}>{t('minimap.myRoom')}</span>
      </div>
    </div>
  )
}
