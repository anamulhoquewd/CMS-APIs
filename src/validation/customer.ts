import { z } from "zod";

const itemScheduleValidation = z
  .object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
    lunch: z.boolean(),
    dinner: z.boolean(),
    lunchQuantity: z.number().int().positive().optional(),
    dinnerQuantity: z.number().int().positive().optional(),
    lunchPrice: z.number().int().positive().optional(),
    dinnerPrice: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      (data.lunch ? data.lunchQuantity !== undefined : true) &&
      (data.dinner ? data.dinnerQuantity !== undefined : true) &&
      (data.lunch ? data.lunchPrice !== undefined : true) &&
      (data.dinner ? data.dinnerPrice !== undefined : true),
    {
      message:
        "lunchQuantity is required if lunch is true, dinnerQuantity is required if dinner is true",
    }
  );

const customerValidation = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .regex(
      /^01\d{9}$/,
      "Phone number must start with 01 and be exactly 11 digits"
    ),
  email: z.string().email().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  address: z.string().min(1, "Address is required"),
  avatar: z.string().url().optional(),
  role: z.enum(["customer"]).optional(),

  price: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),

  schedule: z
    .array(itemScheduleValidation)
    .max(7, "Schedule cannot have more than 7 items")
    .optional(),

  paymentStatus: z.enum(["paid", "partially_paid", "unpaid"]).default("unpaid"),
  paymentFrequency: z.enum(["daily", "weekly", "monthly"]),

  isActive: z.boolean().default(true),
  isDelete: z.boolean().default(false),
});

export { customerValidation, itemScheduleValidation };
