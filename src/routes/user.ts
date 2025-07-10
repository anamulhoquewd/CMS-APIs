import { user } from "@/controllers";
import { authorize, protect } from "@/middlewares";
import { Hono } from "hono";

const users = new Hono();

// Get All Users
users.get("/", protect, (c) => user.getUsers(c));

// Get Single User (Private)
users.get("/:id", protect, (c) => user.getSingleUser(c));

// Update User (Only Super Admin)
users.put("/:id", protect, authorize(), (c) => user.updateUser(c));

// Update Profile (Private)
users.patch("/profile", protect, (c) => user.updateProfile(c));

// Delete User (Only Super Admin)
users.delete("/:id", protect, authorize(), (c) => user.deleteUser(c));

export default users;
