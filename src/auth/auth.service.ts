import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import { CreateDistributorDto } from './dto/create-distributor.dto';
import { Role } from '@prisma/client';
import { FilesService } from 'src/files/files.service';
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  encryptPassword(password: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(
      process.env.PRIVATE_KEY_PASSWORD || 'default-key',
      'salt',
      32,
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptPassword(encryptedPassword: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(
      process.env.PRIVATE_KEY_PASSWORD || 'default-key',
      'salt',
      32,
    );
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // validateUser method removed - User model does not exist in schema

  async validateDistributor(data: LoginDto) {
    console.log('=== INICIO VALIDACIÓN DISTRIBUIDOR ===');
    console.log('1. Datos recibidos:', {
      identification: data.identification,
      password: data.password,
    });

    const foundDistributor = await this.prisma.distributor.findUnique({
      where: {
        identification: data.identification,
        active: true,
      },
    });

    console.log(
      '2. Distribuidor encontrado:',
      foundDistributor
        ? {
            id: foundDistributor.id,
            identification: foundDistributor.identification,
            active: foundDistributor.active,
            email: foundDistributor.email,
          }
        : 'NULL - No encontrado o no activo',
    );

    if (!foundDistributor) {
      console.log('3. Retornando NULL - Distribuidor no encontrado');
      return null;
    }

    const decryptedPassword = this.decryptPassword(foundDistributor.password);
    const isPasswordValid = decryptedPassword === data.password;
    console.log('4. Validación de contraseña:');
    console.log('   - Contraseña desencriptada:', decryptedPassword);
    console.log('   - Contraseña recibida:', data.password);
    console.log('   - ¿Son iguales?:', isPasswordValid);
    console.log('   - Active:', foundDistributor.active);
    console.log('   - Longitud desencriptada:', decryptedPassword.length);
    console.log('   - Longitud recibida:', data.password.length);
    console.log('   - Desencriptada JSON:', JSON.stringify(decryptedPassword));
    console.log('   - Recibida JSON:', JSON.stringify(data.password));
    console.log('   - Bytes desencriptada:', Buffer.from(decryptedPassword).toString('hex'));
    console.log('   - Bytes recibida:', Buffer.from(data.password).toString('hex'));

    if (isPasswordValid && foundDistributor.active) {
      console.log('5. Generando token JWT - Login exitoso');
      return this.jwtService.sign({
        id: foundDistributor.id,
        firstName: foundDistributor.firstName,
        lastName: foundDistributor.lastName,
        identification: foundDistributor.identification,
        email: foundDistributor.email,
        role: Role.DISTRIBUTOR,
      });
    }

    console.log(
      '6. Retornando NULL - Contraseña inválida o distribuidor inactivo',
    );
    return null;
  }

  async registerDistributor(data: CreateDistributorDto, adminUser: any) {
    const existingDistributor = await this.prisma.distributor.findFirst({
      where: {
        OR: [{ identification: data.identification }, { email: data.email }],
      },
    });

    if (existingDistributor) {
      throw new ConflictException({
        message: 'El distribuidor ya está registrado',
        error: 'DISTRIBUTOR_ALREADY_EXISTS',
      });
    }

    const encryptedPassword = this.encryptPassword(data.password);

    // Subir fotos de identificación a S3 si están presentes
    let identificationFrontUrl: string | undefined;
    let identificationBackUrl: string | undefined;

    if (data.identificationFront) {
      identificationFrontUrl = await this.filesService.uploadFile(
        data.identificationFront,
        data.identification,
        'jpg',
        `identificaciones-distribuidores/${data.identification}`,
        'fotos-cedulas',
      );
    }

    if (data.identificationBack) {
      identificationBackUrl = await this.filesService.uploadFile(
        data.identificationBack,
        data.identification,
        'jpg',
        `identificaciones-distribuidores/${data.identification}`,
        'fotos-cedulas',
      );
    }

    const newDistributor = await this.prisma.distributor.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        socialReason: data.socialReason,
        identificationType: data.identificationType,
        identification: data.identification,
        email: data.email,
        address: data.address,
        city: data.city,
        phone: data.phone,
        password: encryptedPassword,
        createdBy: adminUser.userId,
        createdByName: `${adminUser.firstName} ${adminUser.lastName}`,
        active: false,
        identificationFrontUrl,
        identificationBackUrl,
      },
    });

    return {
      success: true,
      message: 'Distribuidor registrado exitosamente.',
      distributor: {
        id: newDistributor.id,
        firstName: newDistributor.firstName,
        lastName: newDistributor.lastName,
        email: newDistributor.email,
      },
    };
  }

  // async getNameById(idCard: string) {
  //   if (!idCard || idCard.length !== 10) {
  //     throw new BadRequestException({
  //       message: 'Cédula inválida',
  //       error: 'ID_CARD_INVALID',
  //     })
  //   }
  //   try {
  //     const responseApi: ApiCedulaDto = await axios
  //       .post(
  //         process.env.API_CEDULAS_URL!,
  //         {
  //           usuario: process.env.API_CEDULAS_USER,
  //           token: process.env.API_CEDULAS_TOKEN,
  //           ruc: idCard,
  //         },
  //         {
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //           timeout: 10000,
  //         },
  //       )
  //       .then((res) => res.data);

  //     if (
  //       responseApi.resultado.resultado &&
  //       responseApi.datos.Nombre !== null
  //     ) {
  //       const nombreCompleto = responseApi.datos.Nombre.trim();
  //       const nombreCompletoArray = nombreCompleto.split(' ');
  //       let firstName: string;
  //       let lastName: string;

  //       if (nombreCompletoArray.length < 4) {
  //         firstName = nombreCompletoArray[0];
  //         lastName = nombreCompletoArray.slice(1).join(' ');
  //       } else {
  //         lastName = nombreCompletoArray[0] + ' ' + nombreCompletoArray[1];
  //         firstName = nombreCompletoArray.slice(2).join(' ');
  //       }

  //       return {
  //         success: true,
  //         data: {
  //           lastName,
  //           firstName,
  //           birthDate: responseApi.datos.FechaNacimiento,
  //           gender: responseApi.datos.Sexo,
  //         },
  //       };
  //     } else {
  //       throw new BadRequestException({
  //         message: 'Cédula no encontrada',
  //         error: responseApi.resultado.mensaje,
  //       });
  //     }
  //   } catch (error) {
  //     throw new BadRequestException({
  //       message: 'Error al obtener el nombre por cédula',
  //       error: error.response?.data || error.message,
  //     });
  //   }
  // }
}
