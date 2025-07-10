import { defaults } from "@/config/defaults";
import { z } from "zod";

const sortQueryValidation = z.object({
  sortBy: z
    .enum(["createdAt", "updatedAt", "name"])
    .optional()
    .default(defaults.sortBy as "createdAt" | "updatedAt" | "name"),
  sortType: z
    .enum(["asc", "desc"])
    .optional()
    .default(defaults.sortType as "asc" | "desc"),
});

export { sortQueryValidation };
