import z from "zod"

z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string()
}).refine(data => data.email || data.username, {
  message: "Email or username is required to login"
})