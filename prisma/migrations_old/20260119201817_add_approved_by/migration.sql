/*
  Warnings:

  - You are about to drop the column `adminId` on the `Recharge` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Recharge" DROP COLUMN "adminId",
ADD COLUMN     "approvedBy" TEXT;
