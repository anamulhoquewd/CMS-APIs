import { IOrderItemData } from "@/interface/order";
import { pagination } from "@/lib";
import { Customer, Order, User } from "@/models";
import { schemaValidationError } from "@/utils";
import { sortQueryValidation } from "@/validation/common";
import { orderSchemaValidation } from "@/validation/order";
import { idSchema } from "@/validation/utils";

// Register Order Service Function
export const registerOrderService = async (params: {
  actor: { id: string; role: "customer" | "manager" | "admin" | "super_admin" };
  body: {
    customerId?: string;
    items: ("lunch" | "dinner")[];
    note?: string;
    date: string;
  };
}) => {
  const parsed = orderSchemaValidation.safeParse(params.body);
  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid request body"),
    };
  }

  const {
    items,
    date,
    note,
    lunchPrice,
    dinnerPrice,
    lunchQuantity,
    dinnerQuantity,
  } = parsed.data;

  const { id: actorId, role } = params.actor;

  try {
    const orderDate = new Date(date);

    let customerId = parsed.data.customerId;

    if (role === "customer") {
      customerId = actorId; // override
    }

    if (!customerId) {
      return { error: { message: "Customer ID is required" } };
    }

    const customer = await Customer.findOne({
      _id: customerId,
      isDelete: false,
    });
    if (!customer) {
      return { error: { message: "Customer not found or deleted" } };
    }

    // validations
    if (role !== "customer") {
      const user = await User.findOne({ _id: actorId, isDelete: false });
      if (!user) return { error: { message: "Invalid admin/manager" } };
    } else if (role === "customer" && customerId !== actorId) {
      return { error: { message: "Unauthorized customer request" } };
    }

    // Check for existing orders with conflicting items
    const existingOrder = await Order.findOne({
      customerId,
      date: orderDate,
    });

    if (existingOrder) {
      const existingTypes = existingOrder.items.map((i) => i.type);

      const conflict = items.some((t) => existingTypes.includes(t));

      if (conflict) {
        return {
          error: {
            message:
              "Order already exists for one or more of these items on this date",
          },
        };
      }

      // Merge new items
      const newItems: IOrderItemData[] = [];
      const pushItem = (type: "lunch" | "dinner") => {
        const price =
          (type === "lunch" ? lunchPrice : dinnerPrice) ??
          customer[`${type}Price`] ??
          customer.price;

        const quantity =
          (type === "lunch" ? lunchQuantity : dinnerQuantity) ??
          customer[`${type}Quantity`] ??
          customer.quantity;

        if (!price || !quantity) return;

        newItems.push({
          type,
          price,
          quantity,
          subtotal: price * quantity,
        });
      };

      items.forEach((type) => pushItem(type));

      existingOrder.items.push(...(newItems as any));
      existingOrder.total += newItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );
      if (note) existingOrder.note = note;
      await existingOrder.save();

      return {
        success: {
          success: true,
          message: "Order updated successfully with new items",
          data: existingOrder,
        },
      };
    }

    // No existing order, create new
    const orderItems: IOrderItemData[] = [];

    const pushItem = (type: "lunch" | "dinner") => {
      const price =
        (type === "lunch" ? lunchPrice : dinnerPrice) ??
        customer[`${type}Price`] ??
        customer.price;

      const quantity =
        (type === "lunch" ? lunchQuantity : dinnerQuantity) ??
        customer[`${type}Quantity`] ??
        customer.quantity;

      if (!price || !quantity) return;
      orderItems.push({
        type,
        price,
        quantity,
        subtotal: price * quantity,
      });
    };

    for (const type of items) {
      pushItem(type);
    }

    if (!orderItems.length)
      return { error: { message: "No valid item to order" } };

    const total = orderItems.reduce((acc, curr) => acc + curr.subtotal, 0);

    const order = new Order({
      customerId,
      createdBy: role,
      createdById: actorId,
      items: orderItems,
      total,
      date: orderDate,
      note,
    });

    const docs = await order.save();

    return {
      success: {
        success: true,
        message: "Order created successfully",
        data: docs,
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

// Auto Generate Order From Schedule
export const generateOrdersFromSchedule = async ({
  role,
  id,
}: {
  role: "super_admin" | "admin" | "manager";
  id: string;
}) => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    const customers = await Customer.find({ isDelete: false });

    for (const customer of customers) {
      const schedule = customer.schedule?.find((s) => s.date === todayStr);

      if (!schedule) continue;

      const existing = await Order.findOne({
        customerId: customer._id,
        date: new Date(todayStr),
      });

      console.log("Existing: ", existing);

      if (existing) continue;

      const items: IOrderItemData[] = [];

      const pushItem = (type: "lunch" | "dinner") => {
        const quantity = schedule[`${type}Quantity`] ?? customer.quantity;
        const price = customer[`${type}Price`] ?? customer.price;
        if (!quantity || !price) return;
        items.push({
          type,
          quantity,
          price,
          subtotal: quantity * price,
        });
      };

      if (schedule.lunch) pushItem("lunch");
      if (schedule.dinner) pushItem("dinner");

      if (!items.length) continue;

      const total = items.reduce((acc, curr) => acc + curr.subtotal, 0);

      const order = new Order({
        customerId: customer._id,
        createdBy: role,
        createdById: id,
        items,
        total,
        date: new Date(todayStr),
        note: "Generated from schedule",
      });

      const test = await order.save();

      console.log("Test: ", test);
    }

    return {
      success: {
        success: true,
        message: "Order generated successfully",
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const getOrdersService = async (queryParams: {
  page: number;
  limit: number;
  sortType: string;
  sortBy: string;
  customerId: string | undefined;
  date: Date | string | undefined;
  dateRange: {
    from: Date | string | undefined;
    to: Date | string | undefined;
  };
}) => {
  const parsed = sortQueryValidation.safeParse({
    sortBy: queryParams.sortBy,
    sortType: queryParams.sortType,
  });

  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid query params"),
    };
  }

  // Date filter
  const dateFilter: any = {};
  if (queryParams.dateRange.from) {
    dateFilter.$gte = new Date(queryParams.dateRange.from);
  }
  if (queryParams.dateRange.to) {
    dateFilter.$lte = new Date(queryParams.dateRange.to);
  }

  // Query
  const query = {
    ...(queryParams.dateRange.from && queryParams.dateRange.to
      ? { date: dateFilter }
      : {}), // sort by date range
    ...(queryParams.customerId ? { customerId: queryParams.customerId } : {}), // sort by customer ID for specific customer's orders
    ...(queryParams.date ? { date: new Date(queryParams.date) } : {}),
  };

  const validSortFields = ["createdAt", "updatedAt", "date"];
  const sortField = validSortFields.includes(parsed.data.sortBy)
    ? parsed.data.sortBy
    : "date";
  const sortDirection =
    parsed.data.sortType.toLocaleLowerCase() === "asc" ? 1 : -1;

  try {
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ [sortField]: sortDirection })
        .skip((queryParams.page - 1) * queryParams.limit)
        .limit(queryParams.limit)
        .exec(),

      Order.countDocuments(query),
    ]);

    const getPagination = pagination({
      page: queryParams.page,
      limit: queryParams.limit,
      total,
    });

    return {
      success: {
        success: true,
        message: "Orders fetched successfully",
        data: orders,
        documentCount: total,
        pagination: getPagination,
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const getSingleOrderService = async (id: string) => {
  // Validate ID
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid ID"),
    };
  }

  try {
    // Check if order exists
    const order = await Order.findById(parsed.data.id);

    if (!order) {
      return {
        error: {
          message: "Order not found with the provided ID",
          success: false,
        },
      };
    }

    // Response
    return {
      success: {
        success: true,
        message: "Order fetched successfully",
        data: order,
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};

export const deleteOrderService = async (id: string) => {
  // Validate ID
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      error: schemaValidationError(parsed.error, "Invalid ID"),
    };
  }

  try {
    // Check if order exists
    const order = await Order.findById(parsed.data.id);
    if (!order) {
      return {
        error: {
          message: "Order not found with the provided ID",
          success: false,
        },
      };
    }

    // Delete order
    await order.deleteOne();

    // Response
    return {
      success: {
        success: true,
        message: "Order deleted successfully",
      },
    };
  } catch (error: any) {
    return {
      serverError: {
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? null : error.stack,
      },
    };
  }
};
