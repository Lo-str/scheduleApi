/*
  Warnings:

  - You are about to drop the column `employeeId` on the `ScheduleEntry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[date,shiftId]` on the table `ScheduleEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Shift` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ScheduleEntry" DROP CONSTRAINT "ScheduleEntry_employeeId_fkey";

-- AlterTable
ALTER TABLE "ScheduleEntry" DROP COLUMN "employeeId";

-- CreateTable
CREATE TABLE "_ScheduleEmployees" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ScheduleEmployees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ScheduleEmployees_B_index" ON "_ScheduleEmployees"("B");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_date_shiftId_key" ON "ScheduleEntry"("date", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_name_key" ON "Shift"("name");

-- AddForeignKey
ALTER TABLE "_ScheduleEmployees" ADD CONSTRAINT "_ScheduleEmployees_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleEmployees" ADD CONSTRAINT "_ScheduleEmployees_B_fkey" FOREIGN KEY ("B") REFERENCES "ScheduleEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
