import { order } from "@/controllers";
import { combinedProtect, protect } from "@/middlewares";
import { Hono } from "hono";

const orders = new Hono();

orders.get("/", protect, (c) => order.getOrders(c));

orders.post("/register", combinedProtect, (c) => order.registerOrder(c));

orders.post("/generate", protect, (c) => order.generateOrder(c));

orders.get("/:id", protect, (c) => order.getSingleOrder(c));

orders.put("/:id", (c) => {
  return c.text(
    "ekhono to jani na ki ki update korte hote pare. tai eti pore korbo."
  );
});

orders.delete("/:id", protect, (c) => order.deleteOrder(c));

export default orders;
