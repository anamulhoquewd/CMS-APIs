import { authorize, protect, combinedProtect } from "@/middlewares";
import { Hono } from "hono";
import { auth as authController } from "@/controllers";

const auth = new Hono();

// Create User (Only super admin)
auth.post("/users/register", protect, authorize(["admin"]), (c) =>
  authController.registerUser(c)
);

// Create new customer (Public)
auth.post("/customers/register", (c) => authController.registerCustomer(c));

// Login
auth.post("/login", (c) => authController.loginUser(c));

// Refresh token
auth.post("/refresh", combinedProtect, (c) => authController.refreshToken(c));

// Logout
auth.post("/logout", combinedProtect, (c) => authController.logout(c));

// Change Password (Private)
auth.patch("/change-password", combinedProtect, (c) =>
  authController.changePassword(c)
);

// Forgot Password request (Public)
auth.post("/forgot-password", (c) => authController.forgotPassword(c));

// Reset Password (Public)
auth.put("/reset-password/:resetToken", (c) => authController.resetPassword(c));

// Get me
auth.get("/me", combinedProtect, (c) => authController.getMe(c));

// Upload Profile Picture
auth.post("/uploads-avatar", combinedProtect, (c) =>
  authController.changeAvatar(c)
);

export default auth;
