-- CreateEnum
CREATE TYPE "HandoverMethod" AS ENUM ('MEET', 'COURIER', 'LOCKER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "handoverMethod" "HandoverMethod" NOT NULL DEFAULT 'MEET',
ADD COLUMN     "lockerName" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "handoverMethods" "HandoverMethod"[] DEFAULT ARRAY['MEET']::"HandoverMethod"[];
