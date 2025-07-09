import transporter from "@/config/email";
import { changePassword } from "@/controllers/auth";
import { ICustomerDoc } from "@/interface/customer";
import { IUserDoc } from "@/interface/user";
import { generateAccessToken, generateRefreshToken } from "@/lib";
import { Customer, User } from "@/models";
import { schemaValidationError, stringGenerator } from "@/utils";
import {
  changePasswordForm,
  forgotPasswordForm,
  loginFormValidation,
  resetPasswordForm,
  resetTokenValidation,
} from "@/validation/auth";
import { customerValidation } from "@/validation/customer";
import { userValidation } from "@/validation/user";
import { verify } from "hono/jwt";
import { config } from "dotenv";

config();

type LoginPayload = {
  email: string;
  phone: string;
  password: string;
};

type LoginOptions = {
  userType: "user" | "customer";
};

// Get environment variables
const EMAIL_USER = process.env.EMAIL_USER
  ? process.env.EMAIL_USER
  : "example@example.com";

// Get environment variables
const name = process.env.ADMIN_NAME;
const email = process.env.ADMIN_EMAIL;
const phone = process.env.ADMIN_PHONE;
const password = process.env.ADMIN_PASSWORD;
const NID = process.env.ADMIN_NID;

export const registerUserService = async (body: IUserDoc) => {
  // Validate Body

  // Safe Parse for better error handling
  const bodyValidation = userValidation.safeParse(body);

  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  // Destructure Body
  const { name, email, phone, address, NID, role } = bodyValidation.data;

  // Check if role is super admin
  if (role === "super_admin") {
    return {
      error: {
        message: "You cannot register a user as a super admin.",
        fields: [
          {
            name: "role",
            message: "You cannot register a user as a super admin.",
          },
        ],
      },
    };
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { NID }, { phone }],
    });

    if (existingUser) {
      return {
        error: {
          msg: "User already exists",
          fields: [
            {
              name: "email",
              message: "Email must be unique",
            },
            {
              name: "NID",
              message: "NID must be unique",
            },
            {
              name: "phone",
              message: "Phone must be unique",
            },
          ],
        },
      };
    }

    // Generate Password
    const generatedPassword = stringGenerator(8);

    // Create User
    const user = new User({
      name,
      email,
      phone,
      password: generatedPassword,
      address,
      NID,
      role,
    });

    // Save User
    const docs = await user.save();

    // Send Email to User
    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Your Account Details",
      text: `Hello ${name},\n\nYour account has been created successfully. Here are your login details:\n\nEmail: ${email}\nPassword: ${generatedPassword}\n\nPlease log in and change your password immediately for security.\n\nThank you!`,
    };

    // Send Email
    // await transporter.sendMail(mailOptions);

    return {
      success: {
        success: true,
        message: "User created successfully",
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

export const registerCustomerService = async (body: ICustomerDoc) => {
  // Validate the data
  const bodyValidation = customerValidation.safeParse(body);
  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  const {
    name,
    phone,
    email,
    password,
    address,
    paymentFrequency,
    price,
    quantity,
  } = bodyValidation.data;

  try {
    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ phone }, { email }],
    });

    if (existingCustomer) {
      return {
        error: {
          msg: "Customer already exists",
          fields: [
            {
              name: "email",
              message: "Email must be unique",
            },
            {
              name: "phone",
              message: "Phone must be unique",
            },
          ],
        },
      };
    }

    // Create new customer
    const customer = new Customer({
      name,
      phone,
      email,
      password,
      address,
      paymentFrequency,
      price,
      quantity,
    });

    // Save customer
    const docs = await customer.save();

    // Response
    return {
      success: {
        success: true,
        message: "Customer created successfully",
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

export const superAdminService = async () => {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: "super_admin" });

    if (existingSuperAdmin) {
      return {
        success: false,
        error: {
          message: "Super Admin already exists",
        },
      };
    }

    // Safe Parse for better error handling
    const bodyValidation = userValidation.safeParse({
      name,
      email,
      phone,
      password,
      NID,
      role: "super_admin",
    });

    if (!bodyValidation.success) {
      return {
        success: false,
        error: {
          message: "Validation error",
        },
      };
    }

    // Create Super Admin
    const user = new User({
      name: bodyValidation.data.name,
      email: bodyValidation.data.email,
      phone: bodyValidation.data.phone,
      password: bodyValidation.data.password,
      NID: bodyValidation.data.NID,
      role: bodyValidation.data.role,
    });

    // Save Super Admin
    const docs = await user.save();

    // Response
    return {
      message: "Super Admin created successfully!",
      success: true,
      data: docs,
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const loginService = async (
  body: LoginPayload,
  options: LoginOptions
) => {
  const bodyValidation = loginFormValidation.safeParse(body);

  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  const { email, phone, password } = bodyValidation.data;
  const { userType } = options;

  try {
    // Find by email or phone
    const query: Record<string, any> = {};
    if (email) {
      query.email = email;
    } else if (phone) {
      query.phone = phone;
    }
    const account =
      userType === "user"
        ? await User.findOne(query)
        : await Customer.findOne(query);

    console.log(account, query);

    if (!account) {
      return {
        error: {
          msg: "Invalid credentials",
          fields: [
            {
              name: "email",
              message: "User not found with this email or phone",
            },
          ],
        },
      };
    }

    // Match password
    if (!(await account.matchPassword(password))) {
      return {
        error: {
          message: "Invalid credentials",
          fields: [
            {
              name: "password",
              message: "Password is incorrect",
            },
          ],
        },
      };
    }

    // Generate tokens using type-based payload
    const payload = {
      id: account._id,
      role: account.role,
      identifier: account.email ?? account.phone,
    };

    const accessToken = await generateAccessToken({
      account: payload,
      expMinutes: 60 * 2,
    });
    const refreshToken = await generateRefreshToken({ account: payload });

    // store refresh tokens. allow only 2 devices at a time logged in.
    account.refreshTokens = account.refreshTokens || [];
    if (!account.refreshTokens.includes(refreshToken)) {
      account.refreshTokens.push(refreshToken);
    }
    if (account.refreshTokens.length > 2) {
      account.refreshTokens = account.refreshTokens.slice(-2);
    }

    await account.save();

    return {
      success: {
        success: true,
        message: "Login successfully!",
        tokens: {
          accessToken,
          refreshToken,
        },
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

export const refreshTokenService = async (refreshToken: string) => {
  try {
    const token = await verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    if (!token) throw new Error("Invalid refresh token");

    const { id, role, identifier } = token as {
      id: string;
      role: "super_admin" | "admin" | "manager" | "customer";
      identifier: string;
    };

    let account: any;

    if (role === "customer") {
      account = await Customer.findOne({
        _id: id,
        refreshTokens: { $in: [refreshToken] },
      });
    } else {
      // for admin, manager, super_admin
      account = await User.findOne({
        _id: id,
        refreshTokens: { $in: [refreshToken] },
      });
    }

    if (!account) {
      return {
        authorizationError: {
          success: false,
          message: "Refresh token expired. Please login again.",
        },
      };
    }

    const newAccessToken = await generateAccessToken({
      account: {
        id,
        role,
        identifier,
      },
      expMinutes: 60 * 2,
    });

    return {
      success: {
        success: true,
        message: "Token refreshed",
        tokens: {
          accessToken: newAccessToken,
        },
      },
    };
  } catch (error: any) {
    const isExpired = error?.name === "JwtTokenExpired";

    if (error.name === "JwtTokenExpired") {
      return {
        authorizationError: {
          success: false,
          message: "Refresh token expired. Please login again.",
        },
      };
    }

    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const logoutService = async ({
  role,
  id,
  rToken,
}: {
  role: "admin" | "manager" | "super_admin" | "customer";
  id: string;
  rToken: string;
}) => {
  try {
    let result: any;

    if (role === "customer") {
      result = await Customer.findByIdAndUpdate(id, {
        $pull: { refreshTokens: rToken },
      });
    } else {
      result = await User.findByIdAndUpdate(id, {
        $pull: { refreshTokens: rToken },
      });
    }

    if (result.matchedCount === 0 || result.modifiedCount === 0) {
      return {
        authenticationError: {
          success: false,
          message: "User not found during refresh token removal.",
        },
      };
    }

    return {
      success: {
        success: true,
        message: "Logged out successfully.",
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

export const changePasswordService = async ({
  account,
  body,
}: {
  account: any;
  body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
}) => {
  // Safe Parse for better error handling
  const bodyValidation = changePasswordForm.safeParse(body);

  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  // Destructure Body
  const { currentPassword, newPassword } = bodyValidation.data;

  try {
    // Validate password
    if (!(await account.matchPassword(currentPassword))) {
      return {
        error: {
          msg: "Current password is incorrect",
          fields: [
            {
              name: "currentPassword",
              message: "Current Password is incorrect",
            },
          ],
        },
      };
    }

    // Update password
    account.password = newPassword;
    await account.save();

    // Response
    return {
      success: {
        success: true,
        message: "Password changed successfully",
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

export const forgotPasswordService = async (email: string) => {
  const bodyValidation = forgotPasswordForm.safeParse({ email });

  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  try {
    const validatedEmail = bodyValidation.data.email;
    let account: any;

    // Search in User
    account = await User.findOne({ email: validatedEmail });

    // If not found in User, search in Customer
    if (!account) {
      account = await Customer.findOne({ email: validatedEmail });
    }

    if (!account) {
      return {
        error: {
          msg: "Account not found with this email",
          fields: [
            {
              name: "email",
              message: "No user or customer found with this email",
            },
          ],
        },
      };
    }

    // Generate reset token
    const resetToken = account.generatePasswordResetToken(60 * 2);
    await account.save();

    // Create reset link
    const resetUrl = `${process.env.DOMAIN}/auth/reset-password/${resetToken}`;

    // Send reset link via email
    const mailOptions = {
      from: EMAIL_USER,
      to: validatedEmail,
      subject: "Reset your password",
      text: `Hello ${account.name},\n\nClick the link below to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email. This token will expire in 30 minutes.\n\nBest regards,\n${name}`,
    };

    // await transporter.sendMail(mailOptions);

    return {
      success: {
        success: true,
        message: "Password reset link sent successfully.",
        token: resetToken, // optional: for testing
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

export const resetPasswordService = async ({
  password,
  resetToken,
}: {
  password: string;
  resetToken: string;
}) => {
  const bodyValidation = resetPasswordForm.safeParse({ password });
  const tokenValidation = resetTokenValidation.safeParse({ resetToken });

  // Validate password
  if (!bodyValidation.success) {
    return {
      error: schemaValidationError(
        bodyValidation.error,
        "Invalid request body"
      ),
    };
  }

  // Validate token
  if (!tokenValidation.success) {
    return {
      error: {
        message: "Token Validation error",
        fields: tokenValidation.error.issues.map((issue) => ({
          name: String(issue.path[0]),
          message: issue.message,
        })),
      },
    };
  }

  const token = tokenValidation.data.resetToken;
  const passwordValue = bodyValidation.data.password;

  try {
    let account: any;
    let accountType: "user" | "customer" = "user";

    // Search token in User
    account = await User.findOne({
      passwordResetToken: token,
      passwordResetExpireDate: { $gt: Date.now() },
    });

    // If not found, search in Customer
    if (!account) {
      account = await Customer.findOne({
        passwordResetToken: token,
        passwordResetExpireDate: { $gt: Date.now() },
      });
      accountType = "customer";
    }

    if (!account) {
      return {
        error: {
          success: false,
          message: "Invalid or expired reset token",
        },
      };
    }

    // ✅ Set new password & clear reset fields
    account.password = passwordValue;
    account.passwordResetToken = null;
    account.passwordResetExpireDate = null;

    await account.save();

    return {
      success: {
        success: true,
        message: `Password reset successfully for ${accountType}`,
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
