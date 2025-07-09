import { z } from "zod";

const userValidation = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  phone: z
    .string()
    .regex(
      /^01\d{9}$/,
      "Phone number must start with 01 and be exactly 11 digits"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  address: z.string().max(100).optional(),
  NID: z.string().refine((val) => /^\d{10}$|^\d{17}$/.test(val), {
    message: "NID must be either 10 or 17 digits",
  }),
  role: z.enum(["admin", "manager", "super_admin"]),
  avatar: z.string().url().optional(),

  isDelete: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export { userValidation };
