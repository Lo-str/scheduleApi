import { Router } from "express"
import { prisma } from "../db.js"
import { z } from "zod"
import { sendError, inputValidation } from "../helpers/response.js"

const router = Router()

const availabilitySchema = z.object({
  shiftId: z.number(),
  date: z.string(),
  available: z.boolean()
})

// GET /availability/:employeeId
router.get("/:employeeId", async (req, res) => {
  const { employeeId } = req.params
  try {
    const availability = await prisma.availability.findMany({
      where: { employeeId: Number(employeeId) },
      include: { shift: true }
    })
    res.json(availability)
  } catch (err) {
    sendError(res, 500, err)
  }
})

// PUT /availability/:employeeId
router.put("/:employeeId", async (req, res) => {
  if (!inputValidation(availabilitySchema, req.body, res)) return

  const { employeeId } = req.params
  try {
    const parsed = availabilitySchema.parse(req.body)
    const newAvailability = await prisma.availability.upsert({
      where: {
        employeeId_shiftId_date: {
          employeeId: Number(employeeId),
          shiftId: parsed.shiftId,
          date: new Date(parsed.date),
        }
      },
      update: { available: parsed.available },
      create: {
        employeeId: Number(employeeId),
        shiftId: parsed.shiftId,
        date: new Date(parsed.date),
        available: parsed.available,
      }
    })
    res.json(newAvailability)
  } catch (err) {
    sendError(res, 500, err)
  }
})

export default router
