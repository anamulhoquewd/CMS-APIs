import { defaults } from "@/config/defaults";
import { badRequestHandler, serverErrorHandler } from "@/middlewares";
import { Context } from "hono";
import { customer } from "@/services";

// Get All customers
export const getCustomers = async (c: Context) => {
  const page = parseInt(c.req.query("page") as string, 10) || defaults.page;
  const limit = parseInt(c.req.query("limit") as string, 10) || defaults.limit;
  const search = c.req.query("search");
  const sortBy = c.req.query("sortBy") || defaults.sortBy;
  const sortType = c.req.query("sortType") || defaults.sortType;
  const isActive = c.req.query("isActive");
  const isDelete = c.req.query("isDelete");

  const activity =
    isActive === "false" ? false : isActive === "true" ? true : "";
  const isDeleted = isDelete === "true" ? true : false;

  const response = await customer.getCustomersService({
    page,
    limit,
    sortType,
    sortBy,
    search,
    isActive: activity,
    isDelete: isDeleted,
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success);
};

// Get single customer
export const getSingleCustomer = async (c: Context) => {
  const id = c.req.param("id");

  const response = await customer.getSingleCustomerService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Update Customer
export const updateCustomer = async (c: Context) => {
  const id = c.req.param("id");
  const type = c.req.query("userType");

  const omitFields =
    type === "customer"
      ? {
          password: true,
          avatar: true,
          role: true,
          schedule: true,
          isDelete: true,
          isActive: true,
          paymentStatus: true,
          price: true,
          lunchPrice: true,
          dinnerPrice: true,
        }
      : {
          password: true,
          avatar: true,
          role: true,
          schedule: true,
          isDelete: true,
        };

  const body = await c.req.json();

  const response = await customer.updateCustomerService({
    body,
    id,
    options: {
      omitFields,
    },
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Set schedule
export const setSchedule = async (c: Context) => {
  const actor = c.get("customer");
  const body = await c.req.json();

  const response = await customer.setScheduleService({
    body,
    actor,
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Delete Customer
export const deleteCustomer = async (c: Context) => {
  const id = c.req.param("id");

  const response = await customer.deleteCustomerService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};
