-- CreateEnum
CREATE TYPE "ClaimReason" AS ENUM ('DAMAGED', 'MISSING_PARTS', 'NOT_CLEANED', 'RETURNED_LATE');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CONTESTED', 'RESOLVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DepositStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "DepositStatus" ADD VALUE 'PART_RELEASED';
ALTER TYPE "DepositStatus" ADD VALUE 'KEPT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "depositKept" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "depositReduced" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "fullDepositOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replacementValue" INTEGER;

-- CreateTable
CREATE TABLE "DepositClaim" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "ClaimReason" NOT NULL,
    "ownerNote" TEXT NOT NULL,
    "photos" TEXT[],
    "status" "ClaimStatus" NOT NULL DEFAULT 'OPEN',
    "renterNote" TEXT,
    "renterPhotos" TEXT[],
    "resolvedAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DepositClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositClaim_bookingId_key" ON "DepositClaim"("bookingId");

-- AddForeignKey
ALTER TABLE "DepositClaim" ADD CONSTRAINT "DepositClaim_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A claim can never exceed the deposit it's made against (checked again in the app).
ALTER TABLE "DepositClaim" ADD CONSTRAINT "DepositClaim_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_deposit_kept_in_range" CHECK ("depositKept" >= 0 AND "depositKept" <= "deposit");
