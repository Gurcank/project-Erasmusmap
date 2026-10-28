-- CreateEnum
CREATE TYPE "TripRole" AS ENUM ('EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TripMemberStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterEnum
ALTER TYPE "TripVisibility" ADD VALUE 'LINK';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "shareToken" TEXT;

-- CreateTable
CREATE TABLE "TripMember" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TripRole" NOT NULL DEFAULT 'VIEWER',
    "status" "TripMemberStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "TripMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripMember_userId_status_idx" ON "TripMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TripMember_tripId_userId_key" ON "TripMember"("tripId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_shareToken_key" ON "Trip"("shareToken");

-- AddForeignKey
ALTER TABLE "TripMember" ADD CONSTRAINT "TripMember_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMember" ADD CONSTRAINT "TripMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMember" ADD CONSTRAINT "TripMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A share token is a 256-bit secret (43 base64url characters), never a short
-- guessable string. Not tied to visibility = 'LINK' here: a new enum value
-- cannot be used in the transaction that adds it.
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_shareToken_check" CHECK (
  "shareToken" IS NULL OR "shareToken" ~ '^[A-Za-z0-9_-]{43}$'
);
