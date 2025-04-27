import { Context } from "hono";
import { defaults } from "../config/defaults";
import { badRequestHandler, serverErrorHandler } from "../middlewares";
import {
  deleteCustomerService,
  getCustomersService,
  getSingleCustomerService,
  registerCustomerService,
  updateCustomerService,
  regenerateAccessKeyService,
  customerAccessService,
  getCustomerCountService,
  getCustomerIdsService,
} from "../services";

// 🔹 Get All customers
const getCustomers = async (c: Context) => {
  const page = parseInt(c.req.query("page") as string, 10) || defaults.page;
  const limit = parseInt(c.req.query("limit") as string, 10) || defaults.limit;
  const search = c.req.query("search") || defaults.search;
  const sortBy = c.req.query("sortBy") || defaults.sortBy;
  const sortType = c.req.query("sortType") || defaults.sortType;
  const active = c.req.query("active");

  const activity = active === "false" ? false : active === "true" ? true : "";

  const response = await getCustomersService({
    page,
    limit,
    sortType,
    sortBy,
    search,
    active: activity,
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success);
};

const getCustomerIds = async (c: Context) => {
  const response = await getCustomerIdsService();

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// 🔹 Count how many users I have.
const getCustomerCount = async (c: Context) => {
  const response = await getCustomerCountService();

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// 🔹 Register User
const registerCustomer = async (c: Context) => {
  const body = await c.req.json();

  const response = await registerCustomerService(body);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 201);
};

// 🔹 Get Single Customer
const getSingleCustomer = async (c: Context) => {
  const id = c.req.param("id");
  const pPage = parseInt(c.req.query("pPage") as string, 10) || defaults.page; // 🔹 p for payments
  const oPage = parseInt(c.req.query("oPage") as string, 10) || defaults.page; // 🔹 o for orders
  const limit = parseInt(c.req.query("limit") as string, 10) || defaults.limit;
  const sortBy = c.req.query("sortBy") || defaults.sortBy;
  const sortType = c.req.query("sortType") || defaults.sortType;

  const response = await getSingleCustomerService({
    id,
    queryParams: {
      pPage,
      oPage,
      limit,
      sortBy,
      sortType,
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

// 🔹 Update Customer
const updateCustomer = async (c: Context) => {
  const id = c.req.param("id");

  const body = await c.req.json();

  const response = await updateCustomerService({ body, id });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// 🔹 Delete Customer
const deleteCustomer = async (c: Context) => {
  const id = c.req.param("id");

  const response = await deleteCustomerService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// 🔹 Regenerate Access Key
const regenerateAccessKey = async (c: Context) => {
  const id = c.req.query("id");

  if (!id) {
    return badRequestHandler(c, {
      msg: "Invalid query parameters",
      fields: [
        {
          name: "id",
          message: "ID is required",
        },
      ],
    });
  }

  const response = await regenerateAccessKeyService(id);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 201);
};

// 🔹 Customer access their own account with access key
const customerAccess = async (c: Context) => {
  const pPage = parseInt(c.req.query("pPage") as string, 10) || defaults.page; // 🔹 p for payments
  const oPage = parseInt(c.req.query("oPage") as string, 10) || defaults.page; // 🔹 o for orders
  const limit = parseInt(c.req.query("limit") as string, 10) || defaults.limit;
  const sortBy = c.req.query("sortBy") || defaults.sortBy;
  const sortType = c.req.query("sortType") || defaults.sortType;
  const fromDate = c.req.query("fromDate") || null;
  const toDate = c.req.query("toDate") || null;

  // Access key
  const key = c.req.query("key");

  const response = await customerAccessService({
    key,
    queryParams: {
      pPage,
      oPage,
      limit,
      sortBy,
      sortType,
      fromDate,
      toDate,
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

export {
  getCustomers,
  registerCustomer,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
  regenerateAccessKey,
  customerAccess,
  getCustomerCount,
  getCustomerIds,
};
