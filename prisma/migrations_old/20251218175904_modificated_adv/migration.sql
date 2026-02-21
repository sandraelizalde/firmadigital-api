/*
  Warnings:

  - You are about to drop the column `link` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Advertisement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Advertisement" DROP COLUMN "link",
DROP COLUMN "title";
