-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('ACTIVE', 'PAID', 'EXPIRED');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'CREDIT';

-- AlterTable
ALTER TABLE "AccountMovement" ADD COLUMN     "distributorCreditId" TEXT;

-- CreateTable
CREATE TABLE "DistributorCredit" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "usedAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorCredit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DistributorCredit" ADD CONSTRAINT "DistributorCredit_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMovement" ADD CONSTRAINT "AccountMovement_distributorCreditId_fkey" FOREIGN KEY ("distributorCreditId") REFERENCES "DistributorCredit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
