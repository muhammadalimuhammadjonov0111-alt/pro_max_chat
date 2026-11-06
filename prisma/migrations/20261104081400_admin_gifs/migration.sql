-- CreateTable
CREATE TABLE "AdminGif" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT
);

-- CreateIndex
CREATE INDEX "AdminGif_createdAt_idx" ON "AdminGif"("createdAt");
