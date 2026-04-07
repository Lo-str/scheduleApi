import z from "zod"

z.object({
  email: z.string(),
  password: z.string()
})