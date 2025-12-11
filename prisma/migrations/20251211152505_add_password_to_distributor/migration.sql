/*
  Warnings:

  - Added the required column `password` to the `Distributor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DISTRIBUTOR');

-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "password" TEXT NOT NULL;
