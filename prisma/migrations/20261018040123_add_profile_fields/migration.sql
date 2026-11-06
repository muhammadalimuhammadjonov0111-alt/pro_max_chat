-- AlterTable
ALTER TABLE "Message" ADD COLUMN "mediaType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "birthday" DATETIME;
ALTER TABLE "User" ADD COLUMN "gender" TEXT;
ALTER TABLE "User" ADD COLUMN "location" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
