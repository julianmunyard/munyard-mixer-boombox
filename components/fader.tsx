'use client'

import { useEffect, useRef, useState } from 'react'

export default function Fader({ delay = 0 }: { delay?: number }) {
  const [position, setPosition] = useState(0)
  const direction = useRef(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => {
        let next = prev + direction.current * 1.5
        if (next > 100) {
          direction.current = -1
          next = 100
        } else if (next < 0) {
          direction.current = 1
          next = 0
        }
        return next
      })
    }, 30 + delay)

    return () => clearInterval(interval)
  }, [delay])

  return (
    <div className="relative h-[160px] w-[32px] overflow-hidden">
      <img
        src="/fader"
        alt="Fader"
        className="absolute left-0 w-full"
        style={{ transform: `translateY(${position}%)` }}
      />
    </div>
  )
}
