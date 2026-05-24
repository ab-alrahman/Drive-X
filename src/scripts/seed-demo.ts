import bcrypt from 'bcryptjs';
import { pool } from '../config/db';

const DEMO_MARKER = '[DEMO_SEED]';

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
  images: string[];
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
    images: ['toyota-corolla-white-front', 'toyota-corolla-white-interior']
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
    images: ['hyundai-tucson-silver-front', 'hyundai-tucson-silver-side']
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
    images: ['kia-sportage-gray-front', 'kia-sportage-gray-dashboard']
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
    images: ['mercedes-c200-black-front', 'mercedes-c200-black-interior']
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
    images: ['bmw-x5-blue-front', 'bmw-x5-blue-rear']
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
    images: ['nissan-sunny-red-front', 'nissan-sunny-red-side']
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
    images: ['ford-ranger-orange-front', 'ford-ranger-orange-bed']
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
    images: ['tesla-model-3-white-front', 'tesla-model-3-white-interior']
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
    images: ['honda-civic-black-front', 'honda-civic-black-side']
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
    images: ['audi-a4-gray-front', 'audi-a4-gray-interior']
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
    images: ['chevrolet-tahoe-white-front', 'chevrolet-tahoe-white-cabin']
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
    images: ['mazda-cx5-blue-front', 'mazda-cx5-blue-side']
  }
];

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

    const ownerHash = await bcrypt.hash(ownerPassword, 12);
    const staffHash = await bcrypt.hash(staffPassword, 12);

    const ownerResult = await client.query<{ id: string }>(
      `INSERT INTO admin_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'OWNER')
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = 'OWNER', updated_at = NOW()
       RETURNING id`,
      ['admin@drivex.com', ownerHash, 'DriveX Owner']
    );

    const staffResult = await client.query<{ id: string }>(
      `INSERT INTO admin_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'STAFF')
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = 'STAFF', updated_at = NOW()
       RETURNING id`,
      ['staff@drivex.com', staffHash, 'DriveX Staff']
    );

    const ownerId = ownerResult.rows[0].id;
    const staffId = staffResult.rows[0].id;

    await client.query(
      `DELETE FROM deals
       WHERE lead_id IN (
         SELECT id FROM leads WHERE message LIKE $1 OR admin_notes LIKE $1
       )
       OR notes LIKE $1`,
      [`%${DEMO_MARKER}%`]
    );
    await client.query(`DELETE FROM leads WHERE message LIKE $1 OR admin_notes LIKE $1`, [`%${DEMO_MARKER}%`]);
    await client.query(
      `DELETE FROM car_images
       WHERE car_id IN (
         SELECT id FROM cars WHERE description LIKE $1
       )`,
      [`%${DEMO_MARKER}%`]
    );
    await client.query(`DELETE FROM cars WHERE description LIKE $1`, [`%${DEMO_MARKER}%`]);

    const carIds: string[] = [];

    for (const car of cars) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO cars (
          brand, model, year, listing_type, condition, status,
          sale_price_amount, sale_price_currency,
          daily_rent_price_amount, daily_rent_price_currency,
          monthly_rent_price_amount, monthly_rent_price_currency,
          mileage_km, transmission, fuel_type, color, city,
          engine, seats, drivetrain, horsepower, description, updated_by
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
        )
        RETURNING id`,
        [
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

      for (const [index, imageName] of car.images.entries()) {
        await client.query(
          `INSERT INTO car_images (
            car_id, image_url, storage_key, local_path, mime_type, size_bytes, is_primary, position
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            carId,
            `https://placehold.co/1200x800/png?text=${encodeURIComponent(`${car.brand} ${car.model}`)}`,
            `demo/${imageName}.png`,
            null,
            'image/png',
            0,
            index === 0,
            index
          ]
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

    for (const deal of deals) {
      const amount = commissionAmount(deal.finalPrice.amount, deal.commissionType, deal.commissionValue);

      await client.query(
        `INSERT INTO deals (
          lead_id, car_id, type, final_price_amount, final_price_currency,
          commission_type, commission_value, commission_amount, commission_currency, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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
    }

    await client.query('COMMIT');

    console.log('Seeded demo data successfully.');
    console.log('Admin login: admin@drivex.com / admin123');
    console.log('Staff login: staff@drivex.com / staff1234');
    console.log(`Cars: ${cars.length}, images: ${cars.length * 2}, leads: ${leads.length}, deals: ${deals.length}`);
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
  await pool.end();
  process.exit(1);
});
