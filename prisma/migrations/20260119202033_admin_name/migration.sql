/*
  Warnings:

  - You are about to drop the column `adminId` on the `AccountMovement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AccountMovement" DROP COLUMN "adminId",
ADD COLUMN     "adminName" TEXT;
