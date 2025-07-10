import { defaults } from "@/config/defaults";
import {
  authenticationError,
  badRequestHandler,
  serverErrorHandler,
} from "@/middlewares";
import { user } from "@/services";
import { Context } from "hono";

// Get all users
export const getUsers = async (c: Context) => {
  const page = parseInt(c.req.query("page") as string, 10) || defaults.page;
  const limit = parseInt(c.req.query("limit") as string, 10) || defaults.limit;
  const search = c.req.query("search");
  const sortBy = c.req.query("sortBy") || defaults.sortBy;
  const sortType = c.req.query("sortType") || defaults.sortType;
  const role = c.req.query("role");
  const isActive = c.req.query("isActive");
  const isDelete = c.req.query("isDelete");

  const activity =
    isActive === "false" ? false : isActive === "true" ? true : "";
  const isDeleted = isDelete === "true" ? true : false;

  const response = await user.getUsersService({
    page,
    limit,
    search,
    sortBy,
    sortType,
    role,
    isActive: activity,
    isDelete: isDeleted,
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Get Single User
export const getSingleUser = async (c: Context) => {
  const id = c.req.param("id");

  const response = await user.getSingleUserService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Update User
export const updateUser = async (c: Context) => {
  const id = c.req.param("id");

  const body = await c.req.json();

  const authenticated = c.get("user");
  const isSelfUpdate = authenticated._id.toString() === id.toString();

  // If super admin want to change to admin or manager. he is can't. becuase he is super admin.
  if (isSelfUpdate && authenticated.role === "super_admin") {
    if (body.role && body.role !== "super_admin") {
      body.role = "super_admin";
    }
  }

  const response = await user.updateUserService({ id, body });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Update profile
export const updateProfile = async (c: Context) => {
  // Get user from auth token
  const authenticated = c.get("user");

  if (!authenticated) {
    return authenticationError(c);
  }

  const body = await c.req.json();

  const response = await user.updateProfileService({
    user: authenticated,
    body,
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// 🔹 Delete User
export const deleteUser = async (c: Context) => {
  const id = c.req.param("id");

  const response = await user.deleteUserService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};
