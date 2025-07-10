import { defaults } from "@/config/defaults";
import { pagination } from "@/lib";
import { User } from "@/models";
import { schemaValidationError } from "@/utils";
import { sortQueryValidation } from "@/validation/common";
import { userValidation } from "@/validation/user";
import { idSchema } from "@/validation/utils";
import { z } from "zod";

export const getUsersService = async (queryParams: {
  page: number;
  limit: number;
  search: string | undefined;
  sortBy: string;
  sortType: string;
  role: string | undefined;
  isActive: boolean | string;
  isDelete: boolean;
}) => {
  console.log(queryParams);
  // Safe Parse for better error handling
  const queryValidation = sortQueryValidation
    .extend({
      role: z.enum(["admin", "manager", "super_admin", ""]).optional(),
    })
    .safeParse({
      sortBy: queryParams.sortBy,
      sortType: queryParams.sortType,
      role: queryParams.role,
    });

  // Return error if validation fails
  if (!queryValidation.success) {
    return {
      error: schemaValidationError(
        queryValidation.error,
        "Invalid query parameters"
      ),
    };
  }

  try {
    // Build query
    const query: any = {
      isDelete: false,
    };
    if (queryParams.isActive) query.isActive = queryParams.isActive;
    if (queryParams.isDelete) query.isDelete = queryParams.isDelete;
    if (queryParams.search) {
      query.$or = [
        { name: { $regex: queryParams.search, $options: "i" } },
        { email: { $regex: queryParams.search, $options: "i" } },
        { phone: { $regex: queryParams.search, $options: "i" } },
        { NID: { $regex: queryParams.search, $options: "i" } },
      ];
    }

    if (queryValidation.data.role) {
      query.role = queryValidation.data.role;
    }

    // Allowable sort fields
    const validSortFields = ["createdAt", "updatedAt", "name", "email"];
    const sortField = validSortFields.includes(queryParams.sortBy)
      ? queryParams.sortBy
      : "createdAt";
    const sortDirection =
      queryValidation.data.sortType.toLocaleLowerCase() === "asc" ? 1 : -1;

    // Fetch users
    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ [sortField]: sortDirection })
        .skip((queryParams.page - 1) * queryParams.limit)
        .limit(queryParams.limit)
        .exec(),

      User.countDocuments(query),
    ]);

    // Pagination
    const getPagination = pagination({
      page: queryParams.page,
      limit: queryParams.limit,
      total,
    });

    return {
      success: {
        success: true,
        message: "Users fetched successfully",
        data: users,
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

export const getSingleUserService = async (id: string) => {
  // Validate ID
  const idValidation = idSchema.safeParse({ id });
  if (!idValidation.success) {
    return { error: schemaValidationError(idValidation.error, "Invalid ID") };
  }

  try {
    // Check if user exists
    const user = await User.findOne({
      _id: idValidation.data.id,
      isDelete: false,
    });

    if (!user) {
      return {
        error: {
          success: false,
          message: "User not found with the provided ID",
        },
      };
    }

    return {
      success: {
        success: true,
        message: "User fetched successfully",
        data: user,
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

export const updateUserService = async ({
  id,
  body,
}: {
  id: string;
  body: {
    active: boolean;
    name: string;
    email: string;
    phone: string;
    NID: string;
    address: string;
    role: "admin" | "manager";
  };
}) => {
  // Validate ID
  const idValidation = idSchema.safeParse({ id });
  if (!idValidation.success) {
    return { error: schemaValidationError(idValidation.error, "Invalid ID") };
  }

  // Validate Body
  const bodyValidation = userValidation.partial().safeParse(body);
  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  try {
    // Check if user exists
    const user = await User.findById(idValidation.data.id);

    if (!user) {
      return {
        error: {
          message: "User not fount with the provided ID",
        },
      };
    }

    // Check if all fields are empty
    if (Object.keys(bodyValidation.data).length === 0) {
      return {
        success: {
          success: true,
          message: "No updates provided, returning existing user",
          data: user,
        },
      };
    }

    // Update only provided fields
    Object.assign(user, bodyValidation.data);
    const docs = await user.save();

    return {
      success: {
        success: true,
        message: "User updated successfully",
        data: docs,
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

export const updateProfileService = async ({
  user,
  body,
}: {
  user: any;
  body: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}) => {
  const bodySchema = z.object({
    name: z.string().min(3).max(50).optional(),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(
        /^01\d{9}$/,
        "Phone number must start with 01 and be exactly 11 digits"
      )
      .optional(),
    address: z.string().max(100).optional(),
  });

  // Validate Body
  const bodyValidation = bodySchema.safeParse(body);

  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  try {
    // Check if all fields are empty
    if (Object.keys(bodyValidation.data).length === 0) {
      return {
        success: {
          success: true,
          message: "No updates provided, returning existing user",
          data: user,
        },
      };
    }

    // Update only provided fields
    Object.assign(user, bodyValidation.data);

    console.log(user);

    const docs = await user.save();

    return {
      success: {
        success: true,
        message: "User updated successfully",
        // data: docs,
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

export const deleteUserService = async (id: string) => {
  // Validate ID
  const idValidation = idSchema.safeParse({ id });
  if (!idValidation.success) {
    return { error: schemaValidationError(idValidation.error, "Invalid ID") };
  }

  try {
    // Delete user
    const user = await User.findById(idValidation.data.id);

    if (!user) {
      return {
        error: {
          success: false,
          message: "User not found with the provided ID",
        },
      };
    }

    if (user.role === "super_admin") {
      return {
        error: {
          success: false,
          message: "Super admin cannot be deleted",
        },
      };
    }

    // Delete user
    user.isDelete = true;
    await user.save();

    // Response
    return {
      success: {
        success: true,
        message: "User deleted successfully",
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
