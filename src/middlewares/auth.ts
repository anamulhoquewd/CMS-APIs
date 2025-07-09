import { Context, Next } from "hono";
import { authenticationError, authorizationError } from "./errors";
import { verify } from "hono/jwt";
import { User, Customer } from "@/models";
import { config } from "dotenv";

config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;

// 🔐 Extract and verify token helper
const extractAndVerifyToken = async (c: Context) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return null;

  try {
    const payload = await verify(token, JWT_ACCESS_SECRET);
    return payload as { id: string; role?: string };
  } catch {
    return null;
  }
};

// 🔐 Protect user only
const protect = async (c: Context, next: Next) => {
  const payload = await extractAndVerifyToken(c);
  if (!payload) return authenticationError(c);

  const user = await User.findById(payload.id);
  if (!user || user.isDelete) return authenticationError(c);

  c.set("user", user);
  return next();
};

// 🔐 Protect customer only
const customerProtect = async (c: Context, next: Next) => {
  const payload = await extractAndVerifyToken(c);
  if (!payload) return authenticationError(c);

  const customer = await Customer.findById(payload.id);
  if (!customer || customer.isDelete) return authenticationError(c);

  c.set("customer", customer);
  return next();
};

// 🔐 Combined protect for both user and customer
const combinedProtect = async (c: Context, next: Next) => {
  const payload = await extractAndVerifyToken(c);
  if (!payload) return authenticationError(c);

  const [user, customer] = await Promise.all([
    User.findById(payload.id),
    Customer.findById(payload.id),
  ]);

  if (user && !user.isDelete) {
    c.set("user", user);
    return next();
  }

  if (customer && !customer.isDelete) {
    c.set("customer", customer);
    return next();
  }

  return authenticationError(c);
};

// 🔐 Role-based authorization (user or customer)
const authorizeAccess =
  (roles: Array<"admin" | "manager" | "super_admin" | "customer"> = []) =>
  async (c: Context, next: Next) => {
    const user = c.get("user");
    const customer = c.get("customer");

    if (!user && !customer) return authenticationError(c);

    const actor = user || customer;
    const role = actor.role;

    if (role === "super_admin") return next(); // Full access
    if (roles.includes(role)) return next();

    return authorizationError(c);
  };

// 🔐 Admin-only authorize (user must exist)
const authorize =
  (roles: Array<"admin" | "manager" | "super_admin"> = ["super_admin"]) =>
  async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) return authenticationError(c);
    if (user.role === "super_admin") return next();
    if (roles.includes(user.role)) return next();

    return authorizationError(c);
  };

// ✅ Optional: only for customer route
const authorizeCustomer = async (c: Context, next: Next) => {
  const customer = c.get("customer");
  if (!customer) return authenticationError(c);
  return next();
};

export {
  protect,
  customerProtect,
  combinedProtect,
  authorize,
  authorizeAccess,
  authorizeCustomer,
};
