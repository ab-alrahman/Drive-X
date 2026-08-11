import bcrypt from 'bcryptjs';
import path from 'path';
import { cloudinary, uploadBuffer } from '../config/cloudinary';
import { pool } from '../config/db';
import fs from 'fs';

const DEMO_MARKER = '[DEMO_SEED]';
const SEED_ASSETS_DIR = path.resolve(__dirname, '../../seed-assets/cars');

// Real car photos downloaded ahead of time into seed-assets/cars/ (see docs/README.md).
// Keyed by the car's index in the `cars` array below.
const SEED_IMAGE_FILES: Record<number, string[]> = {
  0: ['0-toyota-corolla-1.jpg', '0-toyota-corolla-2.jpg'],
  1: ['1-hyundai-tucson-1.jpg', '1-hyundai-tucson-2.jpg'],
  2: ['2-kia-sportage-1.jpg', '2-kia-sportage-2.jpg'],
  3: ['3-mercedes-cclass-1.jpg', '3-mercedes-cclass-2.jpg'],
  4: ['4-bmw-x5-1.jpg', '4-bmw-x5-2.jpg'],
  5: ['5-nissan-sunny-1.jpg', '5-nissan-sunny-2.jpg'],
  6: ['6-ford-ranger-1.jpg', '6-ford-ranger-2.jpg'],
  7: ['7-tesla-model3-1.jpg', '7-tesla-model3-2.jpg'],
  8: ['8-honda-civic-1.jpg', '8-honda-civic-2.jpg'],
  9: ['9-audi-a4-1.jpg', '9-audi-a4-2.jpg'],
  10: ['10-chevrolet-tahoe-1.jpg', '10-chevrolet-tahoe-2.jpg'],
  11: ['11-mazda-cx5-1.jpg', '11-mazda-cx5-2.jpg']
};

function mimeTypeForExt(ext: string) {
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

// Uploads seed photos to Cloudinary (same destination real admin uploads go to,
// see cars.service.ts addImage) instead of writing to local disk, so seeded
// images work the same way in every environment regardless of who runs the seed.
async function uploadSeedImage(carId: string, sourceFilename: string) {
  const sourcePath = path.join(SEED_ASSETS_DIR, sourceFilename);
  const ext = path.extname(sourceFilename).toLowerCase();
  const buffer = fs.readFileSync(sourcePath);
  const uploaded = await uploadBuffer(buffer, `drivex/cars/${carId}`);

  return {
    imageUrl: uploaded.secure_url,
    storageKey: uploaded.public_id,
    localPath: null,
    mimeType: mimeTypeForExt(ext),
    sizeBytes: uploaded.bytes
  };
}

type Money = { amount: number; currency: 'USD' | 'SYP' };
type CarSeed = {
  brand: string;
  model: string;
  year: number;
  listingType: 'SALE' | 'RENT' | 'BOTH';
  condition: 'NEW' | 'USED';
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED' | 'INACTIVE';
  salePrice?: Money;
  dailyRentPrice?: Money;
  monthlyRentPrice?: Money;
  mileageKm: number;
  transmission: 'AUTOMATIC' | 'MANUAL';
  fuelType: 'GASOLINE' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  color: string;
  city: string;
  engine: string;
  seats: number;
  drivetrain: string;
  horsepower: number;
  description: string;
};

type LeadSeed = {
  carIndex: number;
  intent: 'BUY' | 'RENT';
  status: 'NEW' | 'CONTACTED' | 'NEGOTIATING' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  fullName: string;
  phone: string;
  email: string;
  city: string;
  message: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  requestDelivery: boolean;
  deliveryAddress?: string;
  adminNotes?: string;
};

type CustomerSeed = {
  fullName: string;
  email: string;
  phone: string;
  favoriteCarIndexes: number[];
};

const cars: CarSeed[] = [
  {
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 17800, currency: 'USD' },
    mileageKm: 34000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'White',
    city: 'Damascus',
    engine: '1.8L',
    seats: 5,
    drivetrain: 'FWD',
    horsepower: 139,
    description: 'Clean sedan with full service history.',
  },
  {
    brand: 'Hyundai',
    model: 'Tucson',
    year: 2021,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'RESERVED',
    salePrice: { amount: 26500, currency: 'USD' },
    dailyRentPrice: { amount: 65, currency: 'USD' },
    monthlyRentPrice: { amount: 1450, currency: 'USD' },
    mileageKm: 46000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Silver',
    city: 'Damascus',
    engine: '2.0L',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 161,
    description: 'Family SUV available for sale or monthly rental.',
  },
  {
    brand: 'Kia',
    model: 'Sportage',
    year: 2023,
    listingType: 'RENT',
    condition: 'NEW',
    status: 'AVAILABLE',
    dailyRentPrice: { amount: 75, currency: 'USD' },
    monthlyRentPrice: { amount: 1650, currency: 'USD' },
    mileageKm: 9000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Gray',
    city: 'Aleppo',
    engine: '2.0L',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 156,
    description: 'New rental SUV with premium trim.',
  },
  {
    brand: 'Mercedes-Benz',
    model: 'C200',
    year: 2020,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 42000, currency: 'USD' },
    mileageKm: 52000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Black',
    city: 'Damascus',
    engine: '2.0L Turbo',
    seats: 5,
    drivetrain: 'RWD',
    horsepower: 204,
    description: 'Luxury sedan with leather interior and panoramic roof.',
  },
  {
    brand: 'BMW',
    model: 'X5',
    year: 2019,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'SOLD',
    salePrice: { amount: 58500, currency: 'USD' },
    dailyRentPrice: { amount: 125, currency: 'USD' },
    monthlyRentPrice: { amount: 3200, currency: 'USD' },
    mileageKm: 68000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Blue',
    city: 'Latakia',
    engine: '3.0L Turbo',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 335,
    description: 'Sport luxury SUV with strong performance.',
  },
  {
    brand: 'Nissan',
    model: 'Sunny',
    year: 2021,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 12800, currency: 'USD' },
    mileageKm: 61000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Red',
    city: 'Homs',
    engine: '1.6L',
    seats: 5,
    drivetrain: 'FWD',
    horsepower: 118,
    description: 'Economical city car with low ownership cost.',
  },
  {
    brand: 'Ford',
    model: 'Ranger',
    year: 2022,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 35500, currency: 'USD' },
    mileageKm: 39000,
    transmission: 'AUTOMATIC',
    fuelType: 'DIESEL',
    color: 'Orange',
    city: 'Damascus',
    engine: '2.2L Diesel',
    seats: 5,
    drivetrain: '4WD',
    horsepower: 160,
    description: 'Strong pickup ready for business or outdoor use.',
  },
  {
    brand: 'Tesla',
    model: 'Model 3',
    year: 2022,
    listingType: 'RENT',
    condition: 'USED',
    status: 'AVAILABLE',
    dailyRentPrice: { amount: 110, currency: 'USD' },
    monthlyRentPrice: { amount: 2600, currency: 'USD' },
    mileageKm: 28000,
    transmission: 'AUTOMATIC',
    fuelType: 'ELECTRIC',
    color: 'Pearl White',
    city: 'Damascus',
    engine: 'Electric',
    seats: 5,
    drivetrain: 'RWD',
    horsepower: 283,
    description: 'Electric sedan with long range and clean cabin.',
  },
  {
    brand: 'Honda',
    model: 'Civic',
    year: 2018,
    listingType: 'SALE',
    condition: 'USED',
    status: 'RESERVED',
    salePrice: { amount: 16700, currency: 'USD' },
    mileageKm: 78000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Black',
    city: 'Hama',
    engine: '1.5L Turbo',
    seats: 5,
    drivetrain: 'FWD',
    horsepower: 174,
    description: 'Reliable compact sedan with sporty trim.',
  },
  {
    brand: 'Audi',
    model: 'A4',
    year: 2021,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 38500, currency: 'USD' },
    mileageKm: 31000,
    transmission: 'AUTOMATIC',
    fuelType: 'HYBRID',
    color: 'Dark Gray',
    city: 'Damascus',
    engine: '2.0L Hybrid',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 248,
    description: 'Premium hybrid sedan with advanced tech package.',
  },
  {
    brand: 'Chevrolet',
    model: 'Tahoe',
    year: 2020,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'RENTED',
    salePrice: { amount: 52500, currency: 'USD' },
    dailyRentPrice: { amount: 140, currency: 'USD' },
    monthlyRentPrice: { amount: 3600, currency: 'USD' },
    mileageKm: 59000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'White',
    city: 'Aleppo',
    engine: '5.3L V8',
    seats: 7,
    drivetrain: '4WD',
    horsepower: 355,
    description: 'Large SUV for family trips and executive rentals.',
  },
  {
    brand: 'Mazda',
    model: 'CX-5',
    year: 2021,
    listingType: 'SALE',
    condition: 'USED',
    status: 'INACTIVE',
    salePrice: { amount: 24500, currency: 'USD' },
    mileageKm: 45000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Deep Blue',
    city: 'Tartus',
    engine: '2.5L',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 187,
    description: 'Inactive demo listing for admin status filtering.',
  }
];

const extraCars: CarSeed[] = [
  {
    brand: 'Toyota',
    model: 'RAV4',
    year: 2023,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 31800, currency: 'USD' },
    dailyRentPrice: { amount: 85, currency: 'USD' },
    monthlyRentPrice: { amount: 1900, currency: 'USD' },
    mileageKm: 22000,
    transmission: 'AUTOMATIC',
    fuelType: 'HYBRID',
    color: 'Gray',
    city: 'Damascus',
    engine: '2.5L Hybrid',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 219,
    description: 'Hybrid SUV with active safety package.'
  },
  {
    brand: 'Hyundai',
    model: 'Elantra',
    year: 2022,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 19800, currency: 'USD' },
    mileageKm: 27000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Blue',
    city: 'Homs',
    engine: '2.0L',
    seats: 5,
    drivetrain: 'FWD',
    horsepower: 147,
    description: 'Comfortable sedan with clean service records.'
  },
  {
    brand: 'Kia',
    model: 'Sorento',
    year: 2021,
    listingType: 'RENT',
    condition: 'USED',
    status: 'AVAILABLE',
    dailyRentPrice: { amount: 95, currency: 'USD' },
    monthlyRentPrice: { amount: 2200, currency: 'USD' },
    mileageKm: 41000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Black',
    city: 'Aleppo',
    engine: '2.5L',
    seats: 7,
    drivetrain: 'AWD',
    horsepower: 191,
    description: 'Seven-seat rental SUV for family travel.'
  },
  {
    brand: 'Mercedes-Benz',
    model: 'GLC 300',
    year: 2022,
    listingType: 'SALE',
    condition: 'USED',
    status: 'RESERVED',
    salePrice: { amount: 54500, currency: 'USD' },
    mileageKm: 29000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'White',
    city: 'Damascus',
    engine: '2.0L Turbo',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 255,
    description: 'Premium compact SUV with AMG appearance package.'
  },
  {
    brand: 'BMW',
    model: '320i',
    year: 2020,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 33500, currency: 'USD' },
    mileageKm: 54000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Silver',
    city: 'Latakia',
    engine: '2.0L Turbo',
    seats: 5,
    drivetrain: 'RWD',
    horsepower: 184,
    description: 'Sport sedan with efficient turbo engine.'
  },
  {
    brand: 'Nissan',
    model: 'X-Trail',
    year: 2020,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 23800, currency: 'USD' },
    dailyRentPrice: { amount: 70, currency: 'USD' },
    monthlyRentPrice: { amount: 1550, currency: 'USD' },
    mileageKm: 62000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'White',
    city: 'Tartus',
    engine: '2.5L',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 170,
    description: 'Practical crossover ready for sale or rent.'
  },
  {
    brand: 'Ford',
    model: 'Explorer',
    year: 2021,
    listingType: 'RENT',
    condition: 'USED',
    status: 'AVAILABLE',
    dailyRentPrice: { amount: 115, currency: 'USD' },
    monthlyRentPrice: { amount: 2850, currency: 'USD' },
    mileageKm: 50000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Dark Gray',
    city: 'Damascus',
    engine: '2.3L Turbo',
    seats: 7,
    drivetrain: 'AWD',
    horsepower: 300,
    description: 'Large rental SUV with spacious interior.'
  },
  {
    brand: 'Tesla',
    model: 'Model Y',
    year: 2023,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 46500, currency: 'USD' },
    dailyRentPrice: { amount: 130, currency: 'USD' },
    monthlyRentPrice: { amount: 3100, currency: 'USD' },
    mileageKm: 18000,
    transmission: 'AUTOMATIC',
    fuelType: 'ELECTRIC',
    color: 'Red',
    city: 'Damascus',
    engine: 'Electric',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 384,
    description: 'Electric crossover with dual motor performance.'
  },
  {
    brand: 'Honda',
    model: 'CR-V',
    year: 2022,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 29200, currency: 'USD' },
    mileageKm: 36000,
    transmission: 'AUTOMATIC',
    fuelType: 'HYBRID',
    color: 'Pearl White',
    city: 'Hama',
    engine: '2.0L Hybrid',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 212,
    description: 'Efficient SUV with roomy cabin.'
  },
  {
    brand: 'Audi',
    model: 'Q5',
    year: 2021,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'RESERVED',
    salePrice: { amount: 44800, currency: 'USD' },
    dailyRentPrice: { amount: 120, currency: 'USD' },
    monthlyRentPrice: { amount: 2950, currency: 'USD' },
    mileageKm: 33000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Black',
    city: 'Damascus',
    engine: '2.0L Turbo',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 261,
    description: 'Premium SUV with quattro all-wheel drive.'
  },
  {
    brand: 'Chevrolet',
    model: 'Malibu',
    year: 2019,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 18200, currency: 'USD' },
    mileageKm: 74000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Silver',
    city: 'Aleppo',
    engine: '1.5L Turbo',
    seats: 5,
    drivetrain: 'FWD',
    horsepower: 160,
    description: 'Midsize sedan with smooth ride quality.'
  },
  {
    brand: 'Mazda',
    model: '3',
    year: 2022,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 21400, currency: 'USD' },
    mileageKm: 26000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Red',
    city: 'Tartus',
    engine: '2.0L',
    seats: 5,
    drivetrain: 'FWD',
    horsepower: 155,
    description: 'Compact sedan with premium interior feel.'
  },
  {
    brand: 'Toyota',
    model: 'Land Cruiser Prado',
    year: 2018,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 49800, currency: 'USD' },
    mileageKm: 88000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Black',
    city: 'Damascus',
    engine: '4.0L V6',
    seats: 7,
    drivetrain: '4WD',
    horsepower: 271,
    description: 'Durable SUV with strong off-road reputation.'
  },
  {
    brand: 'Hyundai',
    model: 'Santa Fe',
    year: 2020,
    listingType: 'RENT',
    condition: 'USED',
    status: 'AVAILABLE',
    dailyRentPrice: { amount: 82, currency: 'USD' },
    monthlyRentPrice: { amount: 1750, currency: 'USD' },
    mileageKm: 57000,
    transmission: 'AUTOMATIC',
    fuelType: 'DIESEL',
    color: 'Brown',
    city: 'Latakia',
    engine: '2.2L Diesel',
    seats: 7,
    drivetrain: 'AWD',
    horsepower: 200,
    description: 'Diesel family SUV for longer rentals.'
  },
  {
    brand: 'Kia',
    model: 'Cerato',
    year: 2021,
    listingType: 'SALE',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 17600, currency: 'USD' },
    mileageKm: 49000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'White',
    city: 'Homs',
    engine: '1.6L',
    seats: 5,
    drivetrain: 'FWD',
    horsepower: 130,
    description: 'Low-cost sedan with easy maintenance.'
  },
  {
    brand: 'Mercedes-Benz',
    model: 'E300',
    year: 2019,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'AVAILABLE',
    salePrice: { amount: 51500, currency: 'USD' },
    dailyRentPrice: { amount: 135, currency: 'USD' },
    monthlyRentPrice: { amount: 3300, currency: 'USD' },
    mileageKm: 65000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'Dark Blue',
    city: 'Damascus',
    engine: '2.0L Turbo',
    seats: 5,
    drivetrain: 'RWD',
    horsepower: 241,
    description: 'Executive sedan for premium rental or purchase.'
  },
  {
    brand: 'BMW',
    model: 'X3',
    year: 2022,
    listingType: 'RENT',
    condition: 'USED',
    status: 'AVAILABLE',
    dailyRentPrice: { amount: 118, currency: 'USD' },
    monthlyRentPrice: { amount: 2850, currency: 'USD' },
    mileageKm: 30000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'White',
    city: 'Damascus',
    engine: '2.0L Turbo',
    seats: 5,
    drivetrain: 'AWD',
    horsepower: 248,
    description: 'Compact luxury SUV with athletic handling.'
  },
  {
    brand: 'Nissan',
    model: 'Patrol',
    year: 2020,
    listingType: 'BOTH',
    condition: 'USED',
    status: 'INACTIVE',
    salePrice: { amount: 57500, currency: 'USD' },
    dailyRentPrice: { amount: 150, currency: 'USD' },
    monthlyRentPrice: { amount: 3800, currency: 'USD' },
    mileageKm: 72000,
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    color: 'White',
    city: 'Damascus',
    engine: '5.6L V8',
    seats: 7,
    drivetrain: '4WD',
    horsepower: 400,
    description: 'Inactive large SUV listing for admin testing.'
  }
];

const allCars = [...cars, ...extraCars];

const leads: LeadSeed[] = [
  {
    carIndex: 0,
    intent: 'BUY',
    status: 'NEW',
    fullName: 'Omar Haddad',
    phone: '+963 944 100 101',
    email: 'omar.haddad@example.com',
    city: 'Damascus',
    message: 'I want to inspect the Corolla this week.',
    requestDelivery: false
  },
  {
    carIndex: 1,
    intent: 'RENT',
    status: 'CONTACTED',
    fullName: 'Lina Mansour',
    phone: '+963 955 200 202',
    email: 'lina.mansour@example.com',
    city: 'Damascus',
    message: 'Need the Tucson for a family visit.',
    rentalStartDate: '2026-06-01',
    rentalEndDate: '2026-06-12',
    requestDelivery: true,
    deliveryAddress: 'Mezzeh, Damascus',
    adminNotes: 'Asked for delivery confirmation.'
  },
  {
    carIndex: 2,
    intent: 'RENT',
    status: 'NEGOTIATING',
    fullName: 'Karim Darwish',
    phone: '+963 933 300 303',
    email: 'karim.darwish@example.com',
    city: 'Aleppo',
    message: 'Monthly rental request with possible extension.',
    rentalStartDate: '2026-06-05',
    rentalEndDate: '2026-07-05',
    requestDelivery: false,
    adminNotes: 'Negotiating monthly rate.'
  },
  {
    carIndex: 3,
    intent: 'BUY',
    status: 'APPROVED',
    fullName: 'Rami Saleh',
    phone: '+963 988 400 404',
    email: 'rami.saleh@example.com',
    city: 'Damascus',
    message: 'Interested in the C200, cash payment.',
    requestDelivery: false,
    adminNotes: 'Approved after phone verification.'
  },
  {
    carIndex: 4,
    intent: 'BUY',
    status: 'CLOSED',
    fullName: 'Maya Nasser',
    phone: '+963 966 500 505',
    email: 'maya.nasser@example.com',
    city: 'Latakia',
    message: 'Closed BMW X5 sale.',
    requestDelivery: false,
    adminNotes: 'Deal completed.'
  },
  {
    carIndex: 5,
    intent: 'BUY',
    status: 'REJECTED',
    fullName: 'Samer Khalil',
    phone: '+963 944 600 606',
    email: 'samer.khalil@example.com',
    city: 'Homs',
    message: 'Asked for a discount below minimum.',
    requestDelivery: false,
    adminNotes: 'Rejected due to price mismatch.'
  },
  {
    carIndex: 6,
    intent: 'BUY',
    status: 'CONTACTED',
    fullName: 'Nour Barakat',
    phone: '+963 955 700 707',
    email: 'nour.barakat@example.com',
    city: 'Damascus',
    message: 'Looking for pickup financing options.',
    requestDelivery: false,
    adminNotes: 'Send financing details.'
  },
  {
    carIndex: 7,
    intent: 'RENT',
    status: 'NEW',
    fullName: 'Tarek Ibrahim',
    phone: '+963 933 800 808',
    email: 'tarek.ibrahim@example.com',
    city: 'Damascus',
    message: 'Tesla rental for business trip.',
    rentalStartDate: '2026-06-10',
    rentalEndDate: '2026-06-14',
    requestDelivery: true,
    deliveryAddress: 'Abu Rummaneh, Damascus'
  },
  {
    carIndex: 8,
    intent: 'BUY',
    status: 'NEGOTIATING',
    fullName: 'Hala Kassem',
    phone: '+963 988 900 909',
    email: 'hala.kassem@example.com',
    city: 'Hama',
    message: 'Wants inspection report for Civic.',
    requestDelivery: false,
    adminNotes: 'Inspection scheduled.'
  },
  {
    carIndex: 9,
    intent: 'BUY',
    status: 'NEW',
    fullName: 'Yazan Ali',
    phone: '+963 966 111 222',
    email: 'yazan.ali@example.com',
    city: 'Damascus',
    message: 'Interested in hybrid Audi.',
    requestDelivery: false
  },
  {
    carIndex: 10,
    intent: 'RENT',
    status: 'CLOSED',
    fullName: 'Dima Farah',
    phone: '+963 944 222 333',
    email: 'dima.farah@example.com',
    city: 'Aleppo',
    message: 'Closed Tahoe rental.',
    rentalStartDate: '2026-05-20',
    rentalEndDate: '2026-05-30',
    requestDelivery: true,
    deliveryAddress: 'New Aleppo',
    adminNotes: 'Rental completed.'
  },
  {
    carIndex: 0,
    intent: 'BUY',
    status: 'APPROVED',
    fullName: 'Fadi Hassan',
    phone: '+963 955 333 444',
    email: 'fadi.hassan@example.com',
    city: 'Damascus',
    message: 'Second buyer waiting on Corolla.',
    requestDelivery: false,
    adminNotes: 'Approved as backup lead.'
  },
  {
    carIndex: 2,
    intent: 'RENT',
    status: 'CONTACTED',
    fullName: 'Sara Omari',
    phone: '+963 933 444 555',
    email: 'sara.omari@example.com',
    city: 'Aleppo',
    message: 'Needs airport pickup.',
    rentalStartDate: '2026-06-18',
    rentalEndDate: '2026-06-22',
    requestDelivery: true,
    deliveryAddress: 'Aleppo airport'
  },
  {
    carIndex: 6,
    intent: 'BUY',
    status: 'NEW',
    fullName: 'Bassel Agha',
    phone: '+963 988 555 666',
    email: 'bassel.agha@example.com',
    city: 'Damascus',
    message: 'Can view the Ranger tomorrow.',
    requestDelivery: false
  }
];

const customers: CustomerSeed[] = [
  {
    fullName: 'Omar Haddad',
    email: 'omar.haddad@example.com',
    phone: '+963 944 100 101',
    favoriteCarIndexes: [0, 7, 12, 19]
  },
  {
    fullName: 'Lina Mansour',
    email: 'lina.mansour@example.com',
    phone: '+963 955 200 202',
    favoriteCarIndexes: [1, 2, 14, 25]
  },
  {
    fullName: 'Karim Darwish',
    email: 'karim.darwish@example.com',
    phone: '+963 933 300 303',
    favoriteCarIndexes: [2, 6, 18]
  },
  {
    fullName: 'Maya Nasser',
    email: 'maya.nasser@example.com',
    phone: '+963 966 500 505',
    favoriteCarIndexes: [4, 9, 21]
  },
  {
    fullName: 'Rami Saleh',
    email: 'rami.saleh@example.com',
    phone: '+963 988 400 404',
    favoriteCarIndexes: [3, 15, 22]
  },
  {
    fullName: 'Hala Kassem',
    email: 'hala.kassem@example.com',
    phone: '+963 988 900 909',
    favoriteCarIndexes: [8, 13, 20]
  },
  {
    fullName: 'Yazan Ali',
    email: 'yazan.ali@example.com',
    phone: '+963 966 111 222',
    favoriteCarIndexes: [9, 12, 24, 27]
  },
  {
    fullName: 'Sara Omari',
    email: 'sara.omari@example.com',
    phone: '+963 933 444 555',
    favoriteCarIndexes: [2, 10, 16, 28]
  },
  {
    fullName: 'Dima Farah',
    email: 'dima.farah@example.com',
    phone: '+963 944 222 333',
    favoriteCarIndexes: [10, 14, 26]
  },
  {
    fullName: 'Bassel Agha',
    email: 'bassel.agha@example.com',
    phone: '+963 988 555 666',
    favoriteCarIndexes: [6, 11, 23]
  }
];

function commissionAmount(finalPrice: number, commissionType: 'PERCENTAGE' | 'FIXED', commissionValue: number) {
  return commissionType === 'PERCENTAGE'
    ? Number(((finalPrice * commissionValue) / 100).toFixed(2))
    : Number(commissionValue.toFixed(2));
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ownerPassword = process.env.DEMO_OWNER_PASSWORD ?? 'admin123';
    const staffPassword = process.env.DEMO_STAFF_PASSWORD ?? 'staff1234';
    const customerPassword = process.env.DEMO_CUSTOMER_PASSWORD ?? 'customer123';

    const ownerHash = await bcrypt.hash(ownerPassword, 12);
    const staffHash = await bcrypt.hash(staffPassword, 12);
    const customerHash = await bcrypt.hash(customerPassword, 12);

    const vendorResult = await client.query<{ id: string }>(
      `INSERT INTO vendors (name, status)
       SELECT $1::varchar(160), 'ACTIVE'
       WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = $1)
       RETURNING id`,
      ['Drive X Direct']
    );
    const vendorId =
      vendorResult.rows[0]?.id ??
      (await client.query<{ id: string }>(`SELECT id FROM vendors WHERE name = $1`, ['Drive X Direct'])).rows[0].id;

    const ownerResult = await client.query<{ id: string }>(
      `INSERT INTO admin_users (email, password_hash, full_name, role, vendor_id)
       VALUES ($1, $2, $3, 'OWNER', $4)
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = 'OWNER', vendor_id = EXCLUDED.vendor_id, updated_at = NOW()
       RETURNING id`,
      ['admin@drivex.com', ownerHash, 'DriveX Owner', vendorId]
    );

    const staffResult = await client.query<{ id: string }>(
      `INSERT INTO admin_users (email, password_hash, full_name, role, vendor_id)
       VALUES ($1, $2, $3, 'STAFF', $4)
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = 'STAFF', vendor_id = EXCLUDED.vendor_id, updated_at = NOW()
       RETURNING id`,
      ['staff@drivex.com', staffHash, 'DriveX Staff', vendorId]
    );

    const ownerId = ownerResult.rows[0].id;
    const staffId = staffResult.rows[0].id;

    // Clean up by car_id membership (not just message markers) so a re-seed doesn't
    // fail with a FK violation if a stray real lead/deal was manually created
    // against a demo car in between seed runs.
    const staleCars = await client.query<{ id: string }>(`SELECT id FROM cars WHERE description LIKE $1`, [
      `%${DEMO_MARKER}%`
    ]);
    const staleCarIds = staleCars.rows.map((row) => row.id);

    for (const staleCarId of staleCarIds) {
      await cloudinary.api.delete_resources_by_prefix(`drivex/cars/${staleCarId}`).catch(() => undefined);
    }

    await client.query(`DELETE FROM maintenance_requests WHERE car_id = ANY($1::uuid[])`, [staleCarIds]);
    await client.query(`DELETE FROM deals WHERE car_id = ANY($1::uuid[])`, [staleCarIds]);
    await client.query(`DELETE FROM leads WHERE car_id = ANY($1::uuid[])`, [staleCarIds]);
    await client.query(`DELETE FROM customer_favorites WHERE car_id = ANY($1::uuid[])`, [staleCarIds]);
    await client.query(`DELETE FROM car_images WHERE car_id = ANY($1::uuid[])`, [staleCarIds]);
    await client.query(`DELETE FROM cars WHERE id = ANY($1::uuid[])`, [staleCarIds]);
    await client.query(`DELETE FROM customer_refresh_tokens WHERE customer_user_id IN (SELECT id FROM customer_users WHERE email = ANY($1::text[]))`, [
      customers.map((customer) => customer.email)
    ]);
    await client.query(`DELETE FROM customer_users WHERE email = ANY($1::text[])`, [
      customers.map((customer) => customer.email)
    ]);

    const carIds: string[] = [];

    for (const [carIndex, car] of allCars.entries()) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO cars (
          vendor_id, brand, model, year, listing_type, condition, status,
          sale_price_amount, sale_price_currency,
          daily_rent_price_amount, daily_rent_price_currency,
          monthly_rent_price_amount, monthly_rent_price_currency,
          mileage_km, transmission, fuel_type, color, city,
          engine, seats, drivetrain, horsepower, description, updated_by
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        )
        RETURNING id`,
        [
          vendorId,
          car.brand,
          car.model,
          car.year,
          car.listingType,
          car.condition,
          car.status,
          car.salePrice?.amount,
          car.salePrice?.currency,
          car.dailyRentPrice?.amount,
          car.dailyRentPrice?.currency,
          car.monthlyRentPrice?.amount,
          car.monthlyRentPrice?.currency,
          car.mileageKm,
          car.transmission,
          car.fuelType,
          car.color,
          car.city,
          car.engine,
          car.seats,
          car.drivetrain,
          car.horsepower,
          `${DEMO_MARKER} ${car.description}`,
          ownerId
        ]
      );

      const carId = result.rows[0].id;
      carIds.push(carId);

      const imageFiles = SEED_IMAGE_FILES[carIndex % cars.length] ?? [];
      for (const [index, filename] of imageFiles.entries()) {
        const sourcePath = path.join(SEED_ASSETS_DIR, filename);
        if (!fs.existsSync(sourcePath)) {
          console.warn(`Seed image missing on disk, skipping: ${filename}`);
          continue;
        }
        const { imageUrl, storageKey, localPath, mimeType, sizeBytes } = await uploadSeedImage(carId, filename);
        await client.query(
          `INSERT INTO car_images (
            car_id, image_url, storage_key, local_path, mime_type, size_bytes, is_primary, position
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [carId, imageUrl, storageKey, localPath, mimeType, sizeBytes, index === 0, index]
        );
      }

      // Pillar 1: every listed car needs an accepted maintenance file or certified inspection
      // (enforced by cars.service.ts for real admin traffic) - backfill a filled-in template
      // for each seeded car so the demo data satisfies the same rule, not a special exemption.
      const caseResult = await client.query<{ id: string }>(
        `INSERT INTO inspection_cases (car_id) VALUES ($1) RETURNING id`,
        [carId]
      );
      await client.query(
        `INSERT INTO inspection_rounds (
          case_id, round_number, requested_by_role, requested_by_admin_id, source_type, status, template_data
        ) VALUES ($1,1,'SELLER',$2,'TEMPLATE','FILE_ACCEPTED',$3)`,
        [
          caseResult.rows[0].id,
          ownerId,
          JSON.stringify({
            lastServiceDate: '2026-05-15',
            mileageAtService: car.mileageKm,
            notes: `Seller-reported maintenance history for the ${car.brand} ${car.model}.`
          })
        ]
      );
    }

    const customerIds: string[] = [];
    const customerIdByEmail = new Map<string, string>();
    for (const customer of customers) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO customer_users (email, password_hash, full_name, phone)
         VALUES ($1,$2,$3,$4)
         RETURNING id`,
        [customer.email, customerHash, customer.fullName, customer.phone]
      );
      const customerId = result.rows[0].id;
      customerIds.push(customerId);
      customerIdByEmail.set(customer.email, customerId);

      for (const carIndex of customer.favoriteCarIndexes) {
        const carId = carIds[carIndex];
        if (!carId) continue;
        await client.query(
          `INSERT INTO customer_favorites (customer_user_id, car_id)
           VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [customerId, carId]
        );
      }
    }

    const leadIds: string[] = [];

    for (const lead of leads) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO leads (
          car_id, intent, status, full_name, phone, email, city, message,
          rental_start_date, rental_end_date, request_delivery, delivery_address,
          admin_notes, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id`,
        [
          carIds[lead.carIndex],
          lead.intent,
          lead.status,
          lead.fullName,
          lead.phone,
          lead.email,
          lead.city,
          `${DEMO_MARKER} ${lead.message}`,
          lead.rentalStartDate,
          lead.rentalEndDate,
          lead.requestDelivery,
          lead.deliveryAddress,
          lead.adminNotes ? `${DEMO_MARKER} ${lead.adminNotes}` : DEMO_MARKER,
          staffId
        ]
      );
      leadIds.push(result.rows[0].id);
    }

    const deals = [
      {
        leadIndex: 4,
        carIndex: 4,
        type: 'SALE' as const,
        finalPrice: { amount: 57000, currency: 'USD' as const },
        commissionType: 'PERCENTAGE' as const,
        commissionValue: 2.5,
        notes: 'BMW X5 sale completed.'
      },
      {
        leadIndex: 10,
        carIndex: 10,
        type: 'RENT' as const,
        finalPrice: { amount: 1250, currency: 'USD' as const },
        commissionType: 'FIXED' as const,
        commissionValue: 150,
        notes: 'Tahoe rental closed.'
      },
      {
        leadIndex: 3,
        carIndex: 3,
        type: 'SALE' as const,
        finalPrice: { amount: 40500, currency: 'USD' as const },
        commissionType: 'PERCENTAGE' as const,
        commissionValue: 2,
        notes: 'C200 pending handover.'
      }
    ];

    const dealIds: string[] = [];

    for (const deal of deals) {
      const amount = commissionAmount(deal.finalPrice.amount, deal.commissionType, deal.commissionValue);

      const dealResult = await client.query<{ id: string }>(
        `INSERT INTO deals (
          lead_id, car_id, type, final_price_amount, final_price_currency,
          commission_type, commission_value, commission_amount, commission_currency, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id`,
        [
          leadIds[deal.leadIndex],
          carIds[deal.carIndex],
          deal.type,
          deal.finalPrice.amount,
          deal.finalPrice.currency,
          deal.commissionType,
          deal.commissionValue,
          amount,
          deal.finalPrice.currency,
          `${DEMO_MARKER} ${deal.notes}`,
          ownerId
        ]
      );
      dealIds.push(dealResult.rows[0].id);

      // Mirror deals.service.ts's createDeal side effects so the seeded example
      // deals leave the car/lead in the same consistent state a real deal would.
      await client.query(`UPDATE leads SET status = 'CLOSED', updated_by = $1, updated_at = NOW() WHERE id = $2`, [
        ownerId,
        leadIds[deal.leadIndex]
      ]);
      await client.query(`UPDATE cars SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`, [
        deal.type === 'SALE' ? 'SOLD' : 'RENTED',
        ownerId,
        carIds[deal.carIndex]
      ]);
    }

    const maintenanceSeeds = [
      {
        customerEmail: 'maya.nasser@example.com',
        carIndex: 4,
        dealIndex: 0,
        requestType: 'ROUTINE_SERVICE',
        status: 'COMPLETED',
        city: 'Damascus',
        notes: 'Customer requested a first post-sale oil and filter service.',
        publicSummary: 'Oil and filter service completed after purchase.',
        contactPhone: '+963 966 500 505',
        quote: 75
      },
      {
        customerEmail: 'dima.farah@example.com',
        carIndex: 10,
        dealIndex: 1,
        requestType: 'DIAGNOSTIC',
        status: 'ADMIN_REVIEW',
        city: 'Damascus',
        notes: 'Renter reports a warning light during the rental period.',
        publicSummary: null,
        contactPhone: '+963 944 222 333',
        quote: null
      },
      {
        customerEmail: 'rami.saleh@example.com',
        carIndex: 3,
        dealIndex: 2,
        requestType: 'REPAIR',
        status: 'NEW',
        city: 'Aleppo',
        notes: 'Customer hears brake noise after handover.',
        publicSummary: null,
        contactPhone: '+963 988 400 404',
        quote: null
      }
    ] as const;

    for (const item of maintenanceSeeds) {
      const customerId = customerIdByEmail.get(item.customerEmail);
      if (!customerId) {
        throw new Error(`Missing seeded customer for maintenance request: ${item.customerEmail}`);
      }

      const result = await client.query<{ id: string }>(
        `INSERT INTO maintenance_requests (
          customer_id, car_id, deal_id, vendor_id, assigned_partner_id, request_type, status,
          city, preferred_time, pickup_needed, notes, contact_phone,
          quoted_amount, quoted_currency, approved_amount, approved_currency,
          quote_approved_at, public_summary, completed_at
        ) VALUES (
          $1,$2,$3,$4,NULL,$5,$6,$7,NOW() + INTERVAL '3 days',$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17
        )
        RETURNING id`,
        [
          customerId,
          carIds[item.carIndex],
          dealIds[item.dealIndex],
          vendorId,
          item.requestType,
          item.status,
          item.city,
          item.status !== 'COMPLETED',
          `${DEMO_MARKER} ${item.notes}`,
          item.contactPhone,
          item.quote,
          item.quote ? 'USD' : null,
          item.status === 'COMPLETED' ? item.quote : null,
          item.status === 'COMPLETED' && item.quote ? 'USD' : null,
          item.status === 'COMPLETED' ? new Date().toISOString() : null,
          item.publicSummary,
          item.status === 'COMPLETED' ? new Date().toISOString() : null
        ]
      );

      await client.query(
        `INSERT INTO maintenance_updates (
          request_id, author_role, author_customer_id, status_from, status_to, note, is_public
        ) VALUES ($1,'CUSTOMER',$2,NULL,$3,$4,FALSE)`,
        [result.rows[0].id, customerId, item.status, `${DEMO_MARKER} Maintenance request opened.`]
      );

      if (item.status === 'COMPLETED') {
        await client.query(
          `INSERT INTO maintenance_updates (
            request_id, author_role, author_admin_id, status_from, status_to, note, is_public
          ) VALUES ($1,'PLATFORM_ADMIN',$2,'IN_PROGRESS','COMPLETED',$3,TRUE)`,
          [result.rows[0].id, ownerId, item.publicSummary]
        );
      }
    }

    await client.query('COMMIT');

    console.log('Seeded demo data successfully.');
    console.log('Admin login: admin@drivex.com / admin123');
    console.log('Staff login: staff@drivex.com / staff1234');
    console.log('Customer logins: use any listed customer email / customer123');
    const totalImages = Object.values(SEED_IMAGE_FILES).reduce((sum, files) => sum + files.length, 0);
    console.log(`Cars: ${allCars.length}, image uploads: ${allCars.length * 2}, customers: ${customers.length}, leads: ${leads.length}, deals: ${deals.length}, maintenance requests: ${maintenanceSeeds.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
