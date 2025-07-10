import { z } from "zod";

const loginFormValidation = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .length(11, "Phone number must be 11 characters long")
      .optional(),
    password: z.string().min(8).max(20),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"], // Can also use "phone" or leave empty
  });

const changePasswordForm = z
  .object({
    currentPassword: z.string().min(8).max(20),
    newPassword: z.string().min(8).max(20),
    confirmPassword: z.string().min(8).max(20),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const forgotPasswordForm = z.object({
  email: z.string().email(),
});

// Validate Body
const resetPasswordForm = z.object({
  password: z.string().min(8).max(20),
});

const resetTokenValidation = z.object({
  resetToken: z.string().refine((val) => val.length === 64, {
    message: "Invalid reset token format",
  }),
});

const avatarValidation = z.object({
  avatar: z
    .instanceof(File, { message: "Invalid file format" })
    .refine((file) => file.size <= 2 * 1024 * 1024, {
      // 2MB max
      message: "File size must be less than 2MB",
    })
    .refine(
      (file) => ["image/jpeg", "image/png", "image/jpg"].includes(file.type),
      {
        message: "Only JPEG, JPG and PNG files are allowed",
      }
    ),
});

export {
  changePasswordForm,
  loginFormValidation,
  forgotPasswordForm,
  resetPasswordForm,
  resetTokenValidation,
  avatarValidation,
};
