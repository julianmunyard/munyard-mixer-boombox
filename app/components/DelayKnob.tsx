'use client'

import { useState, useRef, useEffect } from 'react'

interface DelayKnobProps {
  value: number
  onChange: (value: number) => void
}

export default function DelayKnob({ value, onChange }: DelayKnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const startValue = useRef(0)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    startY.current = e.clientY
    startValue.current = value
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return
    const delta = startY.current - e.clientY
    let newValue = startValue.current + delta * 0.005
    newValue = Math.max(0, Math.min(1, newValue))
    onChange(newValue)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const rotation = value * 270 - 135

  return (
    <div
      onPointerDown={handlePointerDown}
      className="w-12 h-12 rounded-full bg-gray-800 border border-white flex items-center justify-center cursor-pointer"
      style={{ touchAction: 'none', transform: `rotate(${rotation}deg)` }}
    >
      <div className="w-1 h-4 bg-white rounded-sm" />
    </div>
  )
}
