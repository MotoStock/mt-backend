import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.shelfItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shelf.deleteMany();

  // Create Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Pastillas de Freno Delanteras',
        sku: 'FRN-BRK-001',
        description:
          'Pastillas de freno delanteras para motos sport 250cc-600cc',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Filtro de Aceite Universal',
        sku: 'FLT-OIL-002',
        description: 'Filtro de aceite compatible con Honda, Yamaha, Suzuki',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cadena de Transmisión 520',
        sku: 'CHN-TRN-003',
        description: 'Cadena de transmisión estándar 520 con 120 eslabones',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kit de Piñón y Corona',
        sku: 'SPR-KIT-004',
        description: 'Kit completo piñón 14T + corona 42T acero templado',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Bujía NGK Iridium',
        sku: 'SPK-NGK-005',
        description: 'Bujía de alto rendimiento NGK Iridium para motores 4T',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Aceite Motul 10W-40',
        sku: 'OIL-MTL-006',
        description: 'Aceite sintético Motul 5100 10W-40 para motos 4 tiempos',
      },
    }),
  ]);

  // Create Shelves
  const shelves = await Promise.all([
    prisma.shelf.create({
      data: {
        locationCode: 'EST-A1',
        description: 'Estantería A1 - Frenos y Suspensión',
      },
    }),
    prisma.shelf.create({
      data: {
        locationCode: 'EST-B2',
        description: 'Estantería B2 - Transmisión',
      },
    }),
    prisma.shelf.create({
      data: {
        locationCode: 'EST-C3',
        description: 'Estantería C3 - Motor y Lubricantes',
      },
    }),
    prisma.shelf.create({
      data: {
        locationCode: 'EST-D4',
        description: 'Estantería D4 - Stock Temporal',
      },
    }),
  ]);

  // Create ShelfItems — some products are fragmented across multiple shelves
  await Promise.all([
    // Pastillas de Freno — FRAGMENTED (A1 + D4)
    prisma.shelfItem.create({
      data: { shelfId: shelves[0].id, productId: products[0].id, quantity: 12 },
    }),
    prisma.shelfItem.create({
      data: { shelfId: shelves[3].id, productId: products[0].id, quantity: 5 },
    }),

    // Filtro de Aceite — single location
    prisma.shelfItem.create({
      data: { shelfId: shelves[2].id, productId: products[1].id, quantity: 30 },
    }),

    // Cadena de Transmisión — FRAGMENTED (B2 + D4)
    prisma.shelfItem.create({
      data: { shelfId: shelves[1].id, productId: products[2].id, quantity: 8 },
    }),
    prisma.shelfItem.create({
      data: { shelfId: shelves[3].id, productId: products[2].id, quantity: 3 },
    }),

    // Kit de Piñón — single location
    prisma.shelfItem.create({
      data: { shelfId: shelves[1].id, productId: products[3].id, quantity: 15 },
    }),

    // Bujía NGK — FRAGMENTED (A1 + C3 + D4)
    prisma.shelfItem.create({
      data: { shelfId: shelves[0].id, productId: products[4].id, quantity: 20 },
    }),
    prisma.shelfItem.create({
      data: { shelfId: shelves[2].id, productId: products[4].id, quantity: 10 },
    }),
    prisma.shelfItem.create({
      data: { shelfId: shelves[3].id, productId: products[4].id, quantity: 7 },
    }),

    // Aceite Motul — single location
    prisma.shelfItem.create({
      data: { shelfId: shelves[2].id, productId: products[5].id, quantity: 24 },
    }),
  ]);

  console.log('✅ Seed completed successfully');
  console.log(`   Created ${products.length} products`);
  console.log(`   Created ${shelves.length} shelves`);
  console.log('   Created 10 shelf-item entries (3 products fragmented)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
