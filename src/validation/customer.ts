import { z } from "zod";

const scheduleSchema = z.array(
  z.object({
    date: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "Invalid date format (yyyy-MM-dd)",
    }),
    lunch: z.boolean().optional(),
    dinner: z.boolean().optional(),
    lunchQuantity: z.number().min(1).optional(),
    dinnerQuantity: z.number().min(1).optional(),
  })
);

const customerValidation = z.object({
  name: z.string().min(3, "Name is required"),
  phone: z
    .string()
    .regex(
      /^01\d{9}$/,
      "Phone number must start with 01 and be exactly 11 digits"
    ),
  email: z.string().email().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  address: z.string().min(3, "Address is required"),
  avatar: z.string().url().optional(),
  role: z.enum(["customer"]).optional(),

  price: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),

  lunchPrice: z.number().positive().optional(),
  dinnerPrice: z.number().positive().optional(),

  lunchQuantity: z.number().int().positive().optional(),
  dinnerQuantity: z.number().int().positive().optional(),

  schedule: z
    .array(scheduleSchema)
    .max(7, "Schedule cannot have more than 7 items")
    .optional(),

  paymentStatus: z.enum(["paid", "partially_paid", "unpaid"]).default("unpaid"),
  paymentFrequency: z.enum(["daily", "weekly", "monthly"]),

  isActive: z.boolean().default(true),
  isDelete: z.boolean().default(false),
});

export { customerValidation, scheduleSchema };
