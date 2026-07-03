import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";

export function createPrismaMock(): DeepMockProxy<PrismaClient> {
  return mockDeep<PrismaClient>();
}

export function resetPrismaMock(mock: DeepMockProxy<PrismaClient>): void {
  mockReset(mock);
}
