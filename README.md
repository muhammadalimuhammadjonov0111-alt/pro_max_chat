# Gidgogram 📸

Instagram uslubidagi to‘liq ishlaydigan ijtimoiy tarmoq sayti. **Next.js 16**
(App Router), **TypeScript**, **Tailwind CSS v4**, **Prisma** va **Better Auth**
asosida qurilgan.

> Gidgogram — mustaqil loyiha. U Instagram’ning UX (ko‘rinish va harakatlanish)
> uslubidan ilhomlangan, lekin 100% o‘z kodimiz va o‘z brendimiz.

---

## ✨ Imkoniyatlar

### Autentifikatsiya
- Email **yoki** username bilan kirish
- Ro‘yxatdan o‘tish (username, ism, parol validatsiyasi)
- Sessiya (30 kun), himoyalangan sahifalar, avtomatik redirect
- Band va **zahiralangan (reserved)** username’larni bloklash
  (`admin-panel`, `premium`, `login`, ... kabi marshrutlar username bo‘la olmaydi)
- Parolni tiklash sahifasi (demo)

### Ijtimoiy
- **Feed** — kuzatilgan odamlar + o‘z postlari
- **Post yaratish** — bir nechta rasm/video, izoh, joylashuv, Reels rejimi
- **Postni tahrirlash** — izoh va joylashuvni keyin o‘zgartirish
- **Like / Comment / Save / Share** (+ post muallifi izohlarni o‘chira oladi)
- **Follow / Unfollow** — yopiq hisoblar uchun **kuzatish so‘rovi** oqimi
  (qabul qilish / rad etish)
- **Explore** — barcha ommaviy postlar grid ko‘rinishida
- **Search** — username yoki ism bo‘yicha qidirish
- **Stories** — 24 soatlik hikoyalar, progress bar, ko‘rish belgisi
- **Reels** — vertikal video, avtomatik ijro, double-tap like
- **Xabarlar (DM)** — suhbatlar, matn va rasm, “ko‘rildi” holati (polling)
- **Bildirishnomalar** — like, comment, follow, follow-so‘rov, xabar
- **Profil** — avatar, bio, havola, postlar/reels/saqlanganlar, kuzatuvchilar
- **Post ko‘rishlar** — har bir post nechta marta ko‘rilgani (muallifga)
- **Hashtag sahifalari** — `#hashtag` va `@mention` avtomatik havolaga aylanadi
- **Shikoyat (report)** — post/foydalanuvchi ustidan admin panelga yuborish
- **Yopiq (private) profil** — kontent bloklanadi
- **Sozlamalar** — tema, yopiq hisob, premium holati, chiqish

### 👑 Premium (obuna)
- **20 000 so‘m / oy** yoki **100 000 so‘m / yil** (yillikda 2 oy bepul)
- Chiroyli narx sahifasi, tarif tanlash va demo to‘lov (checkout)
- Premium imkoniyatlari: tasdiqlangan belgi, statistika, reklamasiz, ustuvor
  yordam, avatar atrofida maxsus gradient halqa
- Obunani bekor qilish (muddat tugaguncha amal qiladi)

> To‘lov **demo** — haqiqiy to‘lov shlyuzi (Payme / Click / Stripe) ulanmagan.
> `src/actions/premium.ts` dagi `subscribePremium` to‘lov tasdiqlangandan keyin
> chaqirilishi kerak.

### ✅ Tasdiqlangan belgi (galichka)
- Ko‘k **verified** belgisi, sariq **Admin** belgisi va gradient **Pro** belgisi
- Faqat admin tomonidan beriladi (o‘z-o‘zidan qo‘yib bo‘lmaydi)

### 🛡️ Admin panel (`/admin-panel`)
- Statistika: foydalanuvchilar, postlar, reels, story, like, izoh, daromad
- Foydalanuvchilar jadvali — qidirish, **tasdiqlash (verified)**, **premium**,
  **admin qilish**, **bloklash**, **o‘chirish**
- Postlar ro‘yxati — ko‘rish/o‘chirish
- Obunalar (subscriptions) ro‘yxati
- Shikoyatlar — hal qilish / rad etish
- Faqat `role === "ADMIN"` uchun; boshqalar `/` ga yo‘naltiriladi

### UI / Dizayn
- Yangi dizayn tizimi: brend gradienti, `story-ring`, `glass`, `card-shadow`,
  `premium-glow`, silliq animatsiyalar (heart-pop, gradient-pan, ...)
- Instagram’ga o‘xshash sidebar (hover bilan kengayadi) + o‘qilmagan
  bildirishnoma/xabar belgilari, mobil pastki panel
- Gradient logotip, gradient tugmalar, badge’lar
- Light / Dark / System mavzular, to‘liq responsive
- Skeleton loading, empty state, 404, error boundary

---

## 🧰 Texnologiyalar

| Qism | Texnologiya |
|------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Til | TypeScript |
| Styling | Tailwind CSS v4 + tw-animate-css |
| UI | Radix UI primitivlari (qo‘lda yozilgan shadcn-uslub komponentlar) |
| Auth | Better Auth (email/parol + username plagin) |
| ORM / DB | Prisma 6 + SQLite (lokal), PostgreSQL’ga oson o‘tadi |
| Form | react-hook-form + zod |
| Icons | lucide-react |
| Toast | sonner |
| Tema | next-themes |

---

## 🚀 Ishga tushirish

### 1. Talablar
- Node.js 20+
- npm

### 2. O‘rnatish
```bash
npm install
```

### 3. Muhit fayli
`.env.example` ni `.env` ga nusxalab, qiymatlarni to‘ldiring:
```bash
DATABASE_URL="file:./dev.db"
BETTER_AUTH_SECRET="uzun_tasodifiy_maxfiy_kalit"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
> Maxfiy kalit yaratish: `openssl rand -base64 32`

### 4. Ma’lumotlar bazasi
```bash
npm run db:migrate     # migratsiyani qo‘llash
npm run db:seed        # demo ma’lumot + admin huquqi
```

### 5. Serverni ishga tushirish
```bash
npm run dev
```
Brauzerda oching: **http://localhost:3000**

---

## 🔑 Hisoblar (seed)

| Hisob | Username | Parol | Izoh |
|-------|----------|-------|------|
| Admin (ega) | `admin` | *(o‘zingizning parolingiz)* | `ADMIN` + ✅ verified + 👑 premium |
| Demo | `demo` | `demo1234` | Oddiy foydalanuvchi |
| Hamjamiyat | `aziz`, `nodira`, `sardor`, `malika`, `javohir` | `gidgogram123` | Namuna profillar |

> **Muhim:** `admin` username’i sizning hisobingiz. `db:seed` uni (agar
> mavjud bo‘lsa) o‘chirmaydi yoki nomini o‘zgartirmaydi — faqat **admin
> huquqi, verified va premium** beradi. Kirish uchun o‘sha hisobning parolidan
> foydalaning. Admin panel: **`/admin-panel`**.

> Eslatma: username’lar `-` (defis) belgisini qabul qilmaydi, shuning uchun
> `admin-panel`, `premium` kabi marshrutlar hech qachon username bilan
> to‘qnashmaydi.

---

## 📜 Foydali buyruqlar

| Buyruq | Tavsif |
|--------|--------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production serverni ishga tushirish |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Yangi migratsiya |
| `npm run db:studio` | Prisma Studio (bazani ko‘rish) |
| `npm run db:seed` | Demo ma’lumot qo‘shish |
| `npm run db:reset` | Bazani tozalab, qayta qurish |

---

## 📁 Loyiha tuzilmasi

```
pixora/
├── prisma/
│   ├── schema.prisma        # Ma'lumotlar modeli
│   ├── seed.mjs             # Demo ma'lumot + admin
│   └── migrations/
├── uploads/                 # Yuklangan rasm/videolar (runtime'da route orqali beriladi)
└── src/
    ├── actions/             # Server actions (post, user, story, message, premium, admin)
    ├── app/
    │   ├── (auth)/          # login, register, forgot-password
    │   ├── (main)/          # feed, explore, reels, messages, profile, premium, admin-panel, tag...
    │   ├── uploads/[name]/  # Yuklangan fayllarni beruvchi route handler
    │   └── api/
    │       ├── auth/[...all]  # Better Auth handler
    │       └── upload/        # Fayl yuklash
    ├── components/
    │   ├── admin/           # Admin panel
    │   ├── auth/            # Login/Register formalari
    │   ├── create/          # Post yaratish dialogi
    │   ├── feed/            # PostCard, PostDetail, Comments, edit/report dialog
    │   ├── layout/          # Sidebar, MobileBottomBar
    │   ├── messages/        # DM chat
    │   ├── notifications/   # Bildirishnomalar + follow so'rovlari
    │   ├── premium/         # Premium sahifasi
    │   ├── profile/         # Profil header, tabs, tahrirlash
    │   ├── shared/          # badges, rich-text, follow-button, wordmark
    │   ├── stories/         # Hikoyalar
    │   └── ui/              # Bazaviy UI komponentlar
    ├── lib/                 # auth, prisma, queries, types, utils, upload
    └── schemas/             # zod validatsiya sxemalari
```

---

## 🗄️ Ma’lumotlar modeli (asosiy)

- **User** — bio, link, isPrivate, `role`, `isVerified`, `isPremium`,
  `premiumUntil`, `isBanned`
- **Post** — media (JSON), caption, location, isReel, `isArchived`, `editedAt`
- **PostView** — post ko‘rishlar
- **Subscription** — premium obunalar (plan, amount, status, endsAt)
- **FollowRequest** — yopiq hisoblar uchun kuzatish so‘rovlari
- **Report** — shikoyatlar (post / user / comment)
- Like, Comment, SavedPost, Story, Conversation, Message, Notification, Follow

---

## 🔐 Xavfsizlik eslatmalari
- `.env` faylini **hech qachon** gitga qo‘shmang (`.gitignore`da).
- Productionda `BETTER_AUTH_SECRET`ni almashtiring.
- `role`, `isVerified`, `isPremium`, `premiumUntil`, `isBanned` maydonlari
  Better Auth’da `input: false` — mijoz ularni o‘zi o‘rnata olmaydi.
- Upload hajmi 50MB bilan cheklangan, faqat rasm/video turlari qabul qilinadi.
- Admin panel `/admin-panel` server tomonda `role === "ADMIN"` bilan qo‘riqlanadi.

---

## 📌 Ma’lum cheklovlar (keyingi bosqichlar)
- To‘lov — **demo** (haqiqiy Payme/Click/Stripe shlyuzi ulanmagan).
- Email tasdiqlash va haqiqiy parol-tiklash emaili **sozlanmagan** (SMTP kerak).
- DM va bildirishnomalar **polling** orqali (real-time uchun WebSocket qo‘shish).
- Infinite scroll o‘rniga oddiy ro‘yxat (keyinroq qo‘shiladi).

> **Eslatma (fayllar):** Yuklangan rasm/videolar `public` ichida emas, balki
> loyiha ildizidagi `uploads/` papkasida saqlanadi va ular
> `app/uploads/[name]/route.ts` orqali beriladi. Sababi — Next.js production’da
> faqat **build vaqtida** `public`da mavjud bo‘lgan fayllarni xizmat qiladi,
> keyin qo‘shilganlar 404 qaytaradi.

---

© 2026 Gidgogram. O‘quv/loyiha maqsadida yaratilgan.
