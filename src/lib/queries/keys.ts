/**
 * Centralized query-key factory. One place to define cache keys so
 * invalidation stays consistent as pages migrate onto React Query.
 */
export const qk = {
  tickets: {
    all: ['tickets'] as const,
    page: (params: Record<string, unknown>) => ['tickets', 'page', params] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
  },
  profiles: {
    all: ['profiles'] as const,
  },
  contracts: {
    all: ['contracts'] as const,
  },
} as const;
