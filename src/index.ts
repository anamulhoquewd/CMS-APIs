import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config } from "dotenv";
import { connectDB } from "@/config/db";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { logger } from "hono/logger";
import { notFound } from "@/middlewares";
import { auth as authService } from "@/services";
import { users, customers, auth as authRoute, orders } from "@/routes";

config();

// Config MongoDB
connectDB()
  .then(async () => {
    // Call the Super Admin Service function after connecting to MongoDB
    const result = await authService.superAdminService();

    if (result.success) {
      console.log(result.message || "Super created successfully!");
    } else {
      console.log(result.error?.message);
    }
  })
  .catch((error: any) => {
    console.error("Failed to initialize super admin:", error);
  });

export const runtime = "nodejs";

const DOMAIN = process.env.DOMAIN_URL || "http://localhost:3200";

const app = new Hono().basePath("/api/v2");

// Initialize middlewares
app.use("*", logger(), prettyJSON());

// Cors
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? DOMAIN : "http://localhost:3001", // Your frontend URL
    credentials: true, // Allow cookies
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Ensure OPTIONS is handled
    allowHeaders: ["Content-Type", "Authorization"], // Allow necessary headers
  })
);

// Health checkm,
app.get("/health", (c) => c.text("API is healthy!"));

// Auth Routes
app.route("/auth", authRoute);

// Users Routes
app.route("/users", users);

// Customers Routes
app.route("/customers", customers);

// Orders Routes
app.route("/orders", orders);

// Global Error Handler
app.onError((error: any, c) => {
  console.error("error: ", error);
  return c.json(
    {
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    },
    500
  );
});

// Not Found Handler
app.notFound((c) => {
  const error = notFound(c);
  return error;
});

const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
