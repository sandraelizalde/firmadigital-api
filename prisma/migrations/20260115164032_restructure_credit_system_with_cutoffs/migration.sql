/*
  Warnings:

  - You are about to drop the column `dueDate` on the `DistributorCredit` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `DistributorCredit` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `DistributorCredit` table. All the data in the column will be lost.
  - You are about to drop the column `usedAmount` on the `DistributorCredit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DistributorCredit" DROP COLUMN "dueDate",
DROP COLUMN "paidAmount",
DROP COLUMN "status",
DROP COLUMN "usedAmount",
ADD COLUMN     "creditDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CreditCutoff" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "cutoffDate" TIMESTAMP(3) NOT NULL,
    "paymentDueDate" TIMESTAMP(3) NOT NULL,
    "amountUsed" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "signaturesCount" INTEGER NOT NULL DEFAULT 0,
    "signaturesDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCutoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditCutoff_distributorId_cutoffDate_idx" ON "CreditCutoff"("distributorId", "cutoffDate");

-- CreateIndex
CREATE INDEX "CreditCutoff_creditId_isPaid_idx" ON "CreditCutoff"("creditId", "isPaid");

-- CreateIndex
CREATE INDEX "CreditCutoff_paymentDueDate_isPaid_idx" ON "CreditCutoff"("paymentDueDate", "isPaid");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCutoff_creditId_cutoffDate_key" ON "CreditCutoff"("creditId", "cutoffDate");

-- CreateIndex
CREATE INDEX "DistributorCredit_distributorId_isActive_idx" ON "DistributorCredit"("distributorId", "isActive");

-- CreateIndex
CREATE INDEX "DistributorCredit_distributorId_isBlocked_idx" ON "DistributorCredit"("distributorId", "isBlocked");

-- AddForeignKey
ALTER TABLE "CreditCutoff" ADD CONSTRAINT "CreditCutoff_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCutoff" ADD CONSTRAINT "CreditCutoff_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "DistributorCredit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
