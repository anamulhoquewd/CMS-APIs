import { customer } from "@/controllers";
import { combinedProtect, protect } from "@/middlewares";
import { Hono } from "hono";

const customers = new Hono();

// 🔹 Get All customers (Private)
customers.get("/", protect, (c) => customer.getCustomers(c));

// 🔹 Get Single Customer (Private)
customers.get("/:id", protect, (c) => customer.getSingleCustomer(c));

// 🔹 Update Customer (Private)
customers.put("/:id", combinedProtect, (c) => customer.updateCustomer(c));

// 🔹 Delete Customer (Only admin)
customers.delete("/:id", combinedProtect, (c) => customer.deleteCustomer(c));

export default customers;
