-- AlterTable: AI bot metadata on User
ALTER TABLE "User" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "botPrompt" TEXT;
ALTER TABLE "User" ADD COLUMN "botDescription" TEXT;
ALTER TABLE "User" ADD COLUMN "botCategory" TEXT;
ALTER TABLE "User" ADD COLUMN "botPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "botOwnerId" TEXT REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: logged Q/A pairs produced by bots
CREATE TABLE "BotReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotReply_botId_fkey" FOREIGN KEY ("botId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BotReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BotReply_botId_idx" ON "BotReply"("botId");

-- CreateIndex
CREATE INDEX "BotReply_userId_idx" ON "BotReply"("userId");

-- CreateIndex
CREATE INDEX "User_isBot_idx" ON "User"("isBot");
