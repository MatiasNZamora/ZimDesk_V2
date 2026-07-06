'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Check, RotateCcw } from 'lucide-react'

interface Props {
  onSave: (base64: string | null) => void
  savedSignature?: string | null
  label?: string
  sublabel?: string
}

export function SignaturePad({ onSave, savedSignature, label, sublabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const lastPos   = useRef<{ x: number; y: number } | null>(null)
  const [state, setState] = useState<'empty' | 'drawing' | 'saved'>('empty')
  const MIN_PIXELS = 200

  useEffect(() => {
    if (savedSignature) setState('saved')
  }, [savedSignature])

  function getPos(e: MouseEvent | Touch, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const dpr  = window.devicePixelRatio || 1
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top)  * dpr,
    }
  }

  function initCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1a2234'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }

  useEffect(() => {
    initCanvas()
    window.addEventListener('resize', initCanvas)
    return () => window.removeEventListener('resize', initCanvas)
  }, [])

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const nonEmpty = imageData.data.some((v, i) => i % 4 === 3 && v > 0)
    if (!nonEmpty) { setState('empty'); return }
    const b64 = canvas.toDataURL('image/png')
    onSave(b64)
    setState('saved')
  }, [onSave])

  const startDraw = useCallback((pos: { x: number; y: number }) => {
    drawing.current = true
    lastPos.current = pos
    setState('drawing')
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(pos.x / (window.devicePixelRatio || 1), pos.y / (window.devicePixelRatio || 1))
  }, [])

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!drawing.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    ctx.lineTo(pos.x / dpr, pos.y / dpr)
    ctx.stroke()
    lastPos.current = pos
  }, [])

  const endDraw = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false
    saveSignature()
  }, [saveSignature])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e: MouseEvent) => startDraw(getPos(e, canvas))
    const onMouseMove = (e: MouseEvent) => draw(getPos(e, canvas))
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); startDraw(getPos(e.touches[0], canvas)) }
    const onTouchMove  = (e: TouchEvent) => { e.preventDefault(); draw(getPos(e.touches[0], canvas)) }

    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mouseup',    endDraw)
    canvas.addEventListener('mouseleave', endDraw)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   endDraw)

    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mouseup',    endDraw)
      canvas.removeEventListener('mouseleave', endDraw)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   endDraw)
    }
  }, [startDraw, draw, endDraw])

  function clear() {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setState('empty')
    onSave(null)
  }

  const borderColor = state === 'drawing' ? '#f59e0b' : state === 'saved' ? '#22c55e' : '#cbd5e1'

  return (
    <div className="space-y-2">
      {label && <label className="form-label">{label}</label>}
      <div style={{ border: `2px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color .2s', background: '#fff' }}>
        {state === 'saved' && savedSignature ? (
          <div className="relative" style={{ height: 140 }}>
            <img src={savedSignature} alt="Firma" className="w-full h-full object-contain" />
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none' }} />
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {state === 'saved'
            ? <span className="flex items-center gap-1 text-green-600"><Check size={12} /> Firma registrada</span>
            : (sublabel ?? 'Firme dentro del recuadro con el dedo o el mouse')}
        </p>
        {(state === 'saved' || state === 'drawing') && (
          <button type="button" onClick={clear} className="btn-ghost btn-sm text-slate-400 flex items-center gap-1">
            <RotateCcw size={12} /> Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
