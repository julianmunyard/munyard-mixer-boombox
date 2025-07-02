'use client';

import { useEffect, useRef, useState } from 'react';

const STEMS = [
  { name: 'Drums', file: '/stems/millionaire/DRUMS.mp3' },
  { name: 'Bass', file: '/stems/millionaire/BASS.mp3' },
  { name: 'Guitar', file: '/stems/millionaire/GUITARS.mp3' },
  { name: 'Synths', file: '/stems/millionaire/SYNTHS.mp3' },
  { name: 'Vocals', file: '/stems/millionaire/VOCALS.mp3' },
];

const FADER_POSITIONS = [
  { x: 551, y: 650 },
  { x: 646, y: 652 },
  { x: 732, y: 650 },
  { x: 820, y: 650 },
  { x: 915, y: 650 },
];

const SOLO_POSITIONS = [
  { x: 527, y: 470 },
  { x: 622, y: 470 },
  { x: 708, y: 472 },
  { x: 797, y: 473 },
  { x: 893, y: 474 },
];

const MUTE_POSITIONS = [
  { x: 526, y: 527 },
  { x: 621, y: 527 },
  { x: 708, y: 527 },
  { x: 797, y: 527 },
  { x: 892, y: 527 },
];

const FADER_TRAVEL = 45;

export default function Home() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stemRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const gainNodes = useRef<GainNode[]>([]);
  const faderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [volumes, setVolumes] = useState<number[]>(Array(STEMS.length).fill(1));
  const [isMuted, setIsMuted] = useState<boolean[]>(Array(STEMS.length).fill(false));
  const [isSoloed, setIsSoloed] = useState<boolean[]>(Array(STEMS.length).fill(false));

  useEffect(() => {
    audioCtxRef.current = new AudioContext();
    STEMS.forEach((stem, i) => {
      const audio = new Audio(stem.file);
      audio.loop = true;
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      const source = audioCtxRef.current!.createMediaElementSource(audio);
      const gain = audioCtxRef.current!.createGain();
      gain.gain.value = 1;
      source.connect(gain).connect(audioCtxRef.current!.destination);
      gainNodes.current[i] = gain;
      stemRefs.current[i] = audio;
    });
  }, []);

  useEffect(() => {
    const soloActive = isSoloed.some((s) => s);
    STEMS.forEach((_, i) => {
      const gain = gainNodes.current[i];
      if (!gain) return;
      gain.gain.value = soloActive
        ? isSoloed[i] ? volumes[i] : 0
        : isMuted[i] ? 0 : volumes[i];
    });
  }, [volumes, isMuted, isSoloed]);

  const toggleMute = (i: number) => {
    setIsMuted((prev) => {
      const copy = [...prev];
      copy[i] = !copy[i];
      return copy;
    });
  };

  const toggleSolo = (i: number) => {
    setIsSoloed((prev) => {
      const copy = [...prev];
      copy[i] = !copy[i];
      return copy;
    });
  };

  useEffect(() => {
    faderRefs.current.forEach((el, i) => {
      if (!el) return;

      const startDrag = (startY: number, startVolume: number, clientYGetter: (e: any) => number) => {
        const moveHandler = (e: any) => {
          const deltaY = clientYGetter(e) - startY;
          const DRAG_RESISTANCE = 100;
          const newVolume = Math.max(0, Math.min(1, startVolume - deltaY / DRAG_RESISTANCE));
          setVolumes((prev) => {
            const updated = [...prev];
            updated[i] = newVolume;
            return updated;
          });
        };

        const endHandler = () => {
          window.removeEventListener('mousemove', moveHandler);
          window.removeEventListener('mouseup', endHandler);
          window.removeEventListener('touchmove', moveHandler);
          window.removeEventListener('touchend', endHandler);
        };

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchmove', moveHandler);
        window.addEventListener('touchend', endHandler);
      };

      const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        startDrag(e.clientY, volumes[i], (ev) => ev.clientY);
      };

      const handleTouchStart = (e: TouchEvent) => {
        const touch = e.touches[0];
        if (!touch) return;
        startDrag(touch.clientY, volumes[i], (ev) => ev.touches[0].clientY);
      };

      el.addEventListener('mousedown', handleMouseDown);
      el.addEventListener('touchstart', handleTouchStart);

      return () => {
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('touchstart', handleTouchStart);
      };
    });
  }, [volumes]);

  const playAll = () => {
    if (!audioCtxRef.current) return;
    audioCtxRef.current.resume().then(() => {
      stemRefs.current.forEach((audio, i) => {
        if (audio) {
          audio.play().catch((err) => console.warn(`Stem ${i} failed to play:`, err));
        }
      });
    });
  };

  const stopAll = () => {
    stemRefs.current.forEach((audio) => {
      if (audio) audio.pause();
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black flex-col touch-none">
      <div
        className="relative"
        style={{
          width: '1536px',
          height: '1024px',
          position: 'relative',
          imageRendering: 'pixelated',
        }}
      >
        <img
          src="/boom-box.png"
          alt="boombox"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />

        {/* FADERS */}
        {STEMS.map((_, i) => {
          const { x, y } = FADER_POSITIONS[i];
          return (
            <div
              key={`fader-${i}`}
              ref={(el: HTMLDivElement | null) => {
  faderRefs.current[i] = el;
}}
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
            >
              <img
                src={`/fader-button-${i + 1}.png`}
                alt={`fader ${i + 1}`}
                style={{
                  transform: `translateY(${(1 - volumes[i]) * FADER_TRAVEL * 2}px)`,
                  transition: 'transform 0.05s linear',
                  userSelect: 'none',
                }}
                draggable={false}
              />
            </div>
          );
        })}

        {/* SOLO BUTTONS */}
        {SOLO_POSITIONS.map(({ x, y }, i) => (
          <img
            key={`solo-${i}`}
            src={`/solo-button-${i + 1}.png`}
            alt={`solo ${i + 1}`}
            onClick={() => toggleSolo(i)}
            className={`${isSoloed[i] ? 'flash-solo pressed' : ''}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.1s ease-in-out',
            }}
            draggable={false}
          />
        ))}

        {/* MUTE BUTTONS */}
        {MUTE_POSITIONS.map(({ x, y }, i) => (
          <img
            key={`mute-${i}`}
            src={`/mute-button-${i + 1}.png`}
            alt={`mute ${i + 1}`}
            onClick={() => toggleMute(i)}
            className={isMuted[i] ? 'pressed' : ''}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.1s ease-in-out',
            }}
            draggable={false}
          />
        ))}
      </div>

      <div className="mt-8 flex gap-8">
        <button
          onClick={playAll}
          className="bg-white text-black px-6 py-3 text-xl font-[Village] tracking-wide"
        >
          PLAY
        </button>
        <button
          onClick={stopAll}
          className="bg-white text-black px-6 py-3 text-xl font-[Village] tracking-wide"
        >
          STOP
        </button>
      </div>
    </div>
  );
}
