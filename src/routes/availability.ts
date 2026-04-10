import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { z } from 'zod';

const router = Router();

// Zod Schema for validation
const availabilitySchema = z.object({
  shiftId: z.number(),
  date: z.string(),
  available: z.boolean()
});

// GET /availability/:employeeId
router.get('/:employeeId', async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  try {
    const availability = await prisma.availability.findMany({
      where: { employeeId: Number(employeeId) },
      include: { shift: true } // This shows the shift name/time too!
    });
    res.status(200).json(availability);
  } catch (error) {
    res.status(500).json({ error: 'Database error fetching availability' });
  }
});

// PUT /availability/:employeeId
router.put('/:employeeId', async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  try {
    const validatedData = availabilitySchema.parse(req.body);

    const newAvailability = await prisma.availability.create({ // should be upsert for real use case
      data: {
        employeeId: Number(employeeId),
        shiftId: validatedData.shiftId,
        date: new Date(validatedData.date),
        available: validatedData.available,
      },
    });

    res.status(200).json(newAvailability);
  } catch (error) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: error.issues });
       return;
    }
    res.status(500).json({ error: 'Database error saving availability' });
  }
});

export default router;
