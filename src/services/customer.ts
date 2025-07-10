import { defaults } from "@/config/defaults";
import { pagination } from "@/lib";
import { Customer } from "@/models";
import { schemaValidationError } from "@/utils";
import { sortQueryValidation } from "@/validation/common";
import { customerValidation } from "@/validation/customer";
import { idSchema } from "@/validation/utils";
import { z } from "zod";

export const getCustomersService = async (queryParams: {
  page: number;
  limit: number;
  search: string | undefined;
  sortType: string;
  sortBy: string;
  isActive: boolean | string;
  isDelete: boolean;
}) => {
  const queryValidation = sortQueryValidation.safeParse({
    sortBy: queryParams.sortBy,
    sortType: queryParams.sortType,
  });

  if (!queryValidation.success) {
    return {
      error: schemaValidationError(
        queryValidation.error,
        "Invalid query params"
      ),
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
  const sortField = validSortFields.includes(queryValidation.data.sortBy)
    ? queryValidation.data.sortBy
    : "createdAt";
  const sortDirection =
    queryValidation.data.sortType.toLocaleLowerCase() === "asc" ? 1 : -1;

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
        cocumentCount: total,
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
  const idValidation = idSchema.safeParse({ id });
  if (!idValidation.success) {
    return {
      error: schemaValidationError(idValidation.error, "Invalid ID"),
    };
  }

  try {
    // Check if customer exists
    const customer = await Customer.findOne({
      _id: idValidation.data.id,
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
}: {
  id: string;
  body: any;
}) => {
  // Validate ID
  const idValidation = idSchema.safeParse({ id });
  if (!idValidation.success) {
    return {
      error: schemaValidationError(idValidation.error, "Invalid ID"),
    };
  }

  // Validate the data
  const bodyValidation = customerValidation.partial().safeParse(body);
  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  try {
    // Check if customer exists
    const customer = await Customer.findById(idValidation.data.id);

    if (!customer) {
      return {
        error: {
          message: "Customer not found with the provided ID",
        },
      };
    }

    // Check if any field is provided
    if (Object.keys(bodyValidation.data).length === 0) {
      return {
        success: {
          success: true,
          message: "Customer not found with the provided ID",
          data: customer,
        },
      };
    }

    // Update only provided fields
    Object.assign(customer, bodyValidation.data);
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

export const deleteCustomerService = async (id: string) => {
  // Validate ID
  const idValidation = idSchema.safeParse({ id });
  if (!idValidation.success) {
    return {
      error: schemaValidationError(idValidation.error, "Invalid ID"),
    };
  }

  try {
    // Check if customer exists
    const customer = await Customer.findById(idValidation.data.id);
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
