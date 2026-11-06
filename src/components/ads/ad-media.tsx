"use client";

import * as React from "react";
import { Music2, Pause, Volume2, VolumeX } from "lucide-react";

import type { ActiveAd } from "@/lib/ads";
import { cn } from "@/lib/utils";

/**
 * Ad creative: image, video, or image with background music.
 * Sound always starts off so autoplay is never blocked; the user can turn it
 * on with the floating control.
 */
export function AdMedia({
  ad,
  reel = false,
}: {
  ad: ActiveAd;
  reel?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = React.useState(true);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  function toggleVideoSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  async function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  const controlClass = reel
    ? "absolute end-3 top-3 z-10"
    : "absolute end-3 top-3 z-10";

  if (ad.videoUrl) {
    return (
      <>
        <video
          ref={videoRef}
          src={ad.videoUrl}
          poster={ad.imageUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={toggleVideoSound}
          aria-label={muted ? "Ovozni yoqish" : "Ovozni o'chirish"}
          className={cn(
            controlClass,
            "flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition-colors hover:bg-black/70"
          )}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </>
    );
  }

  if (ad.imageUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="h-full w-full object-cover"
          loading={reel ? "eager" : "lazy"}
        />
        {ad.audioUrl && (
          <>
            <audio ref={audioRef} src={ad.audioUrl} loop preload="none" />
            <button
              type="button"
              onClick={toggleAudio}
              className={cn(
                controlClass,
                "flex h-9 max-w-[75%] items-center gap-1.5 rounded-full bg-black/55 px-3 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition-colors hover:bg-black/70"
              )}
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Music2 className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{ad.audioTitle ?? "Musiqa"}</span>
            </button>
          </>
        )}
      </>
    );
  }

  return null;
}
