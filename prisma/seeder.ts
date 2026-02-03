import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TypeClient } from '@prisma/client';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
  adapter,
});

async function main() {
  console.log('🌱 Iniciando seed de planes...');

  // ========== ELIMINAR PLANES EXISTENTES ==========
  console.log('🗑️ Eliminando planes existentes...');
  await prisma.plan.deleteMany();
  console.log('✔️ Planes eliminados');

  // ========== NUEVOS PLANES ==========
  const planes = [
    // ========== PERSONAS NATURALES - 15 DÍAS ==========
    {
      perfilNaturalEnext: '018',
      perfilNaturalUanataca: null,
      perfilNaturalTokenUanataca: null,
      duration: '15',
      basePrice: 699,
      durationType: 'D',
    },

    // ========== PERSONAS NATURALES - 1 MES ==========
    {
      perfilNaturalEnext: '001',
      perfilNaturalUanataca: null,
      perfilNaturalTokenUanataca: null,
      duration: '1',
      basePrice: 799,
      durationType: 'M',
    },

    // ========== PERSONAS NATURALES - 6 MESES ==========
    {
      perfilNaturalEnext: '015',
      perfilNaturalUanataca: null,
      perfilNaturalTokenUanataca: null,
      duration: '6',
      basePrice: 1199,
      durationType: 'MS',
    },

    // ========== PERSONAS NATURALES - 1 AÑO ==========
    {
      perfilNaturalEnext: '002',
      perfilNaturalUanataca: 'b985f150-39c5-49c0-8c4e-6e86d195dde9',
      perfilNaturalTokenUanataca: 'a5f7d177-f422-4cab-b653-7a5cff22d449',
      duration: '1',
      basePrice: 1499,
      durationType: 'Y',
    },

    // ========== PERSONAS NATURALES - 2 AÑOS ==========
    {
      perfilNaturalEnext: '005',
      perfilNaturalUanataca: 'f1226ab0-88da-4ebe-9ea3-94e0573e0201',
      perfilNaturalTokenUanataca: '57090791-1d73-4d42-9e2a-d46f3c936191',
      duration: '2',
      basePrice: 2199,
      durationType: 'YS',
    },

    // ========== PERSONAS NATURALES - 3 AÑOS ==========
    {
      perfilNaturalEnext: '010',
      perfilNaturalUanataca: '0a61a85d-1aec-42e8-b8c3-02940f2a4528',
      perfilNaturalTokenUanataca: '7531b209-a508-40b3-9c44-82e08c7c8cd2',
      duration: '3',
      basePrice: 2999,
      durationType: 'YS',
    },

    // ========== PERSONAS NATURALES - 4 AÑOS ==========
    {
      perfilNaturalEnext: '007',
      perfilNaturalUanataca: '48c7f2b1-1eca-4b0a-b5bb-7e866fa4e38f',
      perfilNaturalTokenUanataca: '1e444318-8cb0-4428-9ec0-364a89371fd0',
      duration: '4',
      basePrice: 3299,
      durationType: 'YS',
    },

    // ========== PERSONAS NATURALES - 5 AÑOS ==========
    {
      perfilNaturalEnext: '013',
      perfilNaturalUanataca: '28343c8c-7b8f-4c86-9b43-52ddd706e39c',
      perfilNaturalTokenUanataca: 'c62800c7-df2a-4530-a6a6-01a0df083903',
      duration: '5',
      basePrice: 4399,
      durationType: 'YS',
    },

    // ========== PERSONAS JURÍDICAS - 15 DÍAS ==========
    {
      perfilJuridicoEnext: '019',
      perfilJuridicoUanataca: null,
      perfilJuridicoTokenUanataca: null,
      duration: '15',
      basePrice: 699,
      durationType: 'D',
    },

    // ========== PERSONAS JURÍDICAS - 1 MES ==========
    {
      perfilJuridicoEnext: '017',
      perfilJuridicoUanataca: null,
      perfilJuridicoTokenUanataca: null,
      duration: '1',
      basePrice: 799,
      durationType: 'M',
    },

    // ========== PERSONAS JURÍDICAS - 6 MESES ==========
    {
      perfilJuridicoEnext: '016',
      perfilJuridicoUanataca: null,
      perfilJuridicoTokenUanataca: null,
      duration: '6',
      basePrice: 1199,
      durationType: 'MS',
    },

    // ========== PERSONAS JURÍDICAS - 1 AÑO ==========
    {
      perfilJuridicoEnext: '003',
      perfilJuridicoUanataca: '6acb07b6-6195-417f-8b00-6e9b02ca9fcd',
      perfilJuridicoTokenUanataca: '37fde7a5-64ca-43f1-bbe5-816601237ef0',
      duration: '1',
      basePrice: 1499,
      durationType: 'Y',
    },

    // ========== PERSONAS JURÍDICAS - 2 AÑOS ==========
    {
      perfilJuridicoEnext: '006',
      perfilJuridicoUanataca: '79ede8df-01db-41fb-afef-ddb0f0825af8',
      perfilJuridicoTokenUanataca: '2fae510c-1af2-40b2-a2be-290a1121e1a1',
      duration: '2',
      basePrice: 2199,
      durationType: 'YS',
    },

    // ========== PERSONAS JURÍDICAS - 3 AÑOS ==========
    {
      perfilJuridicoEnext: '009',
      perfilJuridicoUanataca: '3f3f8507-72a0-4a3c-9b00-a56c46da3a90',
      perfilJuridicoTokenUanataca: 'f83ff0d5-c148-4960-b019-c6c582942be2',
      duration: '3',
      basePrice: 2999,
      durationType: 'YS',
    },

    // ========== PERSONAS JURÍDICAS - 4 AÑOS ==========
    {
      perfilJuridicoEnext: '008',
      perfilJuridicoUanataca: '3c0e396e-6e63-4a23-9d94-e6abe242bb93',
      perfilJuridicoTokenUanataca: '5be569c0-8b1d-41cb-ac91-c9e895e56b32',
      duration: '4',
      basePrice: 3299,
      durationType: 'YS',
    },

    // ========== PERSONAS JURÍDICAS - 5 AÑOS ==========
    {
      perfilJuridicoEnext: '014',
      perfilJuridicoUanataca: '1a78e60a-ce37-4208-925b-9723e1ce83bd',
      perfilJuridicoTokenUanataca: '71e75477-ea18-4823-987b-c7a4642c6cbd',
      duration: '5',
      basePrice: 4399,
      durationType: 'YS',
    },
  ];

  // ========== CREAR PLANES ==========
  console.log('📥 Insertando nuevos planes...');
  for (const plan of planes) {
    await prisma.plan.create({
      data: plan,
    });
  }
  console.log(`✔️ ${planes.length} planes creados exitosamente`);

  console.log('🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
