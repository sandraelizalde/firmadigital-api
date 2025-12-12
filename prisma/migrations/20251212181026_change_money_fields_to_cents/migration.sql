/*
  Warnings:

  - You are about to alter the column `amount` on the `AccountMovement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `balanceAfter` on the `AccountMovement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `balance` on the `Distributor` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `customPrice` on the `DistributorPlanPrice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `customPricePromo` on the `DistributorPlanPrice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `basePrice` on the `Plan` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `basePricePromo` on the `Plan` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `requestedAmount` on the `Recharge` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `creditedAmount` on the `Recharge` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `commission` on the `Recharge` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "AccountMovement" ALTER COLUMN "amount" SET DATA TYPE INTEGER,
ALTER COLUMN "balanceAfter" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Distributor" ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "DistributorPlanPrice" ALTER COLUMN "customPrice" SET DATA TYPE INTEGER,
ALTER COLUMN "customPricePromo" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "basePrice" SET DATA TYPE INTEGER,
ALTER COLUMN "basePricePromo" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Recharge" ALTER COLUMN "requestedAmount" SET DATA TYPE INTEGER,
ALTER COLUMN "creditedAmount" SET DATA TYPE INTEGER,
ALTER COLUMN "commission" SET DATA TYPE INTEGER;
