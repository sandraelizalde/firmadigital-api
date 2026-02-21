/*
  Warnings:

  - A unique constraint covering the columns `[numberReceipt]` on the table `Recharge` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Recharge_numberReceipt_key" ON "Recharge"("numberReceipt");
