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
    // ========== PERSONAS NATURALES ==========
    {
      perfil: 'PN-018',
      duration: '15',
      basePrice: 699,
      durationType: 'D',
      eligibleClientsType: [
        TypeClient.PERSONA_NATURAL_SIN_RUC,
        TypeClient.PERSONA_NATURAL_CON_RUC,
      ],
    },
    {
      perfil: 'PN-001',
      duration: '1',
      basePrice: 799,
      durationType: 'M',
      eligibleClientsType: [
        TypeClient.PERSONA_NATURAL_SIN_RUC,
        TypeClient.PERSONA_NATURAL_CON_RUC,
      ],
    },
    {
      perfil: 'PN-002',
      duration: '1',
      basePrice: 1499,
      durationType: 'Y',
      eligibleClientsType: [
        TypeClient.PERSONA_NATURAL_SIN_RUC,
        TypeClient.PERSONA_NATURAL_CON_RUC,
      ],
    },
    {
      perfil: 'PN-005',
      duration: '2',
      basePrice: 2199,
      durationType: 'YS',
      eligibleClientsType: [
        TypeClient.PERSONA_NATURAL_SIN_RUC,
        TypeClient.PERSONA_NATURAL_CON_RUC,
      ],
    },
    {
      perfil: 'PN-010',
      duration: '3',
      basePrice: 2999,
      durationType: 'YS',
      eligibleClientsType: [
        TypeClient.PERSONA_NATURAL_SIN_RUC,
        TypeClient.PERSONA_NATURAL_CON_RUC,
      ],
    },
    {
      perfil: 'PN-007',
      duration: '4',
      basePrice: 3299,
      durationType: 'YS',
      eligibleClientsType: [
        TypeClient.PERSONA_NATURAL_SIN_RUC,
        TypeClient.PERSONA_NATURAL_CON_RUC,
      ],
    },
    {
      perfil: 'PN-013',
      duration: '5',
      basePrice: 4399,
      durationType: 'YS',
      eligibleClientsType: [
        TypeClient.PERSONA_NATURAL_SIN_RUC,
        TypeClient.PERSONA_NATURAL_CON_RUC,
      ],
    },

    // ========== PERSONAS JURÍDICAS ==========
    {
      perfil: 'PJ-019',
      duration: '15',
      basePrice: 699,
      durationType: 'D',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
    },
    {
      perfil: 'PJ-017',
      duration: '1',
      basePrice: 799,
      durationType: 'M',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
    },
    {
      perfil: 'PJ-016',
      duration: '6',
      basePrice: 1199,
      durationType: 'MS',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
    },
    {
      perfil: 'PJ-003',
      duration: '1',
      basePrice: 1499,
      durationType: 'Y',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
    },
    {
      perfil: 'PJ-006',
      duration: '2',
      basePrice: 2199,
      durationType: 'YS',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
    },
    {
      perfil: 'PJ-009',
      duration: '3',
      basePrice: 2999,
      durationType: 'YS',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
    },
    {
      perfil: 'PJ-008',
      duration: '4',
      basePrice: 3299,
      durationType: 'YS',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
    },
    {
      perfil: 'PJ-013',
      duration: '5',
      basePrice: 4399,
      durationType: 'YS',
      eligibleClientsType: [TypeClient.PERSONA_JURIDICA],
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
