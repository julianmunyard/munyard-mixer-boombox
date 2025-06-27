'use client'

import { useEffect, useRef, useState, ChangeEvent } from 'react'
import DelayKnob from './components/DelayKnob'

type Stem = {
  label: string
  file: string
}

const stems: Stem[] = [
  { label: 'DRUMS', file: 'DRUMS.mp3' },
  { label: 'SYNTHS', file: 'SYNTHS.mp3' },
  { label: 'GUITARS', file: 'GUITARS.mp3' },
  { label: 'BASS', file: 'BASS.mp3' },
  { label: 'VOCALS', file: 'VOCALS.mp3' },
]

export default function Home() {
  const [volumes, setVolumes] = useState<Record<string, number>>(Object.fromEntries(stems.map(s => [s.label, 1])))
  const [delays, setDelays] = useState<Record<string, number>>(Object.fromEntries(stems.map(s => [s.label, 0])))
  const [mutes, setMutes] = useState<Record<string, boolean>>(Object.fromEntries(stems.map(s => [s.label, false])))
  const [solos, setSolos] = useState<Record<string, boolean>>(Object.fromEntries(stems.map(s => [s.label, false])))
  const [varispeed, setVarispeed] = useState(1)

  const delaysRef = useRef<Record<string, number>>({})
  const audioCtxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Record<string, AudioBuffer>>({})
  const nodesRef = useRef<Record<string, AudioWorkletNode>>({})
  const gainNodesRef = useRef<Record<string, GainNode>>({})
  const delayNodesRef = useRef<Record<string, DelayNode>>({})
  const feedbackGainsRef = useRef<Record<string, GainNode>>({})

  useEffect(() => {
    const init = async () => {
      const ctx = new AudioContext()
      await ctx.audioWorklet.addModule('/granular-processor.js')
      audioCtxRef.current = ctx

      const eighthNoteDelay = 60 / 120 / 2

      const loadStem = async (label: string, file: string) => {
        const res = await fetch(`/stems/millionaire/${file}`)
        const arrayBuffer = await res.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        buffersRef.current[label] = audioBuffer

        const gainNode = ctx.createGain()
        const delayNode = ctx.createDelay(5.0)
        const feedback = ctx.createGain()

        delayNode.delayTime.value = eighthNoteDelay
        feedback.gain.value = delaysRef.current[label] || 0

        delayNode.connect(feedback).connect(delayNode)
        delayNode.connect(gainNode)
        gainNode.connect(ctx.destination)

        gainNodesRef.current[label] = gainNode
        delayNodesRef.current[label] = delayNode
        feedbackGainsRef.current[label] = feedback
      }

      for (const { label, file } of stems) {
        delaysRef.current[label] = delays[label] || 0
        await loadStem(label, file)
      }
    }

    init()
  }, [])

  const stopAll = () => {
    Object.values(nodesRef.current).forEach((node) => {
      try {
        node.port.postMessage({ type: 'stop' })
        node.disconnect()
      } catch {}
    })
    nodesRef.current = {}
  }

  const playAll = async () => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume() // ✅ iOS Safari fix

    stopAll()

    stems.forEach(({ label }) => {
      const buffer = buffersRef.current[label]
      const gain = gainNodesRef.current[label]
      const delay = delayNodesRef.current[label]
      if (!buffer || !gain || !delay) return

      const node = new AudioWorkletNode(ctx, 'granular-player')
      node.port.postMessage({ type: 'load', buffer: buffer.getChannelData(0) })
      node.parameters.get('playbackRate')?.setValueAtTime(varispeed, ctx.currentTime)
      node.connect(delay)

      const soloed = Object.values(solos).some(Boolean)
      const shouldPlay = soloed ? solos[label] : !mutes[label]
      gain.gain.value = shouldPlay ? volumes[label] : 0

      nodesRef.current[label] = node
    })
  }

  const toggleMute = (label: string) => {
    setMutes((prev) => ({ ...prev, [label]: !prev[label] }))
    setSolos((prev) => ({ ...prev, [label]: false }))
  }

  const toggleSolo = (label: string) => {
    setSolos((prev) => ({ ...prev, [label]: !prev[label] }))
    setMutes((prev) => ({ ...prev, [label]: false }))
  }

  const unsoloAll = () => {
    setSolos(Object.fromEntries(stems.map(({ label }) => [label, false])))
    setMutes(Object.fromEntries(stems.map(({ label }) => [label, false])))
  }

  useEffect(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const eighthNoteDelay = 60 / 120 / 2

    stems.forEach(({ label }) => {
      const gain = gainNodesRef.current[label]
      const delay = delayNodesRef.current[label]
      const feedback = feedbackGainsRef.current[label]
      if (!gain || !delay || !feedback) return

      const soloed = Object.values(solos).some(Boolean)
      const shouldPlay = soloed ? solos[label] : !mutes[label]
      gain.gain.value = shouldPlay ? volumes[label] : 0

      delay.delayTime.value = eighthNoteDelay
      feedback.gain.setTargetAtTime(delays[label] || 0, ctx.currentTime, 2.5)
    })
  }, [volumes, mutes, solos, delays])

  useEffect(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return

    Object.values(nodesRef.current).forEach((node) => {
      node.parameters.get('playbackRate')?.setValueAtTime(varispeed, ctx.currentTime)
    })
  }, [varispeed])

  return (
    <main className="min-h-screen bg-[#FCFAEE] text-[#B8001F] p-8 font-sans relative">
      <h1 className="village text-center mb-10" style={{ fontSize: '96px', letterSpacing: '0.05em', lineHeight: '1.1' }}>
        Munyard Mixer
      </h1>

      <div className="flex gap-4 justify-center mb-8 flex-wrap">
        <button onClick={playAll} className="pressable bg-[#B30000] text-white px-6 py-2 font-mono tracking-wide">Play</button>
        <button onClick={stopAll} className="pressable bg-[#B30000] text-white px-6 py-2 font-mono tracking-wide">Stop</button>
        <button onClick={unsoloAll} className="pressable bg-[#B30000] text-white px-6 py-2 font-mono tracking-wide">UNSOLO</button>
      </div>

      <div className="flex justify-center">
        <div className="flex gap-6 flex-wrap">
          {stems.map((stem) => (
            <div key={stem.label} className="flex flex-col items-center rounded-lg border border-gray-700 bg-[#B30000] p-4 w-24 shadow-inner">
              <div className="w-4 h-10 bg-green-600 animate-pulse mb-4 rounded-sm" />
              <div className="flex flex-col items-center gap-2 text-sm text-white">
                <span className="mb-1">LEVEL</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volumes[stem.label]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setVolumes((prev) => ({ ...prev, [stem.label]: parseFloat(e.target.value) }))
                  }
                  className="w-1 h-36 appearance-none bg-transparent"
                  // @ts-expect-error vertical slider style not supported by TypeScript types
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
                />
              </div>

              <div className="my-2">
                <DelayKnob
                  value={delays[stem.label]}
                  onChange={(val) => {
                    setDelays((prev) => ({ ...prev, [stem.label]: val }))
                    delaysRef.current[stem.label] = val
                  }}
                />
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <button onClick={() => toggleMute(stem.label)} className={`px-2 py-1 text-xs rounded ${mutes[stem.label] ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>MUTE</button>
                <button onClick={() => toggleSolo(stem.label)} className={`px-2 py-1 text-xs rounded ${solos[stem.label] ? 'flash text-black' : 'bg-gray-700 text-white'}`}>SOLO</button>
                <div className="mt-4 px-2 py-1 text-xs text-white border border-gray-600 rounded bg-gray-800 tracking-wide">{stem.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-8 top-[300px] flex flex-col items-center">
        <span className="mb-2 text-sm text-red-700">VARISPEED</span>
        <div className="relative flex flex-col items-center border border-red-700 rounded-md px-4 py-3" style={{ height: '160px' }}>
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-2 h-[1px] bg-red-700" />
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.01"
            value={varispeed}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setVarispeed(parseFloat(e.target.value))
            }
            className="w-1 h-28 appearance-none bg-transparent z-10"
            // @ts-expect-error vertical slider style not supported by TypeScript types
            style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
          />
        </div>
      </div>
    </main>
  )
}
