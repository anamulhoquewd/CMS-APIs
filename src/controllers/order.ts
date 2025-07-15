import { defaults } from "@/config/defaults";
import {
  authenticationError,
  badRequestHandler,
  serverErrorHandler,
} from "@/middlewares";
import { order } from "@/services";
import { Context } from "hono";

export const registerOrder = async (c: Context) => {
  const body = await c.req.json();

  // Search in User
  const tokenPayload = (await c.get("user")) || c.get("customer");

  if (!tokenPayload) {
    return authenticationError(c);
  }

  const response = await order.registerOrderService({
    actor: tokenPayload,
    body,
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 201);
};

export const generateOrder = async (c: Context) => {
  // Search in User
  const tokenPayload = await c.get("user");

  if (!tokenPayload) {
    return authenticationError(c);
  }

  const response = await order.generateOrdersFromSchedule({
    role: tokenPayload.role,
    id: tokenPayload._id,
  });

  // if (response.error) {
  //   return badRequestHandler(c, response.error);
  // }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 201);
};

// Get All orders
export const getOrders = async (c: Context) => {
  const page = parseInt(c.req.query("page") as string, 10) || defaults.page;
  const limit = parseInt(c.req.query("limit") as string, 10) || defaults.limit;
  const sortBy = c.req.query("sortBy") || defaults.sortBy;
  const sortType = c.req.query("sortType") || defaults.sortType;
  const customerId = c.req.query("customerId");
  const date = c.req.query("date");
  const fromDate = c.req.query("fromDate");
  const toDate = c.req.query("toDate");

  const response = await order.getOrdersService({
    page,
    limit,
    sortType,
    sortBy,
    customerId,
    date,
    dateRange: { from: fromDate, to: toDate },
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success);
};

// Get single order
export const getSingleOrder = async (c: Context) => {
  const id = c.req.param("id");

  const response = await order.getSingleOrderService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Delete Order
export const deleteOrder = async (c: Context) => {
  const id = c.req.param("id");

  const response = await order.deleteOrderService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};
