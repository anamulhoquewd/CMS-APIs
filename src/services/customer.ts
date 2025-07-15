import { pagination } from "@/lib";
import { Customer } from "@/models";
import { schemaValidationError } from "@/utils";
import { sortQueryValidation } from "@/validation/common";
import { customerValidation, scheduleSchema } from "@/validation/customer";
import { idSchema } from "@/validation/utils";
import { isBefore, parseISO, startOfDay } from "date-fns";
import { ICustomerDoc } from "@/interface/customer";

export const getCustomersService = async (queryParams: {
  page: number;
  limit: number;
  search: string | undefined;
  sortType: string;
  sortBy: string;
  isActive: boolean | string;
  isDelete: boolean;
}) => {
  const parsed = sortQueryValidation.safeParse({
    sortBy: queryParams.sortBy,
    sortType: queryParams.sortType,
  });

  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid query params"),
    };
  }

  const query: any = {
    isDelete: false,
  };
  if (queryParams.isActive) query.isActive = queryParams.isActive;
  if (queryParams.isDelete) query.isDelete = queryParams.isDelete;
  if (queryParams.search) {
    query.$or = [
      { name: { $regex: queryParams.search, $options: "i" } },
      { phone: { $regex: queryParams.search, $options: "i" } },
    ];
  }

  const validSortFields = ["createdAt", "updatedAt", "name"];
  const sortField = validSortFields.includes(parsed.data.sortBy)
    ? parsed.data.sortBy
    : "createdAt";
  const sortDirection =
    parsed.data.sortType.toLocaleLowerCase() === "asc" ? 1 : -1;

  try {
    const [customer, total] = await Promise.all([
      Customer.find(query)
        .sort({ [sortField]: sortDirection })
        .skip((queryParams.page - 1) * queryParams.limit)
        .limit(queryParams.limit)
        .exec(),

      Customer.countDocuments(query),
    ]);

    const getPagination = pagination({
      page: queryParams.page,
      limit: queryParams.limit,
      total,
    });

    return {
      success: {
        success: true,
        message: "Customers fetched successfully",
        data: customer,
        documentCount: total,
        pagination: getPagination,
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const getSingleCustomerService = async (id: string) => {
  // Validate ID
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid ID"),
    };
  }

  try {
    // Check if customer exists
    const customer = await Customer.findOne({
      _id: parsed.data.id,
      isDelete: false,
    });

    console.log("Customer", customer);

    if (!customer) {
      return {
        error: {
          message: "Customer not found with the provided ID",
          success: false,
        },
      };
    }

    // Response
    return {
      success: {
        success: true,
        message: "Customer fetched successfully",
        data: customer,
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const updateCustomerService = async ({
  body,
  id,
  options: { omitFields },
}: {
  id: string;
  body: {
    name: string;
    email: string;
    phone: string;
    address: string;
    price: number;
    quantity: number;
    lunchPrice: number;
    dinnerPrice: number;
    lunchQuantity: number;
    dinnerQuantity: number;
    paymentFrequency: "daily" | "weekly" | "monthly";
    paymentStatus: "paid" | "partially_paid" | "unpaid";
    isActive: boolean;
  };
  options: { omitFields: any };
}) => {
  // Validate ID
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid ID"),
    };
  }

  // Validate the data
  const parsedBody = customerValidation
    .omit(omitFields)
    .partial()
    .safeParse(body);

  if (!parsedBody.success) {
    return {
      error: schemaValidationError(parsedBody.error, "Invalid request body"),
    };
  }

  try {
    // Check if customer exists
    const customer = await Customer.findOne({
      _id: parsed.data.id,
      isDelete: false,
    });

    if (!customer) {
      return {
        error: {
          message: "Customer not found with the provided ID",
          success: false,
        },
      };
    }

    // Check if any field is provided
    if (Object.keys(parsedBody.data).length === 0) {
      return {
        success: {
          success: true,
          message:
            "No any valid data provided. Returning existing customer data.",
          data: customer,
        },
      };
    }

    // Update only provided fields
    Object.assign(customer, parsedBody.data);
    await customer.save();

    // Response
    return {
      success: {
        success: true,
        message: "Customer updated successfully",
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const setScheduleService = async ({
  actor,
  body,
}: {
  actor: ICustomerDoc;
  body: {
    schedule: {
      date: string;
      lunch: boolean;
      dinner: boolean;
      lunchQuantity?: number;
      dinnerQuantity?: number;
    }[];
  };
}) => {
  const parsed = scheduleSchema.safeParse(body.schedule);
  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid schedule data"),
    };
  }

  if (parsed.data.length > 7) {
    return {
      error: {
        message: "You can only set schedule for up to 7 days",
      },
    };
  }

  try {
    const today = startOfDay(new Date());
    const uniqueDates = new Set<string>();
    const cleanSchedule = [];

    for (const entry of parsed.data) {
      const dateObj = startOfDay(parseISO(entry.date));

      if (isBefore(dateObj, today)) continue;

      if (uniqueDates.has(entry.date)) {
        return {
          error: {
            message: `Duplicate date found: ${entry.date}`,
          },
        };
      }

      if (entry.lunch && (!entry.lunchQuantity || entry.lunchQuantity <= 0)) {
        return {
          error: {
            message: `Lunch quantity required for ${entry.date}`,
          },
        };
      }

      if (
        entry.dinner &&
        (!entry.dinnerQuantity || entry.dinnerQuantity <= 0)
      ) {
        return {
          error: {
            message: `Dinner quantity required for ${entry.date}`,
          },
        };
      }

      uniqueDates.add(entry.date);
      cleanSchedule.push({
        ...entry,
        lunch: entry.lunch ?? false,
        dinner: entry.dinner ?? false,
      });
    }

    console.log(cleanSchedule);

    actor.schedule = cleanSchedule;
    await actor.save();

    return {
      success: {
        success: true,
        message: "Schedule saved successfully",
        data: actor.schedule,
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const deleteCustomerService = async (id: string) => {
  // Validate ID
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid ID"),
    };
  }

  try {
    // Check if customer exists
    const customer = await Customer.findById(parsed.data.id);
    if (!customer) {
      return {
        error: {
          message: "Customer not found with the provided ID",
          success: false,
        },
      };
    }

    // Delete customer
    customer.isDelete = true;
    await customer.save();

    // Response
    return {
      success: {
        success: true,
        message: "Customer deleted successfully",
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};
