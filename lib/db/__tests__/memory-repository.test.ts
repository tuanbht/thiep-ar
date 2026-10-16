import type { Order, OrderStatus } from '../../domain/types';
import { MemoryRepository } from '../memory-repository';
import { repositoryContract, runId, testProducts } from './repository.contract';

repositoryContract('MemoryRepository', async () => {
  const products = testProducts(runId());
  const repo = new MemoryRepository([products.hidden, products.second, products.first]);
  return {
    repo,
    products,
    async setOrderStatus(orderId: string, status: OrderStatus) {
      const orders = repo['orders'] as Map<string, Order>;
      const o = orders.get(orderId);
      if (o) orders.set(orderId, { ...o, status });
    },
    countEvents: async (sessionId: string) => repo.events.filter(e => e.sessionId === sessionId).length
  };
});
