import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination';

const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.enum(['USD', 'SYP'])
});

const specsSchema = z.object({
  engine: z.string().min(1),
  seats: z.number().int().positive(),
  drivetrain: z.string().optional(),
  horsepower: z.number().int().positive().optional()
});

export const listCarsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  yearMin: z.coerce.number().int().min(1980).optional(),
  yearMax: z.coerce.number().int().min(1980).optional(),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  listingType: z.enum(['SALE', 'RENT', 'BOTH']).optional(),
  transmission: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
  fuelType: z.enum(['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC']).optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'INACTIVE']).optional(),
  sortBy: z
    .enum(['newest', 'priceAsc', 'priceDesc', 'yearDesc', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'])
    .default('newest')
});

const carSchema = z.object({
    brand: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1980).max(2100),
    listingType: z.enum(['SALE', 'RENT', 'BOTH']),
    condition: z.enum(['NEW', 'USED']),
    status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'INACTIVE']),
    salePrice: moneySchema.optional(),
    dailyRentPrice: moneySchema.optional(),
    monthlyRentPrice: moneySchema.optional(),
    mileageKm: z.number().int().nonnegative().optional(),
    transmission: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
    fuelType: z.enum(['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC']).optional(),
    color: z.string().optional(),
    city: z.string().optional(),
    specs: specsSchema,
    description: z.string().max(2500).optional()
  });

function validatePriceRules(value: z.infer<typeof carSchema> | Partial<z.infer<typeof carSchema>>, ctx: z.RefinementCtx) {
  if (!value.listingType) {
    return;
  }

    if ((value.listingType === 'SALE' || value.listingType === 'BOTH') && !value.salePrice) {
      ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'salePrice is required' });
    }
    if (
      (value.listingType === 'RENT' || value.listingType === 'BOTH') &&
      !value.dailyRentPrice &&
      !value.monthlyRentPrice
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['dailyRentPrice'],
        message: 'dailyRentPrice or monthlyRentPrice is required'
      });
    }
}

export const createCarSchema = carSchema.superRefine(validatePriceRules);

export const updateCarSchema = carSchema.partial();
