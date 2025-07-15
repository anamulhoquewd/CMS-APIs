import { z } from "zod";
import mongoose from "mongoose";

export const orderItemValidation = z.object({
  type: z.enum(["lunch", "dinner"]),
  quantity: z
    .number()
    .int()
    .positive({ message: "Quantity must be a positive integer" }),
  price: z.number().nonnegative({ message: "Price must be >= 0" }),
  subtotal: z.number().nonnegative({ message: "Subtotal must be >= 0" }),
});

export const orderValidation = z.object({
  customerId: z.custom<mongoose.Types.ObjectId>(
    (val) => mongoose.Types.ObjectId.isValid(String(val)),
    {
      message: "Invalid customerId",
    }
  ),
  createdBy: z.enum(["customer", "manager", "super_admin", "admin"]),
  createdById: z.custom<mongoose.Types.ObjectId>(
    (val) => mongoose.Types.ObjectId.isValid(String(val)),
    {
      message: "Invalid createdById",
    }
  ),
  items: z
    .array(orderItemValidation)
    .min(1, { message: "At least one item is required" }),
  total: z.number().nonnegative({ message: "Total must be >= 0" }),
  date: z.coerce.date(), // accepts string or Date
  note: z.string().optional(),
});

export const orderSchemaValidation = z.object({
  customerId: z
    .any()
    .transform((val) =>
      val instanceof mongoose.Types.ObjectId ? val.toString() : val
    )
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid MongoDB User ID format",
    })
    .optional(),
  items: z
    .array(z.enum(["lunch", "dinner"]))
    .min(1, "At least one item is required")
    .max(2),
  date: z
    .string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), "Invalid date format"),
  note: z.string().optional(),

  lunchQuantity: z.number().min(1).optional(),
  dinnerQuantity: z.number().min(1).optional(),

  lunchPrice: z.number().positive().optional(),
  dinnerPrice: z.number().positive().optional(),
});
