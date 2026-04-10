import "dotenv/config"
import { users } from "../src/data/users.js"
import { prisma } from "../src/db.js"

const seed = async () => {
  for (const u of users) {
    if (u.username === "admin") continue

    const user = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: u.password,
        role: "EMPLOYEE",
      }
    })

    await prisma.employee.create({
      data: {
        firstName: u.name.split(" ")[0],
        lastName: u.name.split(" ")[1],
        loginCode: u.username,
        phone: u.phone,
        userId: user.id,
      }
    })
  }

  // Create the three shifts
  await prisma.shift.createMany({
    data: [
      { name: "MORNING", startTime: "07:00", endTime: "15:00" },
      { name: "AFTERNOON", startTime: "15:00", endTime: "18:00" },
      { name: "NIGHT", startTime: "18:00", endTime: "23:00" },
    ]
  })

  const shifts = await prisma.shift.findMany()

  const start = new Date("2026-01-01")
  const end = new Date("2026-12-31")

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    for (const shift of shifts) {
      await prisma.scheduleEntry.create({
        data: {
          date: new Date(d),
          shiftId: shift.id,
        }
      })
    }
  }

}

seed().then(() => prisma.$disconnect())
