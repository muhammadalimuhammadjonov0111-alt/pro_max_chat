"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";

/** Deterministic pseudo-random in [0, 1) from a seed and an index. */
function pseudoRandom(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 2654435761)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245) | 0;
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

/** Deterministic pseudo-random waveform from the message id + src. */
function useWaveform(id: string, src: string, bars = 26) {
  return React.useMemo(() => {
    let seed = 0;
    const key = id + src;
    for (let i = 0; i < key.length; i++) {
      seed = (Math.imul(seed, 31) + key.charCodeAt(i)) | 0;
    }
    return Array.from(
      { length: bars },
      (_, i) => 0.22 + pseudoRandom(seed || 1, i) * 0.78
    );
  }, [id, src, bars]);
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessagePlayer({
  src,
  mine,
  id,
}: {
  src: string;
  mine: boolean;
  id: string;
}) {
  const t = useT();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const bars = useWaveform(id, src);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
      audio.currentTime = 0;
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const progress = duration > 0 ? time / duration : 0;
  const playedBars = Math.round(progress * bars.length);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("To'xtatish") : t("Ijro etish")}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
          mine
            ? "bg-white/25 text-white hover:bg-white/35"
            : "bg-[#c13584] text-white hover:bg-[#a92e74]"
        )}
      >
        {playing ? (
          <Pause className="h-5 w-5" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play className="ml-0.5 h-5 w-5" fill="currentColor" strokeWidth={0} />
        )}
      </button>

      <div
        className="flex h-9 items-center gap-[2.5px]"
        aria-hidden="true"
      >
        {bars.map((level, i) => (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-colors duration-150",
              mine
                ? i < playedBars
                  ? "bg-white"
                  : "bg-white/40"
                : i < playedBars
                  ? "bg-[#c13584]"
                  : "bg-muted-foreground/30"
            )}
            style={{ height: `${Math.round(level * 100)}%` }}
          />
        ))}
      </div>

      <span
        className={cn(
          "w-8 shrink-0 text-right text-[11px] font-medium tabular-nums",
          mine ? "text-white/85" : "text-muted-foreground"
        )}
      >
        {formatTime(time || duration)}
      </span>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
