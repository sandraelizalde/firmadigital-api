import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { CreditStatus } from '@prisma/client';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear un nuevo crédito para un distribuidor
   */
  async createCredit(createCreditDto: CreateCreditDto, adminName: string) {
    const { distributorId, dueDate } = createCreditDto;

    // Convertir la fecha a las 23:59:59 en hora de Ecuador (UTC-5)
    const dueDateObj = new Date(dueDate);

    if (
      dueDateObj.getUTCHours() === 0 &&
      dueDateObj.getUTCMinutes() === 0 &&
      dueDateObj.getUTCSeconds() === 0
    ) {
      dueDateObj.setUTCHours(4, 59, 59, 999);
    }

    // Verificar que la fecha de vencimiento sea futura
    if (dueDateObj <= new Date()) {
      throw new BadRequestException(
        'La fecha de vencimiento debe ser posterior a la fecha actual',
      );
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      // Crear el crédito
      const credit = await prisma.distributorCredit.create({
        data: {
          distributorId,
          usedAmount: 0,
          dueDate: dueDateObj,
          status: CreditStatus.ACTIVE,
          assignedBy: adminName,
        },
      });

      return { credit };
    });

    return {
      message: 'Crédito creado exitosamente',
      data: {
        credit: result.credit,
      },
    };
  }
}
