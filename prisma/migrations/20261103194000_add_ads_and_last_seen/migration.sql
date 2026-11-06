-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL DEFAULT 'Batafsil',
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "audioUrl" TEXT,
    "audioTitle" TEXT,
    "contactType" TEXT,
    "contactValue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT,
    "displayUsername" TEXT,
    "bio" TEXT,
    "link" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "birthday" DATETIME,
    "location" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "adSlots" INTEGER NOT NULL DEFAULT 1,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" DATETIME,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botPrompt" TEXT,
    "botDescription" TEXT,
    "botCategory" TEXT,
    "botPublic" BOOLEAN NOT NULL DEFAULT true,
    "botOwnerId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME,
    CONSTRAINT "User_botOwnerId_fkey" FOREIGN KEY ("botOwnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("bio", "birthday", "botCategory", "botDescription", "botOwnerId", "botPrompt", "botPublic", "createdAt", "displayUsername", "email", "emailVerified", "gender", "id", "image", "isBanned", "isBot", "isPremium", "isPrivate", "isVerified", "link", "location", "name", "phone", "premiumUntil", "role", "updatedAt", "username") SELECT "bio", "birthday", "botCategory", "botDescription", "botOwnerId", "botPrompt", "botPublic", "createdAt", "displayUsername", "email", "emailVerified", "gender", "id", "image", "isBanned", "isBot", "isPremium", "isPrivate", "isVerified", "link", "location", "name", "phone", "premiumUntil", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_isBot_idx" ON "User"("isBot");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Ad_status_endsAt_idx" ON "Ad"("status", "endsAt");

-- CreateIndex
CREATE INDEX "Ad_userId_idx" ON "Ad"("userId");

