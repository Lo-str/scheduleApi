/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,shiftId,date]` on the table `Availability` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Availability_employeeId_shiftId_date_key" ON "Availability"("employeeId", "shiftId", "date");
