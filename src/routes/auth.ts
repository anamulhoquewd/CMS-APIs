import { authorize, protect } from "@/middlewares";
import { Hono } from "hono";
import { auth as authController } from "@/controllers";
import { combinedProtect } from "@/middlewares/auth";

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

export default auth;
