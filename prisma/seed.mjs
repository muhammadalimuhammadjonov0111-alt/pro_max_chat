import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

// Real demo photos shipped in /public/seed. Using actual images (instead of the
// default Next.js placeholder SVGs) keeps the feed looking like a real network.
const IMAGES = [
  "/seed/photo-1.jpg",
  "/seed/photo-2.jpg",
  "/seed/photo-3.jpg",
  "/seed/photo-4.jpg",
  "/seed/photo-5.jpg",
  "/seed/photo-6.jpg",
  "/seed/photo-7.jpg",
  "/seed/photo-8.jpg",
];

// Default Next.js public SVGs that older seeds used as fake media.
const LEGACY_PLACEHOLDERS = [
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
  "/file.svg",
];

const AVATARS = [
  "/seed/avatar-1.jpg",
  "/seed/avatar-2.jpg",
  "/seed/avatar-3.jpg",
  "/seed/avatar-4.jpg",
  "/seed/avatar-5.jpg",
  "/seed/avatar-6.jpg",
];

async function upsertUser({
  username,
  name,
  email,
  password,
  bio = null,
  link = null,
  role = "USER",
  isVerified = false,
  isPremium = false,
  premiumDays = null,
  isPrivate = false,
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  const premiumUntil =
    isPremium && premiumDays ? new Date(Date.now() + premiumDays * DAY) : null;

  if (existing) {
    // Never overwrite an existing user's profile — only adjust privileges
    // (this is how the owner's own account gets promoted to admin).
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role,
        isVerified,
        isPremium,
        premiumUntil: isPremium ? premiumUntil : existing.premiumUntil,
      },
    });
    return existing;
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      id,
      name,
      email,
      username,
      displayUsername: username,
      emailVerified: true,
      role,
      isVerified,
      isPremium,
      premiumUntil,
      bio,
      link,
      isPrivate,
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: passwordHash,
    },
  });

  return { id, username, name };
}

async function main() {
  // -------------------------------------------------------------------------
  // Admin account (owner) — full access, verified + premium
  // -------------------------------------------------------------------------
  const admin = await upsertUser({
    username: "admin",
    name: "Gidgogram Admin",
    email: "admin@gidgogram.uz",
    password: "Admin@2026",
    bio: "Gidgogram asoschisi va administratori 👑",
    link: "gidgogram.uz",
    role: "ADMIN",
    isVerified: true,
    isPremium: true,
    premiumDays: 3650,
  });

  // -------------------------------------------------------------------------
  // Demo account
  // -------------------------------------------------------------------------
  const demo = await upsertUser({
    username: "demo",
    name: "Demo User",
    email: "demo@gidgogram.uz",
    password: "demo1234",
    bio: "Bu demo hisob. Xush kelibsiz! ✨",
  });

  // -------------------------------------------------------------------------
  // A small community so the feed feels alive
  // -------------------------------------------------------------------------
  const community = [
    { username: "aziz", name: "Aziz Karimov", bio: "Fotograf 📸 | Toshkent", isPremium: true, premiumDays: 30 },
    { username: "nodira", name: "Nodira Yusupova", bio: "Dizayner 🎨", isPremium: true, premiumDays: 365 },
    { username: "sardor", name: "Sardor Rahimov", bio: "Dasturchi 💻" },
    { username: "malika", name: "Malika Tosheva", bio: "Sayohat va taassurotlar ✈️" },
    { username: "javohir", name: "Javohir Aliyev", bio: "Sport va sog'lom turmush 🏃" },
  ];

  const users = [admin, demo];
  for (const c of community) {
    const u = await upsertUser({
      ...c,
      email: `${c.username}@gidgogram.uz`,
      password: "gidgogram123",
    });
    users.push(u);
  }

  // -------------------------------------------------------------------------
  // Posts
  // -------------------------------------------------------------------------
  const captions = [
    "Gidgogram birinchi sinov posti! 🚀 #gidgogram #yangi",
    "Yangi reel sinovi 🎬 #reels",
    "Bugungi kayfiyat ✨ #hayot",
    "Shahar manzaralari 🌆 #toshkent #foto",
    "Kofe va ish ☕ #motivation #work",
    "Sayohat davom etadi ✈️ #travel #uzbekistan",
    "Sport zalidan salom 💪 #fitness",
    "Yangi loyiha ustida ishlayapman 💻 #dev #coding",
  ];

  const createdPosts = [];

  // Ensure every seeded user has at least one post (idempotent per user).
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const mine = await prisma.post.count({ where: { userId: u.id } });
    if (mine > 0) continue;

    const n = i < 2 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const idx = (i * 2 + j) % captions.length;
      const post = await prisma.post.create({
        data: {
          userId: u.id,
          caption: captions[idx],
          location: i % 2 === 0 ? "Toshkent" : null,
          media: JSON.stringify([
            { url: IMAGES[(i + j) % IMAGES.length], type: "image" },
          ]),
          isReel: idx === 1,
        },
      });
      createdPosts.push(post);
    }
  }

  if (createdPosts.length > 0) {
    // follows: demo follows everyone, everyone follows admin
    for (const u of users) {
      if (u.id !== demo.id) {
        await prisma.follow
          .create({ data: { followerId: demo.id, followingId: u.id } })
          .catch(() => {});
      }
      if (u.id !== admin.id) {
        await prisma.follow
          .create({ data: { followerId: u.id, followingId: admin.id } })
          .catch(() => {});
      }
    }

    // likes + comments on the freshly created posts
    for (const post of createdPosts.slice(0, 8)) {
      for (const u of users) {
        if (u.id === post.userId) continue;
        await prisma.like
          .create({ data: { userId: u.id, postId: post.id } })
          .catch(() => {});
      }
      const commenter = users.find((u) => u.id !== post.userId);
      if (commenter) {
        await prisma.comment.create({
          data: {
            userId: commenter.id,
            postId: post.id,
            text: "Zo'r post! 🔥",
          },
        });
      }
    }
  }

  // A story from admin
  const activeStories = await prisma.story.count({
    where: { expiresAt: { gt: new Date() } },
  });
  if (activeStories === 0) {
    await prisma.story.create({
      data: {
        userId: admin.id,
        mediaUrl: IMAGES[0],
        mediaType: "image",
        expiresAt: new Date(Date.now() + DAY),
      },
    });
    await prisma.story.create({
      data: {
        userId: demo.id,
        mediaUrl: IMAGES[1],
        mediaType: "image",
        expiresAt: new Date(Date.now() + DAY),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Migrate any legacy placeholder media (default Next.js SVGs) to real photos.
  // This upgrades databases seeded before real demo images were available.
  // -------------------------------------------------------------------------
  const isLegacy = (url) =>
    typeof url === "string" && LEGACY_PLACEHOLDERS.includes(url);

  let photoCursor = 0;
  let migratedPosts = 0;
  const allPosts = await prisma.post.findMany({
    select: { id: true, media: true },
  });
  for (const post of allPosts) {
    let media;
    try {
      media = JSON.parse(post.media);
    } catch {
      continue;
    }
    if (!Array.isArray(media)) continue;

    let changed = false;
    const next = media.map((m) => {
      if (m && isLegacy(m.url)) {
        changed = true;
        return { ...m, url: IMAGES[photoCursor++ % IMAGES.length] };
      }
      return m;
    });
    if (changed) {
      await prisma.post.update({
        where: { id: post.id },
        data: { media: JSON.stringify(next) },
      });
      migratedPosts++;
    }
  }

  let migratedStories = 0;
  const allStories = await prisma.story.findMany({
    select: { id: true, mediaUrl: true },
  });
  for (const story of allStories) {
    if (isLegacy(story.mediaUrl)) {
      await prisma.story.update({
        where: { id: story.id },
        data: { mediaUrl: IMAGES[photoCursor++ % IMAGES.length] },
      });
      migratedStories++;
    }
  }

  // Avatars for the demo accounts — only when unset, so a real uploaded photo
  // is never overwritten. The owner's account is left untouched.
  let avatarCursor = 0;
  let avatarsAdded = 0;
  for (const u of users) {
    if (u.id === admin.id) continue;
    const row = await prisma.user.findUnique({
      where: { id: u.id },
      select: { image: true },
    });
    if (row && !row.image) {
      await prisma.user.update({
        where: { id: u.id },
        data: { image: AVATARS[avatarCursor++ % AVATARS.length] },
      });
      avatarsAdded++;
    }
  }

  if (migratedPosts || migratedStories || avatarsAdded) {
    console.log(
      `migrated: ${migratedPosts} posts, ${migratedStories} stories, ${avatarsAdded} avatars`
    );
  }

  const counts = {
    users: await prisma.user.count(),
    admins: await prisma.user.count({ where: { role: "ADMIN" } }),
    verified: await prisma.user.count({ where: { isVerified: true } }),
    premium: await prisma.user.count({ where: { isPremium: true } }),
    posts: await prisma.post.count(),
    stories: await prisma.story.count(),
  };
  console.log("seeded:", counts);
  console.log(
    "Admin: the account with username 'admin' now has ADMIN rights + verified badge."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
