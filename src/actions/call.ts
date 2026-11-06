"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/** Ringing calls auto-expire after this long. */
const RING_TIMEOUT_MS = 45_000;
const MAX_SIGNAL_PAYLOAD = 16_000;
const MAX_SIGNAL_TYPES = new Set(["offer", "answer", "ice"]);
const MAX_EMOJI_LENGTH = 16;

export type CallPeer = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  isVerified: boolean;
  isBot: boolean;
};

export type CallSnapshot = {
  id: string;
  kind: "video" | "audio";
  status: "ringing" | "active" | "declined" | "missed" | "ended";
  callerId: string;
  calleeId: string;
  conversationId: string | null;
  peer: CallPeer;
  isCaller: boolean;
  startedAt: string | null;
  signals: Array<{
    id: string;
    type: string;
    payload: string;
    senderId: string;
  }>;
  reactions: Array<{
    id: string;
    emoji: string;
    userId: string;
    createdAt: string;
  }>;
};

export type IncomingCall = {
  id: string;
  kind: "video" | "audio";
  conversationId: string | null;
  caller: CallPeer;
  createdAt: string;
};

const PEER_FIELDS = {
  id: true,
  name: true,
  username: true,
  image: true,
  isVerified: true,
  isBot: true,
} as const;

async function shapePeer(userId: string): Promise<CallPeer | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: PEER_FIELDS,
  });
  return u;
}

/** Marks ringing calls that were never answered as missed. Scoped to a user. */
async function sweepStaleCalls(userId: string) {
  await prisma.call.updateMany({
    where: {
      status: "ringing",
      createdAt: { lt: new Date(Date.now() - RING_TIMEOUT_MS) },
      OR: [{ calleeId: userId }, { callerId: userId }],
    },
    data: { status: "missed", endedAt: new Date() },
  });
}

function snapshot(call: {
  id: string;
  kind: string;
  status: string;
  callerId: string;
  calleeId: string;
  conversationId: string | null;
  startedAt: Date | null;
  caller: CallPeer;
  callee: CallPeer;
  signals: Array<{ id: string; type: string; payload: string; senderId: string }>;
  reactions: Array<{ id: string; emoji: string; userId: string; createdAt: Date }>;
}, viewerId: string): CallSnapshot {
  const isCaller = call.callerId === viewerId;
  return {
    id: call.id,
    kind: call.kind === "audio" ? "audio" : "video",
    status: call.status as CallSnapshot["status"],
    callerId: call.callerId,
    calleeId: call.calleeId,
    conversationId: call.conversationId,
    peer: isCaller ? call.callee : call.caller,
    isCaller,
    startedAt: call.startedAt?.toISOString() ?? null,
    signals: call.signals.map((s) => ({
      id: s.id,
      type: s.type,
      payload: s.payload,
      senderId: s.senderId,
    })),
    reactions: call.reactions.map((r) => ({
      id: r.id,
      emoji: r.emoji,
      userId: r.userId,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** Starts a video/audio call to a conversation member. Idempotent per pair. */
export async function startCall(
  conversationId: string,
  calleeId: string,
  kind: "video" | "audio" = "video"
): Promise<{ ok: true; callId: string } | { ok: false; error: string }> {
  const me = await requireUser();
  if (me.id === calleeId) {
    return { ok: false, error: "O'zingizga qo'ng'iroq qila olmaysiz" };
  }

  // Both users must be members of the conversation.
  const membership = await prisma.conversationMember.findMany({
    where: { conversationId, userId: { in: [me.id, calleeId] } },
    select: { userId: true },
  });
  const ids = new Set(membership.map((m) => m.userId));
  if (!ids.has(me.id) || !ids.has(calleeId)) {
    return { ok: false, error: "Suhbat topilmadi" };
  }

  const callee = await prisma.user.findUnique({
    where: { id: calleeId },
    select: { id: true, isBanned: true },
  });
  if (!callee || callee.isBanned) {
    return { ok: false, error: "Foydalanuvchi mavjud emas" };
  }

  await sweepStaleCalls(me.id);

  // Reuse an already-ringing/active call between the pair instead of forking.
  const existing = await prisma.call.findFirst({
    where: {
      status: { in: ["ringing", "active"] },
      OR: [
        { callerId: me.id, calleeId },
        { callerId: calleeId, calleeId: me.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return { ok: true, callId: existing.id };

  const call = await prisma.call.create({
    data: { conversationId, callerId: me.id, calleeId, kind },
    select: { id: true },
  });
  return { ok: true, callId: call.id };
}

/** Newest ringing call for the current user (drives the incoming-call UI). */
export async function pollIncomingCall(): Promise<IncomingCall | null> {
  const me = await requireUser();
  await sweepStaleCalls(me.id);
  const call = await prisma.call.findFirst({
    where: { calleeId: me.id, status: "ringing" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      conversationId: true,
      createdAt: true,
      caller: { select: PEER_FIELDS },
    },
  });
  if (!call) return null;
  return {
    id: call.id,
    kind: call.kind === "audio" ? "audio" : "video",
    conversationId: call.conversationId,
    caller: call.caller,
    createdAt: call.createdAt.toISOString(),
  };
}

/** Full snapshot of a call (participants only). Pass `after` to get partials. */
export async function pollCall(callId: string): Promise<CallSnapshot | null> {
  const me = await requireUser();
  await sweepStaleCalls(me.id);
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      caller: { select: PEER_FIELDS },
      callee: { select: PEER_FIELDS },
      signals: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      reactions: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 100 },
    },
  });
  if (!call) return null;
  if (call.callerId !== me.id && call.calleeId !== me.id) return null;
  return snapshot(call, me.id);
}

/** Callee accepts or declines a ringing call. */
export async function answerCall(
  callId: string,
  accept: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireUser();
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return { ok: false, error: "Qo'ng'iroq topilmadi" };
  if (call.calleeId !== me.id) return { ok: false, error: "Ruxsat yo'q" };
  if (call.status !== "ringing") return { ok: false, error: "Qo'ng'iroq allaqachon yakunlangan" };

  await prisma.call.update({
    where: { id: callId },
    data: accept
      ? { status: "active", startedAt: new Date() }
      : { status: "declined", endedAt: new Date() },
  });
  return { ok: true };
}

/** Either participant hangs up (or caller cancels while ringing). */
export async function endCall(
  callId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireUser();
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return { ok: false, error: "Qo'ng'iroq topilmadi" };
  if (call.callerId !== me.id && call.calleeId !== me.id) {
    return { ok: false, error: "Ruxsat yo'q" };
  }
  if (call.status === "ended" || call.status === "missed" || call.status === "declined") {
    return { ok: true };
  }
  await prisma.call.update({
    where: { id: callId },
    data: { status: "ended", endedAt: new Date() },
  });
  return { ok: true };
}

/** Stores one WebRTC signaling message (offer / answer / ICE candidate). */
export async function sendCallSignal(
  callId: string,
  type: "offer" | "answer" | "ice",
  payload: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireUser();
  if (!MAX_SIGNAL_TYPES.has(type)) return { ok: false, error: "Noto'g'ri signal turi" };
  if (typeof payload !== "string" || payload.length > MAX_SIGNAL_PAYLOAD) {
    return { ok: false, error: "Signal juda katta" };
  }
  try {
    JSON.parse(payload);
  } catch {
    return { ok: false, error: "Signal noto'g'ri formatda" };
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return { ok: false, error: "Qo'ng'iroq topilmadi" };
  if (call.callerId !== me.id && call.calleeId !== me.id) {
    return { ok: false, error: "Ruxsat yo'q" };
  }
  if (call.status !== "ringing" && call.status !== "active") {
    return { ok: false, error: "Qo'ng'iroq yakunlangan" };
  }

  await prisma.callSignal.create({
    data: { callId, senderId: me.id, type, payload },
  });
  return { ok: true };
}

/** Sends a floating emoji reaction during an active call. */
export async function reactToCall(
  callId: string,
  emoji: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireUser();
  const clean = (emoji ?? "").trim();
  if (!clean || clean.length > MAX_EMOJI_LENGTH) {
    return { ok: false, error: "Noto'g'ri emoji" };
  }
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return { ok: false, error: "Qo'ng'iroq topilmadi" };
  if (call.callerId !== me.id && call.calleeId !== me.id) {
    return { ok: false, error: "Ruxsat yo'q" };
  }
  if (call.status !== "active") return { ok: false, error: "Qo'ng'iroq faol emas" };

  // Cheap rate limit: max 30 reactions per user per call.
  const count = await prisma.callReaction.count({
    where: { callId, userId: me.id },
  });
  if (count >= 30) return { ok: false, error: "Juda ko'p reaksiya" };

  await prisma.callReaction.create({
    data: { callId, userId: me.id, emoji: clean },
  });
  return { ok: true };
}
