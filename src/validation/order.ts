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
  createdBy: z.enum(["customer", "manager"]),
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
