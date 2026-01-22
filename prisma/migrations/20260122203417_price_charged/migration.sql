-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BALANCE', 'CREDIT');

-- AlterTable
ALTER TABLE "SignatureRequest" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BALANCE',
ADD COLUMN     "priceCharged" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AccountMovement_signatureId_idx" ON "AccountMovement"("signatureId");

-- CreateIndex
CREATE INDEX "SignatureRequest_distributorId_createdAt_idx" ON "SignatureRequest"("distributorId", "createdAt");
