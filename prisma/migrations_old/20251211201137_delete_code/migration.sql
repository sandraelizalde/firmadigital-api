/*
  Warnings:

  - You are about to drop the `DiscountCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DistributorDiscountAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlanDiscountCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DistributorDiscountAssignment" DROP CONSTRAINT "DistributorDiscountAssignment_discountCodeId_fkey";

-- DropForeignKey
ALTER TABLE "DistributorDiscountAssignment" DROP CONSTRAINT "DistributorDiscountAssignment_distributorId_fkey";

-- DropForeignKey
ALTER TABLE "PlanDiscountCode" DROP CONSTRAINT "PlanDiscountCode_discountCodeId_fkey";

-- DropForeignKey
ALTER TABLE "PlanDiscountCode" DROP CONSTRAINT "PlanDiscountCode_planId_fkey";

-- DropTable
DROP TABLE "DiscountCode";

-- DropTable
DROP TABLE "DistributorDiscountAssignment";

-- DropTable
DROP TABLE "PlanDiscountCode";
