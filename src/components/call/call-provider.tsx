"use client";

import * as React from "react";
import {
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  ChevronDown,
  SwitchCamera,
  MonitorUp,
  MonitorOff,
  Disc,
  Volume2,
  VolumeX,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

import {
  answerCall,
  endCall,
  pollCall,
  pollIncomingCall,
  reactToCall,
  sendCallSignal,
  startCall,
  type CallPeer,
} from "@/actions/call";
import { sendMessage } from "@/actions/message";
import { uploadFile } from "@/lib/upload";
import { useT } from "@/hooks/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type CallKind = "video" | "audio";
export type CallPhase = "idle" | "outgoing" | "incoming" | "active" | "ended";
type EndReason = "ended" | "declined" | "missed";

export type FloatingReaction = { id: string; emoji: string; x: number };

type CallContextValue = {
  phase: CallPhase;
  peer: CallPeer | null;
  kind: CallKind;
  isCaller: boolean;
  minimized: boolean;
  speakerOn: boolean;
  screenSharing: boolean;
  callRecording: boolean;
  /** Start a call. Peer info is used for the UI while the call is set up. */
  startCallWith: (
    conversationId: string,
    peer: CallPeer,
    kind?: CallKind
  ) => Promise<void>;
  acceptIncoming: () => void;
  declineIncoming: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleMinimized: () => void;
  toggleSpeaker: () => void;
  toggleScreenShare: () => void;
  toggleCallRecording: () => void;
  flipCamera: () => void;
  sendReaction: (emoji: string) => void;
};

const CallContext = React.createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = React.useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within <CallProvider>");
  return ctx;
}

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👏", "🔥"] as const;

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Re-renders once per second while `active`; 0 until the first tick. */
function useNow(active: boolean) {
  const [now, setNow] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const immediate = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(timer);
    };
  }, [active]);
  return now;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [phase, setPhase] = React.useState<CallPhase>("idle");
  const [callId, setCallId] = React.useState<string | null>(null);
  const [peer, setPeer] = React.useState<CallPeer | null>(null);
  const [kind, setKind] = React.useState<CallKind>("video");
  const [isCaller, setIsCaller] = React.useState(true);
  const [minimized, setMinimized] = React.useState(false);
  const [screenSharing, setScreenSharing] = React.useState(false);
  const [callRecording, setCallRecording] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [cameraOff, setCameraOff] = React.useState(false);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">(
    "user"
  );
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [endReason, setEndReason] = React.useState<EndReason>("ended");
  const [reactions, setReactions] = React.useState<FloatingReaction[]>([]);

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);
  const screenShareRef = React.useRef<{ track: MediaStreamTrack } | null>(null);
  const callRecorderRef = React.useRef<MediaRecorder | null>(null);
  const callChunksRef = React.useRef<Blob[]>([]);
  const conversationRef = React.useRef<string | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const appliedSignalsRef = React.useRef(new Set<string>());
  const seenReactionsRef = React.useRef(new Set<string>());
  const meIdRef = React.useRef<string | null>(null);
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const phaseRef = React.useRef(phase);
  React.useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* ------------------------------------------ cleanup helpers ---------- */

  const stopLocalMedia = React.useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const closePeerConnection = React.useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    remoteStreamRef.current = null;
  }, []);

  const resetCall = React.useCallback(() => {
    closePeerConnection();
    stopLocalMedia();
    if (screenShareRef.current) {
      try {
        screenShareRef.current.track.stop();
      } catch {
        /* screen share may already be stopped */
      }
      screenShareRef.current = null;
    }
    if (
      callRecorderRef.current &&
      callRecorderRef.current.state !== "inactive"
    ) {
      callRecorderRef.current.onstop = null;
      try {
        callRecorderRef.current.stop();
      } catch {
        /* recorder already stopped */
      }
    }
    callRecorderRef.current = null;
    callChunksRef.current = [];
    setScreenSharing(false);
    setCallRecording(false);
    setCallId(null);
    setPeer(null);
    setStartedAt(null);
    setMuted(false);
    setCameraOff(false);
    setMinimized(false);
    setFacingMode("user");
    setReactions([]);
    appliedSignalsRef.current.clear();
    seenReactionsRef.current.clear();
    setPhase("idle");
  }, [closePeerConnection, stopLocalMedia]);

  const finishWithReason = React.useCallback(
    (reason: EndReason) => {
      closePeerConnection();
      stopLocalMedia();
      setEndReason(reason);
      setPhase("ended");
      window.setTimeout(() => resetCall(), 2600);
    },
    [closePeerConnection, stopLocalMedia, resetCall]
  );

  /* ------------------------------------------- media & peer conn ------ */

  const acquireMedia = React.useCallback(
    async (wanted: CallKind): Promise<MediaStream | null> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        void 0;
        return null;
      }
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: wanted === "video" ? { facingMode: "user" } : false,
          audio: true,
        });
      } catch {
        if (wanted === "video") {
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            toast.warning(t("Kamera topilmadi. Faqat audio bilan davom etiladi."));
            return audioOnly;
          } catch {
            void 0;
            return null;
          }
        }
        void 0;
        return null;
      }
    },
    [t]
  );

  const createPeerConnection = React.useCallback(
    (forCallId: string) => {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendCallSignal(
            forCallId,
            "ice",
            JSON.stringify(event.candidate)
          );
        }
      };
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" && phaseRef.current === "active") {
          void 0;
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [t]
  );

  const attachStreamToPc = React.useCallback(
    (pc: RTCPeerConnection, stream: MediaStream) => {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    },
    []
  );

  /* ------------------------------------------------ start / answer ---- */

  const startCallWith = React.useCallback(
    async (conversationId: string, target: CallPeer, callKind: CallKind = "video") => {
      if (phaseRef.current !== "idle") {
        void 0;
        return;
      }
      const res = await startCall(conversationId, target.id, callKind);
      if (!res.ok) {
        void 0;
        return;
      }
      const id = res.callId;
      conversationRef.current = conversationId;
      setPeer(target);
      setKind(callKind);
      setIsCaller(true);
      setCallId(id);

      const stream = await acquireMedia(callKind);
      if (!stream) {
        await endCall(id);
        resetCall();
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(id);
      attachStreamToPc(pc, stream);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendCallSignal(id, "offer", JSON.stringify(pc.localDescription));
        setPhase("outgoing");
      } catch {
        void 0;
        await endCall(id);
        resetCall();
      }
    },
    [acquireMedia, attachStreamToPc, createPeerConnection, resetCall, t]
  );

  const acceptIncoming = React.useCallback(async () => {
    const id = callId;
    if (!id) return;
    setIsCaller(false);

    const stream = await acquireMedia(kind);
    if (!stream) {
      await answerCall(id, false);
      resetCall();
      return;
    }
    localStreamRef.current = stream;
    setLocalStream(stream);

    const pc = createPeerConnection(id);
    attachStreamToPc(pc, stream);

    const res = await answerCall(id, true);
    if (!res.ok) {
      void 0;
      resetCall();
      return;
    }
    // Offer is already in the DB (caller sent it); the polling loop applies it.
    setPhase("active");
  }, [acquireMedia, attachStreamToPc, callId, createPeerConnection, kind, resetCall]);

  const declineIncoming = React.useCallback(() => {
    const id = callId;
    if (id) void answerCall(id, false);
    resetCall();
  }, [callId, resetCall]);

  const hangUp = React.useCallback(() => {
    const id = callId;
    if (id) void endCall(id);
    finishWithReason("ended");
  }, [callId, finishWithReason]);

  /* ---------------------------------------------------- reactions ----- */

  const pushReaction = React.useCallback((emoji: string, id?: string) => {
    const rid = id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const x = 12 + Math.random() * 66; // % from the left edge
    setReactions((prev) => [...prev.slice(-5), { id: rid, emoji, x }]);
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== rid));
    }, 2700);
  }, []);

  const sendReaction = React.useCallback(
    (emoji: string) => {
      if (phase !== "active" || !callId) return;
      pushReaction(emoji);
      void reactToCall(callId, emoji);
    },
    [callId, phase, pushReaction]
  );

  /* ----------------------------------------------------- toggling ----- */

  const toggleMute = React.useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = !next));
      return next;
    });
  }, []);

  const toggleCamera = React.useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      localStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => (track.enabled = !next));
      return next;
    });
  }, []);

  const toggleMinimized = React.useCallback(() => {
    setMinimized((prev) => !prev);
  }, []);

  /** Switches between front and rear camera (video calls only). */
  const flipCamera = React.useCallback(async () => {
    if (!localStreamRef.current) return;
    const next = facingMode === "user" ? "environment" : "user";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next },
        audio: false,
      });
      const newTrack = stream.getVideoTracks()[0];
      if (!newTrack) {
        void 0;
        return;
      }
      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      if (pcRef.current) {
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track?.kind === "video");
        await sender?.replaceTrack(newTrack);
      }
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current.addTrack(newTrack);
      // Rebind so the <video> picks up the new track.
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(next);
    } catch {
      void 0;
    }
  }, [facingMode, t]);

  /** Shares the screen instead of the camera (video calls). */
  const toggleScreenShare = React.useCallback(async () => {
    if (screenShareRef.current) {
      const { track } = screenShareRef.current;
      track.stop();
      screenShareRef.current = null;
      const cam = localStreamRef.current?.getVideoTracks()[0];
      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender && cam) await sender.replaceTrack(cam);
      if (cam) cam.enabled = true;
      setScreenSharing(false);
      if (localStreamRef.current) {
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      return;
    }
    if (kind !== "video") return;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const track = display.getVideoTracks()[0];
      if (!track) {
        display.getTracks().forEach((t2) => t2.stop());
        return;
      }
      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      const camTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
      if (sender) await sender.replaceTrack(track);
      track.onended = () => {
        void toggleScreenShare();
      };
      screenShareRef.current = { track };
      if (camTrack) camTrack.enabled = false;
      setScreenSharing(true);
      if (localStreamRef.current) {
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch {
      /* user dismissed the picker */
    }
  }, [kind]);

  /** Records the remote audio and sends it to the chat when stopped. */
  const toggleCallRecording = React.useCallback(async () => {
    if (callRecorderRef.current && callRecorderRef.current.state !== "inactive") {
      callRecorderRef.current.stop();
      return;
    }
    const stream = remoteStreamRef.current;
    if (!stream || stream.getAudioTracks().length === 0) {
      void 0;
      return;
    }
    try {
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined
      );
      callChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) callChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        callRecorderRef.current = null;
        setCallRecording(false);
        const blob = new Blob(callChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        callChunksRef.current = [];
        if (blob.size < 1000) {
          void 0;
          return;
        }
        const file = new File([blob], `qongiroq-${Date.now()}.webm`, {
          type: blob.type,
        });
        void (async () => {
          try {
            const media = await uploadFile(file);
            const convId = conversationRef.current;
            if (convId) {
              await sendMessage(
                convId,
                t("🎙 Qo'ng'iroq yozuvi"),
                media.url,
                "audio"
              );
              toast.success(t("Yozuv chatga yuborildi"));
            }
          } catch {
            void 0;
          }
        })();
      };
      recorder.start(1000);
      callRecorderRef.current = recorder;
      setCallRecording(true);
      toast.success(t("Qo'ng'iroq yozilmoqda — yozuv chatga yuboriladi"));
    } catch {
      void 0;
    }
  }, [t]);

  /** Routes call audio to the loudspeaker where the browser allows it. */
  const [speakerOn, setSpeakerOn] = React.useState(false);
  const toggleSpeaker = React.useCallback(async () => {
    const el = remoteVideoRef.current as
      | (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> })
      | null;
    if (!el || typeof el.setSinkId !== "function") {
      void 0;
      return;
    }
    try {
      await el.setSinkId(speakerOn ? "default" : "communications");
      setSpeakerOn((prev) => !prev);
    } catch {
      void 0;
    }
  }, [speakerOn, t]);

  /* ------------------------------------------- video element binding -- */

  React.useEffect(() => {
    if (localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  React.useEffect(() => {
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /* ------------------------------------------------ polling loops ----- */

  // Idle: watch for incoming calls.
  React.useEffect(() => {
    if (phase !== "idle") return;
    let cancelled = false;
    const tick = async () => {
      const incoming = await pollIncomingCall();
      if (cancelled || !incoming) return;
      setCallId(incoming.id);
      setPeer(incoming.caller);
      setKind(incoming.kind);
      setIsCaller(false);
      setPhase("incoming");
      try {
        navigator.vibrate?.([250, 120, 250]);
      } catch {
        /* vibration not supported */
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [phase]);

  // In-call: poll snapshot, apply signals, watch reactions & status.
  React.useEffect(() => {
    if (phase !== "outgoing" && phase !== "active") return;
    if (!callId) return;
    let cancelled = false;

    const tick = async () => {
      const snap = await pollCall(callId);
      if (cancelled || !snap) return;

      if (snap.startedAt && !startedAt) {
        setStartedAt(new Date(snap.startedAt).getTime());
      }
      if (snap.conversationId) {
        conversationRef.current = snap.conversationId;
      }
      meIdRef.current = snap.isCaller ? snap.callerId : snap.calleeId;

      if (snap.status === "declined") {
        finishWithReason("declined");
        return;
      }
      if (snap.status === "missed") {
        finishWithReason("missed");
        return;
      }
      if (snap.status === "ended") {
        finishWithReason("ended");
        return;
      }
      if (snap.status === "active" && phase === "outgoing") {
        setPhase("active");
      }

      const pc = pcRef.current;
      for (const signal of snap.signals) {
        if (appliedSignalsRef.current.has(signal.id)) continue;
        if (signal.senderId === meIdRef.current) {
          appliedSignalsRef.current.add(signal.id);
          continue;
        }
        try {
          const payload = JSON.parse(signal.payload);
          if (signal.type === "offer" && pc) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload)
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendCallSignal(
              snap.id,
              "answer",
              JSON.stringify(pc.localDescription)
            );
          } else if (signal.type === "answer" && pc) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload)
            );
          } else if (signal.type === "ice" && pc) {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          }
          appliedSignalsRef.current.add(signal.id);
        } catch {
          // A malformed candidate should never kill the whole call.
          appliedSignalsRef.current.add(signal.id);
        }
      }

      for (const reaction of snap.reactions) {
        if (seenReactionsRef.current.has(reaction.id)) continue;
        seenReactionsRef.current.add(reaction.id);
        if (reaction.userId !== meIdRef.current) {
          pushReaction(reaction.emoji, reaction.id);
        }
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [phase, callId, startedAt, finishWithReason, pushReaction]);

  const now = useNow(phase === "active");

  const value: CallContextValue = {
    phase,
    peer,
    kind,
    isCaller,
    minimized,
    speakerOn,
    screenSharing,
    callRecording,
    startCallWith,
    acceptIncoming,
    declineIncoming,
    hangUp,
    toggleMute,
    toggleCamera,
    toggleMinimized,
    toggleSpeaker: () => void toggleSpeaker(),
    toggleScreenShare: () => void toggleScreenShare(),
    toggleCallRecording: () => void toggleCallRecording(),
    flipCamera: () => void flipCamera(),
    sendReaction,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay
        phase={phase}
        peer={peer}
        kind={kind}
        localStream={localStream}
        remoteStream={remoteStream}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        muted={muted}
        cameraOff={cameraOff}
        minimized={minimized}
        speakerOn={speakerOn}
        screenSharing={screenSharing}
        callRecording={callRecording}
        startedAt={startedAt}
        now={now}
        reactions={reactions}
        endReason={endReason}
        onAccept={() => void acceptIncoming()}
        onDecline={declineIncoming}
        onHangUp={hangUp}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleMinimized={toggleMinimized}
        onToggleSpeaker={() => void toggleSpeaker()}
        onToggleScreenShare={() => void toggleScreenShare()}
        onToggleCallRecording={() => void toggleCallRecording()}
        onFlipCamera={() => void flipCamera()}
        onReact={sendReaction}
      />
    </CallContext.Provider>
  );
}

/* ====================================================================== */
/* Overlay UI                                                              */
/* ====================================================================== */

function CallOverlay({
  phase,
  peer,
  kind,
  localStream,
  remoteStream,
  localVideoRef,
  remoteVideoRef,
  muted,
  cameraOff,
  minimized,
  speakerOn,
  screenSharing,
  callRecording,
  startedAt,
  now,
  reactions,
  endReason,
  onAccept,
  onDecline,
  onHangUp,
  onToggleMute,
  onToggleCamera,
  onToggleMinimized,
  onToggleSpeaker,
  onToggleScreenShare,
  onToggleCallRecording,
  onFlipCamera,
  onReact,
}: {
  phase: CallPhase;
  peer: CallPeer | null;
  kind: CallKind;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  muted: boolean;
  cameraOff: boolean;
  minimized: boolean;
  speakerOn: boolean;
  screenSharing: boolean;
  callRecording: boolean;
  startedAt: number | null;
  now: number;
  reactions: FloatingReaction[];
  endReason: EndReason;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleMinimized: () => void;
  onToggleSpeaker: () => void;
  onToggleScreenShare: () => void;
  onToggleCallRecording: () => void;
  onFlipCamera: () => void;
  onReact: (emoji: string) => void;
}) {
  const t = useT();
  if (phase === "idle") return null;

  const name = peer?.username ?? peer?.name ?? t("Foydalanuvchi");
  const initials = (peer?.name ?? peer?.username ?? "?")
    .slice(0, 2)
    .toUpperCase();

  const elapsed =
    startedAt != null && now > 0
      ? Math.max(0, Math.floor((now - startedAt) / 1000))
      : 0;

  /* ---- Incoming call ---- */
  if (phase === "incoming") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 px-6 py-10 text-white">
        <div className="flex flex-col items-center gap-1 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
            {kind === "video" ? t("Video qo'ng'iroq") : t("Audio qo'ng'iroq")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{name}</h2>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-call-ring" />
            <Avatar className="relative h-36 w-36 ring-4 ring-white/20">
              <AvatarImage src={peer?.image ?? undefined} alt={name} />
              <AvatarFallback className="text-4xl font-black">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="animate-pulse text-sm font-medium text-white/80">
            {t("Qo'ng'iroq qilinmoqda…")}
          </p>
        </div>

        <div className="flex items-center gap-16">
          <button
            onClick={onDecline}
            aria-label={t("Qo'ng'iroqni rad etish")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 transition-transform hover:scale-110 active:scale-95"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
          <button
            onClick={onAccept}
            aria-label={t("Qo'ng'iroqqa javob berish")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110 active:scale-95 animate-call-ring"
          >
            {kind === "video" ? (
              <Video className="h-7 w-7" />
            ) : (
              <Phone className="h-7 w-7" />
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ---- Outgoing call ---- */
  if (phase === "outgoing") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 px-6 py-10 text-white">
        <div className="flex flex-col items-center gap-1 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
            {kind === "video" ? t("Video qo'ng'iroq") : t("Audio qo'ng'iroq")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{name}</h2>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-sky-500/20 animate-call-ring" />
            <Avatar className="relative h-36 w-36 ring-4 ring-white/20">
              <AvatarImage src={peer?.image ?? undefined} alt={name} />
              <AvatarFallback className="text-4xl font-black">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="animate-pulse text-sm font-medium text-white/80">
            {t("Qo'ng'iroq qilinmoqda…")}
          </p>
        </div>

        <button
          onClick={onHangUp}
          aria-label={t("Qo'ng'iroqni tugatish")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 transition-transform hover:scale-110 active:scale-95"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>
    );
  }

  /* ---- Ended ---- */
  if (phase === "ended") {
    const message =
      endReason === "declined"
        ? t("Qo'ng'iroq rad etildi")
        : endReason === "missed"
          ? t("Javob berilmadi")
          : t("Qo'ng'iroq tugadi");
    return (
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-white">
          <PhoneOff className="h-10 w-10 text-white/70" />
          <p className="text-lg font-semibold">{message}</p>
        </div>
      </div>
    );
  }

  /* ---- Active / connecting ---- */
  const remoteHasVideo = remoteStream?.getVideoTracks().some((t) => t.enabled);
  const localHasVideo = localStream?.getVideoTracks().some((t) => t.enabled);

  const showRemoteVideo =
    kind === "video" && !!remoteStream && !minimized;

  return (
    <div
      className={cn(
        minimized
          ? "contents"
          : "fixed inset-0 z-[100] overflow-hidden bg-black text-white"
      )}
    >
      {/* Single remote video element, always mounted while the call lives */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={
          showRemoteVideo
            ? "absolute inset-0 h-full w-full object-cover"
            : "hidden"
        }
      />

      {minimized ? (
        /* Floating pill — the page underneath stays usable (Instagram/WhatsApp style) */
        <button
          onClick={onToggleMinimized}
          aria-label={t("Qo'ng'iroqni kengaytirish")}
          className="fixed bottom-24 end-3 z-[100] flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-slate-950/90 py-2 pe-3 ps-2 text-white shadow-2xl backdrop-blur transition-transform hover:scale-[1.03] active:scale-95 sm:bottom-5 sm:end-4"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/25" />
            <Avatar className="relative h-10 w-10">
              <AvatarImage src={peer?.image ?? undefined} alt={name} />
              <AvatarFallback className="text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </span>
          <span className="min-w-0 text-left">
            <span className="block max-w-[120px] truncate text-xs font-semibold">
              {name}
            </span>
            <span className="block text-[11px] tabular-nums leading-4 text-emerald-400">
              {startedAt != null ? formatDuration(elapsed) : t("Ulanmoqda…")}
            </span>
          </span>
          <Maximize2 className="h-4 w-4 shrink-0 text-white/70" />
        </button>
      ) : (
        <>
          {/* Placeholder while the remote camera is off or connecting */}
          {!showRemoteVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-indigo-950">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 ring-4 ring-white/10">
                  <AvatarImage src={peer?.image ?? undefined} alt={name} />
                  <AvatarFallback className="text-4xl font-black">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <p className="text-lg font-semibold">{name}</p>
                <p className="text-xs text-white/60">
                  {t("Kamera o'chirilgan")}
                </p>
              </div>
            </div>
          )}

          {/* Top gradient bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent px-4 pb-12 pt-4">
            <div>
              <p className="text-base font-bold leading-tight">{name}</p>
              <p className="text-xs tabular-nums text-white/75">
                {startedAt != null ? formatDuration(elapsed) : t("Ulanmoqda…")}
              </p>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              {remoteHasVideo && (
                <span className="rounded-full bg-red-600/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
                  {t("JONLI")}
                </span>
              )}
              <button
                onClick={onToggleMinimized}
                aria-label={t("Qo'ng'iroqni kichraytirish")}
                className="rounded-full bg-black/40 p-2 backdrop-blur transition-colors hover:bg-black/60"
              >
                <ChevronDown className="h-6 w-6" />
              </button>
            </div>
          </div>

      {/* Local video PiP */}
      {kind === "video" && localStream && (
        <div className="absolute right-4 top-16 h-36 w-24 overflow-hidden rounded-2xl border border-white/25 bg-slate-800 shadow-xl sm:h-44 sm:w-32">
          {localHasVideo ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-white/60">
              {t("Kamera o'chirilgan")}
            </div>
          )}
        </div>
      )}

      {/* Floating emoji reactions */}
      <div className="pointer-events-none absolute inset-x-0 bottom-40 top-0">
        {reactions.map((reaction) => (
          <span
            key={reaction.id}
            className="animate-call-emoji absolute bottom-0 text-4xl"
            style={{ left: `${reaction.x}%` }}
          >
            {reaction.emoji}
          </span>
        ))}
      </div>

      {/* Bottom control cluster */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-10">
        {/* Emoji reaction bar */}
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              aria-label={emoji}
              className="text-xl transition-transform hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-4">
          {kind === "video" && (
            <button
              onClick={onFlipCamera}
              aria-label={t("Kamerani aylantirish")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/25 sm:h-14 sm:w-14"
            >
              <SwitchCamera className="h-6 w-6" />
            </button>
          )}

          <button
            onClick={onToggleSpeaker}
            aria-pressed={speakerOn}
            aria-label={speakerOn ? t("Spikerni o'chirish") : t("Spiker")}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition-colors sm:h-14 sm:w-14",
              speakerOn ? "bg-white text-black" : "bg-white/15 hover:bg-white/25"
            )}
          >
            {speakerOn ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </button>

          <button
            onClick={onToggleMute}
            aria-label={muted ? t("Ovozni yoqish") : t("Ovozni o'chirish")}
            aria-pressed={muted}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full backdrop-blur transition-colors sm:h-16 sm:w-16",
              muted ? "bg-white text-black" : "bg-white/15 hover:bg-white/25"
            )}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          <button
            onClick={onHangUp}
            aria-label={t("Qo'ng'iroqni tugatish")}
            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-600/40 transition-transform hover:scale-105 active:scale-95"
          >
            <PhoneOff className="h-8 w-8" />
          </button>

          {kind === "video" && (
            <button
              onClick={onToggleCamera}
              aria-label={cameraOff ? t("Kamerani yoqish") : t("Kamerani o'chirish")}
              aria-pressed={cameraOff}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition-colors sm:h-14 sm:w-14",
                cameraOff ? "bg-white text-black" : "bg-white/15 hover:bg-white/25"
              )}
            >
              {cameraOff ? (
                <VideoOff className="h-6 w-6" />
              ) : (
                <Video className="h-6 w-6" />
              )}
            </button>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
