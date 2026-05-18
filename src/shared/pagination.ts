import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type Pagination = z.infer<typeof paginationQuerySchema>;

export function paginationMeta(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages
  };
}

export function offset(page: number, limit: number) {
  return (page - 1) * limit;
}

