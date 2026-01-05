import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { CedulaResponseDto, CedulaData } from './dto/cedula-response.dto';
import {
  RucResponseDto,
  RucData,
  EstablecimientoData,
} from './dto/ruc-response.dto';

/**
 * Interface para la respuesta de la API de cédulas
 */
interface ApiCedulaResponse {
  resultado: {
    resultado: boolean;
    mensaje: string | null;
  };
  datos: {
    NUI?: string;
    Nombre?: string;
    FechaNacimiento?: string;
    Sexo?: string;
    Genero?: string;
    Nacionalidad?: string;
    LugarNacimiento?: string;
    Domicilio?: string;
    Calle?: string;
    NumeroCasa?: string;
    EstadoCivil?: string;
    Conyuge?: string;
    NombreMadre?: string;
    NombrePadre?: string;
    Instruccion?: string;
    Profesion?: string;
    CondicionCedulado?: string;
    FechaCedulacion?: string;
    FechaInscripcionDefuncion?: string;
    FechaInscripcionGenero?: string;
    LugarInscripcionGenero?: string;
    CodigoError?: string;
    Error?: string;
  } | null;
}

/**
 * Interface para la respuesta de la API del SRI
 */
interface ApiSriResponse {
  resultado: {
    resultado: boolean;
    mensaje: string | null;
  };
  datos: {
    Num_ruc?: string;
    Razon_social?: string;
    Nombre_comercial?: string;
    Estado_ContribuyenteRuc?: string;
    ActividadEconomicaPrincipal?: string;
    TipoContribuyente?: string;
    Regimen?: string;
    Categoria?: string;
    ObligadoLlevarContabilidad?: string;
    AgenteRetencion?: string;
    ContribuyenteEspecial?: string;
    IdentificacionRepresentanteLegal?: string;
    NombreRepresentanteLegal?: string;
    FechaInicioActividades?: string;
    FechaCese?: string;
    FechaReinicioActividades?: string;
    FechaActualizacion?: string;
    MotivoCancelacionSuspension?: string;
    ContribuyenteFantasma?: string;
    TransaccionesInexistente?: string;
    Direccion_completa?: string;
    ListaArrayEstablecimiento?: Array<{
      numeroEstablecimiento?: string;
      nombreFantasiaComercial?: string;
      direccionCompleta?: string;
      estado?: string;
      tipoEstablecimiento?: string;
    }>;
  } | null;
}

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);
  private readonly apiCedulasUrl: string | undefined;
  private readonly apiCedulasUser: string | undefined;
  private readonly apiCedulasToken: string | undefined;
  private readonly apiSriUrl: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiCedulasUrl = this.configService.get<string>('API_CEDULAS_URL');
    this.apiCedulasUser = this.configService.get<string>('API_CEDULAS_USER');
    this.apiCedulasToken = this.configService.get<string>('API_CEDULAS_TOKEN');
    this.apiSriUrl = this.configService.get<string>('API_SRI_URL');

    // Validar que las variables de entorno existan
    if (!this.apiCedulasUrl || !this.apiCedulasUser || !this.apiCedulasToken) {
      this.logger.warn(
        'Variables de entorno de API de cédulas no configuradas completamente',
      );
    }
    if (!this.apiSriUrl) {
      this.logger.warn('Variable de entorno API_SRI_URL no configurada');
    }
  }

  /**
   * Consulta datos de una cédula
   * @param cedula Número de cédula (10 dígitos)
   * @returns Datos de la cédula o null si no se encuentra
   */
  async consultarCedula(cedula: string): Promise<CedulaResponseDto> {
    try {
      if (
        !this.apiCedulasUrl ||
        !this.apiCedulasUser ||
        !this.apiCedulasToken
      ) {
        throw new InternalServerErrorException(
          'Servicio de consulta de cédulas no configurado',
        );
      }

      this.logger.log(`Consultando cédula: ${cedula}`);

      const payload = {
        usuario: this.apiCedulasUser,
        token: this.apiCedulasToken,
        ruc: cedula,
      };

      const response = await firstValueFrom(
        this.httpService.post<ApiCedulaResponse>(this.apiCedulasUrl, payload, {
          timeout: 15000, // 15 segundos
        }),
      );

      // Verificar si la consulta fue exitosa
      if (!response.data.resultado?.resultado || !response.data.datos?.Nombre) {
        const mensaje =
          response.data.resultado?.mensaje || 'Error en la consulta';
        this.logger.warn(`Consulta de cédula sin resultados: ${mensaje}`);

        return {
          success: false,
          message: mensaje,
          data: null,
        };
      }

      // Transformar la respuesta
      const data = this.transformCedulaData(response.data.datos);

      return {
        success: true,
        message: 'Consulta exitosa',
        data,
      };
    } catch (error) {
      return this.handleCedulaError(error, cedula);
    }
  }

  /**
   * Consulta datos de un RUC
   * @param ruc Número de RUC (13 dígitos)
   * @returns Datos del RUC o null si no se encuentra
   */
  async consultarRuc(ruc: string): Promise<RucResponseDto> {
    try {
      if (!this.apiSriUrl || !this.apiCedulasUser || !this.apiCedulasToken) {
        throw new InternalServerErrorException(
          'Servicio de consulta de RUC no configurado',
        );
      }

      this.logger.log(`Consultando RUC: ${ruc}`);

      const payload = {
        usuario: this.apiCedulasUser,
        token: this.apiCedulasToken,
        ruc: ruc,
      };

      const response = await firstValueFrom(
        this.httpService.post<ApiSriResponse>(this.apiSriUrl, payload, {
          timeout: 15000, // 15 segundos
        }),
      );

      // Verificar si la consulta fue exitosa
      if (!response.data.resultado?.resultado) {
        const mensaje =
          response.data.resultado?.mensaje || 'Error en la consulta';
        this.logger.warn(`Consulta de RUC sin resultados: ${mensaje}`);

        return {
          success: false,
          message: mensaje,
          data: null,
        };
      }

      // Transformar la respuesta
      const data = this.transformRucData(response.data.datos);

      return {
        success: true,
        message: response.data.resultado.mensaje || 'Consulta exitosa',
        data,
      };
    } catch (error) {
      return this.handleRucError(error, ruc);
    }
  }

  /**
   * Separa un nombre completo en nombres y apellidos
   * IMPORTANTE: La API devuelve el formato APELLIDOS + NOMBRES
   * Ejemplo: "GONZALEZ JIMENEZ LUIS XAVIER" → apellidos: "GONZALEZ JIMENEZ", nombres: "LUIS XAVIER"
   *
   * @param nombreCompleto Nombre completo a separar (formato: APELLIDOS NOMBRES)
   * @returns Objeto con firstNames y lastNames
   */
  private separateNamesAndLastNames(nombreCompleto: string | undefined): {
    firstNames: string | null;
    lastNames: string | null;
  } {
    if (!nombreCompleto || nombreCompleto.trim().length === 0) {
      return { firstNames: null, lastNames: null };
    }

    // Limpiar espacios extras y normalizar
    const nombreLimpio = nombreCompleto.trim().replace(/\s+/g, ' ');
    const palabras = nombreLimpio.split(' ');

    // Palabras conectoras que pueden aparecer entre apellidos o nombres
    const conectoras = ['de', 'del', 'de la', 'y', 'e'];

    // Filtrar palabras vacías
    const palabrasFiltradas = palabras.filter((p) => p.length > 0);

    if (palabrasFiltradas.length === 0) {
      return { firstNames: null, lastNames: null };
    }

    if (palabrasFiltradas.length === 1) {
      // Solo una palabra: considerarlo como apellido
      return { firstNames: null, lastNames: palabrasFiltradas[0] };
    }

    if (palabrasFiltradas.length === 2) {
      // Dos palabras: primera es apellido, segunda es nombre
      return {
        firstNames: palabrasFiltradas[1],
        lastNames: palabrasFiltradas[0],
      };
    }

    if (palabrasFiltradas.length === 3) {
      // Tres palabras: primeras dos son apellidos, última es nombre
      return {
        firstNames: palabrasFiltradas[2],
        lastNames: palabrasFiltradas.slice(0, 2).join(' '),
      };
    }

    // Por defecto, las primeras 2 palabras son apellidos
    let splitIndex = 2;

    // Verificar si las primeras palabras contienen conectoras (apellidos compuestos)
    if (palabrasFiltradas.length >= 3) {
      // Revisar si la primera o segunda palabra es una conectora
      if (conectoras.includes(palabrasFiltradas[0].toLowerCase())) {
        splitIndex = 2;
      } else if (
        palabrasFiltradas.length >= 3 &&
        conectoras.includes(palabrasFiltradas[1].toLowerCase())
      ) {
        if (
          palabrasFiltradas.length >= 4 &&
          conectoras.includes(palabrasFiltradas[2].toLowerCase())
        ) {
          splitIndex = 4;
        } else {
          splitIndex = 3;
        }
      }
    }

    // Asegurar que dejamos al menos 1 palabra para nombres
    if (splitIndex >= palabrasFiltradas.length) {
      splitIndex = palabrasFiltradas.length - 1;
    }

    const lastNames = palabrasFiltradas.slice(0, splitIndex).join(' ');
    const firstNames = palabrasFiltradas.slice(splitIndex).join(' ');

    return {
      firstNames: firstNames || null,
      lastNames: lastNames || null,
    };
  }

  /**
   * Transforma los datos de la API de cédulas al formato de respuesta
   * Todos los campos devuelven null si no existen
   */
  private transformCedulaData(
    datos: ApiCedulaResponse['datos'],
  ): CedulaData | null {
    if (!datos) {
      return null;
    }

    // Separar nombres y apellidos del nombre completo
    const { firstNames, lastNames } = this.separateNamesAndLastNames(
      datos.Nombre,
    );

    return {
      // Datos básicos
      nui: datos.NUI || null,
      nombre: datos.Nombre || null,
      firstNames,
      lastNames,
      fechaNacimiento: datos.FechaNacimiento || null,
      sexo: datos.Sexo || null,
      genero: datos.Genero || null,
      nacionalidad: datos.Nacionalidad || null,

      // Datos de ubicación
      lugarNacimiento: datos.LugarNacimiento || null,
      domicilio: datos.Domicilio || null,
      calle: datos.Calle || null,
      numeroCasa: datos.NumeroCasa || null,

      // Datos civiles
      estadoCivil: datos.EstadoCivil || null,
      conyuge: datos.Conyuge || null,

      // Datos familiares
      nombreMadre: datos.NombreMadre || null,
      nombrePadre: datos.NombrePadre || null,

      // Datos educación/profesión
      instruccion: datos.Instruccion || null,
      profesion: datos.Profesion || null,

      // Datos de cedulación
      condicionCedulado: datos.CondicionCedulado || null,
      fechaCedulacion: datos.FechaCedulacion || null,

      // Otros datos
      fechaInscripcionDefuncion: datos.FechaInscripcionDefuncion || null,
      fechaInscripcionGenero: datos.FechaInscripcionGenero || null,
      lugarInscripcionGenero: datos.LugarInscripcionGenero || null,
    };
  }

  /**
   * Transforma los datos de la API del SRI al formato de respuesta
   * Todos los campos devuelven null si no existen
   */
  private transformRucData(datos: ApiSriResponse['datos']): RucData | null {
    if (!datos) {
      return null;
    }

    // Transformar establecimientos
    let establecimientos: EstablecimientoData[] | null = null;
    if (
      datos.ListaArrayEstablecimiento &&
      datos.ListaArrayEstablecimiento.length > 0
    ) {
      establecimientos = datos.ListaArrayEstablecimiento.map((est) => ({
        numeroEstablecimiento: est.numeroEstablecimiento || null,
        nombreFantasiaComercial: est.nombreFantasiaComercial || null,
        direccionCompleta: est.direccionCompleta || null,
        estado: est.estado || null,
        tipoEstablecimiento: est.tipoEstablecimiento || null,
      }));
    }

    // Separar nombres y apellidos del representante legal
    const {
      firstNames: representanteLegalFirstNames,
      lastNames: representanteLegalLastNames,
    } = this.separateNamesAndLastNames(datos.NombreRepresentanteLegal);

    return {
      // Datos básicos
      numRuc: datos.Num_ruc || null,
      razonSocial: datos.Razon_social || null,
      nombreComercial: datos.Nombre_comercial || null,
      estadoContribuyente: datos.Estado_ContribuyenteRuc || null,

      // Actividad económica
      actividadEconomicaPrincipal: datos.ActividadEconomicaPrincipal || null,
      tipoContribuyente: datos.TipoContribuyente || null,
      regimen: datos.Regimen || null,
      categoria: datos.Categoria || null,

      // Obligaciones tributarias
      obligadoLlevarContabilidad: datos.ObligadoLlevarContabilidad || null,
      agenteRetencion: datos.AgenteRetencion || null,
      contribuyenteEspecial: datos.ContribuyenteEspecial || null,

      // Representante legal
      identificacionRepresentanteLegal:
        datos.IdentificacionRepresentanteLegal || null,
      nombreRepresentanteLegal: datos.NombreRepresentanteLegal || null,
      representanteLegalFirstNames,
      representanteLegalLastNames,

      // Estados y fechas
      fechaInicioActividades: datos.FechaInicioActividades || null,
      fechaCese: datos.FechaCese || null,
      fechaReinicioActividades: datos.FechaReinicioActividades || null,
      fechaActualizacion: datos.FechaActualizacion || null,
      motivoCancelacionSuspension: datos.MotivoCancelacionSuspension || null,

      // Clasificaciones
      contribuyenteFantasma: datos.ContribuyenteFantasma || null,
      transaccionesInexistente: datos.TransaccionesInexistente || null,

      // Dirección
      direccionCompleta: datos.Direccion_completa || null,

      // Establecimientos
      establecimientos,
    };
  }

  /**
   * Maneja los errores de consulta de cédula
   */
  private handleCedulaError(error: any, cedula: string): CedulaResponseDto {
    if (error instanceof AxiosError) {
      // Error de comunicación con la API
      this.logger.error(
        `Error al consultar cédula ${cedula}: HTTP ${error.response?.status || 'sin respuesta'}`,
        {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          code: error.code,
        },
      );

      let message = 'Error al consultar la cédula';
      if (error.code === 'ECONNREFUSED') {
        message = 'No se pudo conectar con el servicio de consulta';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        message = 'Tiempo de espera agotado al consultar';
      } else if (error.response?.status === 400) {
        message = 'Cédula inválida o no encontrada';
      } else if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        message = 'Error de autenticación con el servicio';
      }

      return {
        success: false,
        message,
        data: null,
      };
    }

    // Error interno
    if (
      error instanceof BadRequestException ||
      error instanceof InternalServerErrorException
    ) {
      this.logger.error(
        `Error interno al consultar cédula ${cedula}: ${error.message}`,
      );
      throw error;
    }

    // Error desconocido
    this.logger.error(
      `Error inesperado al consultar cédula ${cedula}: ${error.message}`,
      error.stack,
    );

    return {
      success: false,
      message: 'Error inesperado al consultar la cédula',
      data: null,
    };
  }

  /**
   * Maneja los errores de consulta de RUC
   */
  private handleRucError(error: any, ruc: string): RucResponseDto {
    if (error instanceof AxiosError) {
      // Error de comunicación con la API
      this.logger.error(
        `Error al consultar RUC ${ruc}: HTTP ${error.response?.status || 'sin respuesta'}`,
        {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          code: error.code,
        },
      );

      let message = 'Error al consultar el RUC';
      if (error.code === 'ECONNREFUSED') {
        message = 'No se pudo conectar con el servicio de consulta';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        message = 'Tiempo de espera agotado al consultar';
      } else if (error.response?.status === 400) {
        message = 'RUC inválido o no encontrado';
      } else if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        message = 'Error de autenticación con el servicio';
      }

      return {
        success: false,
        message,
        data: null,
      };
    }

    // Error interno
    if (
      error instanceof BadRequestException ||
      error instanceof InternalServerErrorException
    ) {
      this.logger.error(
        `Error interno al consultar RUC ${ruc}: ${error.message}`,
      );
      throw error;
    }

    // Error desconocido
    this.logger.error(
      `Error inesperado al consultar RUC ${ruc}: ${error.message}`,
      error.stack,
    );

    return {
      success: false,
      message: 'Error inesperado al consultar el RUC',
      data: null,
    };
  }
}
