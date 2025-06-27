'use client'

import { useState, useRef, useEffect } from 'react'

type DelayKnobProps = {
  value: number // 0 - 1
  onChange: (val: number) => void
}

type KnobElement = HTMLDivElement & { _lastY?: number }

export default function DelayKnob({ value, onChange }: DelayKnobProps) {
  const knobRef = useRef<KnobElement | null>(null)
  const [dragging, setDragging] = useState(false)

  // Mouse support
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      e.preventDefault()
      const delta = -e.movementY || 0
      const newVal = Math.min(1, Math.max(0, value + delta * 0.005))
      onChange(parseFloat(newVal.toFixed(2)))
    }
    const stop = () => setDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stop)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stop)
    }
  }, [dragging, value, onChange])

  // Touch support
  const handleTouchStart = () => setDragging(true)

  const handleTouchMove = (e: TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return
    const touch = e.touches[0]
    const knob = knobRef.current
    const lastY = knob?._lastY ?? touch.clientY
    const delta = lastY - touch.clientY
    const newVal = Math.min(1, Math.max(0, value + delta * 0.005))
    onChange(parseFloat(newVal.toFixed(2)))
    if (knob) knob._lastY = touch.clientY
  }

  const handleTouchEnd = () => {
    setDragging(false)
    if (knobRef.current) knobRef.current._lastY = undefined
  }

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  })

  const angle = -135 + value * 270

  return (
    <div className="flex flex-col items-center text-xs text-white select-none">
      <span className="mb-1">DELAY</span>
      <div
        ref={knobRef}
        onMouseDown={() => setDragging(true)}
        onTouchStart={handleTouchStart}
        className="w-8 h-8 rounded-full bg-gray-700 border border-white flex items-center justify-center relative cursor-pointer"
        style={{ transform: `rotate(0deg)` }}
      >
        <div
          className="absolute w-1 h-3 bg-white rounded"
          style={{ transform: `rotate(${angle}deg) translateY(-10px)` }}
        />
      </div>
    </div>
  )
}
