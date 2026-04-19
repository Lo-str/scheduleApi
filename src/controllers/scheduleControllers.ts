import { Request, Response } from "express"
import { prisma } from "../db.js"
import { z } from "zod"
import { sendError, inputValidation } from "../helpers/response.js"
import logger from "../logger.js"

const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"] as const

const assignSchema = z.object({
  shift: z.enum(SHIFTS),
  date: z.coerce.date(),
  employeeId: z.number().int().positive(),
})

const removeSchema = z.object({
  shift: z.enum(SHIFTS),
  date: z.coerce.date(),
  employeeId: z.number().int().positive(),
})

const getSlot = async (date: Date, shiftId: number) => {
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  return prisma.scheduleEntry.findFirst({
    where: {
      shiftId,
      date: { gte: startOfDay, lt: endOfDay },
    },
    include: { employees: true, shift: true },
  })
}

// GET /schedule
export const getSchedule = async (_req: Request, res: Response) => {
  try {
    const entries = await prisma.scheduleEntry.findMany({
      include: { employees: true, shift: true },
      orderBy: [{ date: "asc" }, { shiftId: "asc" }],
    })
    logger.info(`Fetched schedule with ${entries.length} entries`)
    res.json({ success: true, data: entries })
  } catch (err) {
    logger.error(`Error fetching schedule: ${err}`)
    sendError(res, 500, err)
  }
}

// PUT /schedule/assign
export const assignEmployee = async (req: Request, res: Response) => {
  if (!inputValidation(assignSchema, req.body, res)) return
  try {
    const { shift, date, employeeId } = assignSchema.parse(req.body)

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      logger.warn(`Employee not found: ${employeeId}`)
      sendError(res, 404, "Employee not found")
      return
    }

    const shiftRecord = await prisma.shift.findUnique({ where: { name: shift } })
    if (!shiftRecord) {
      logger.warn(`Shift not found: ${shift}`)
      sendError(res, 404, "Shift not found")
      return
    }

    const slot = await getSlot(date, shiftRecord.id)
    if (!slot) {
      logger.warn(`Schedule slot not found for ${shift} on ${date}`)
      sendError(res, 404, "Schedule slot not found")
      return
    }

    if (req.user?.role === "EMPLOYEE" && employee.userId !== req.user.id) {
      sendError(res, 403, "Forbidden: employees can only assign themselves")
      return
    }

    if (slot.employees.some(e => e.id === employee.id)) {
      logger.warn(`Employee ${employeeId} already assigned to ${shift} on ${date}`)
      sendError(res, 409, "Employee already assigned to this slot")
      return
    }

    if (slot.employees.length >= 3) {
      logger.warn(`Slot full for ${shift} on ${date}`)
      sendError(res, 409, "This slot already has the maximum number of employees")
      return
    }

    const updated = await prisma.scheduleEntry.update({
      where: { id: slot.id },
      data: { employees: { connect: { id: employee.id } } },
      include: { employees: true, shift: true },
    })

    logger.info(`Assigned employee ${employeeId} to ${shift} on ${date}`)
    res.json({ success: true, message: "Employee assigned successfully", data: updated })
  } catch (err) {
    logger.error(`Error assigning employee: ${err}`)
    sendError(res, 500, err)
  }
}

// PUT /schedule/remove
export const removeEmployee = async (req: Request, res: Response) => {
  if (!inputValidation(removeSchema, req.body, res)) return
  try {
    const { shift, date, employeeId } = removeSchema.parse(req.body)

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      logger.warn(`Employee not found: ${employeeId}`)
      sendError(res, 404, "Employee not found")
      return
    }

    const shiftRecord = await prisma.shift.findUnique({ where: { name: shift } })
    if (!shiftRecord) {
      logger.warn(`Shift not found: ${shift}`)
      sendError(res, 404, "Shift not found")
      return
    }

    const slot = await getSlot(date, shiftRecord.id)
    if (!slot) {
      logger.warn(`Schedule slot not found for ${shift} on ${date}`)
      sendError(res, 404, "Schedule slot not found")
      return
    }

    if (req.user?.role === "EMPLOYEE" && employee.userId !== req.user.id) {
      sendError(res, 403, "Forbidden: employees can only remove themselves")
      return
    }

    if (!slot.employees.some(e => e.id === employee.id)) {
      logger.warn(`Employee ${employeeId} not assigned to ${shift} on ${date}`)
      sendError(res, 409, "Employee is not assigned to this slot")
      return
    }

    const updated = await prisma.scheduleEntry.update({
      where: { id: slot.id },
      data: { employees: { disconnect: { id: employee.id } } },
      include: { employees: true, shift: true },
    })

    logger.info(`Removed employee ${employeeId} from ${shift} on ${date}`)
    res.json({ success: true, message: "Employee removed successfully", data: updated })
  } catch (err) {
    logger.error(`Error removing employee: ${err}`)
    sendError(res, 500, err)
  }
}
