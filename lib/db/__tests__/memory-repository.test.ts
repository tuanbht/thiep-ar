import type { Order, OrderStatus } from "../../domain/types";
import { MemoryRepository } from "../memory-repository";
import {
  repositoryContract,
  runId,
  testCategories,
  testProducts,
} from "./repository.contract";

repositoryContract("MemoryRepository", async () => {
  const run = runId();
  const products = testProducts(run),
    categories = testCategories(run);
  const repo = new MemoryRepository(
    [products.hidden, products.second, products.first],
    undefined,
    [categories.spare, categories.main],
  );
  return {
    repo,
    run,
    products,
    categories,
    async setOrderStatus(orderId: string, status: OrderStatus) {
      const orders = repo["orders"] as Map<string, Order>;
      const o = orders.get(orderId);
      if (o) orders.set(orderId, { ...o, status });
    },
  };
});
