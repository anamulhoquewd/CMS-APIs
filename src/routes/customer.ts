import { customer } from "@/controllers";
import { combinedProtect, customerProtect, protect } from "@/middlewares";
import { Hono } from "hono";

const customers = new Hono();

// Get All customers
customers.get("/", protect, (c) => customer.getCustomers(c));

// Set schedule
customers.patch("/schedule", customerProtect, (c) => customer.setSchedule(c));

// Get Single Customer
customers.get("/:id", protect, (c) => customer.getSingleCustomer(c));

// Update Customer
customers.put("/:id", customerProtect, (c) => customer.updateCustomer(c));

// Delete Customer
customers.delete("/:id", combinedProtect, (c) => customer.deleteCustomer(c));

export default customers;
