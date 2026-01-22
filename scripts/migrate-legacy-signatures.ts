import { PrismaClient, MovementType, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('🚀 Iniciando migración de firmas antiguas...');

    // 1. Obtener todas las firmas con priceCharged = 0
    const legacySignatures = await prisma.signatureRequest.findMany({
        where: { priceCharged: 0 },
    });

    console.log(`🔍 Se encontraron ${legacySignatures.length} firmas para procesar.`);

    let updated = 0;

    for (const sig of legacySignatures) {
        if (!sig.distributorId) continue;

        // A. Buscar si tiene un movimiento de gasto asociado (fue pagada con BALANCE)
        const movement = await prisma.accountMovement.findFirst({
            where: {
                signatureId: sig.id,
                type: MovementType.EXPENSE,
            },
        });

        let price = 0;
        let method: PaymentMethod = PaymentMethod.BALANCE;

        if (movement) {
            price = movement.amount;
            method = PaymentMethod.BALANCE;
        } else {
            // B. Si no hay movimiento, probablemente fue CREDIT. Buscamos el precio del plan del distribuidor.
            const planPrice = await prisma.distributorPlanPrice.findFirst({
                where: {
                    distributorId: sig.distributorId,
                    plan: { perfil: sig.perfil_firma },
                },
            });
            price = planPrice?.customPrice || 0;
            method = PaymentMethod.CREDIT;
        }

        // C. Actualizar la firma
        await prisma.signatureRequest.update({
            where: { id: sig.id },
            data: {
                priceCharged: price,
                paymentMethod: method,
            },
        });

        updated++;
        if (updated % 10 === 0) console.log(`✅ Procesadas ${updated}/${legacySignatures.length} firmas...`);
    }

    console.log(`\n✨ Migración completada con éxito. ${updated} firmas actualizadas.`);
}

migrate()
    .catch((e) => {
        console.error('❌ Error en la migración:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
