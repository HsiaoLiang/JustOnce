-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "marketPrice" INTEGER,
ADD COLUMN     "marketPriceCheckedAt" TIMESTAMP(3),
ADD COLUMN     "marketPriceCount" INTEGER,
ADD COLUMN     "marketPriceUrl" TEXT;
