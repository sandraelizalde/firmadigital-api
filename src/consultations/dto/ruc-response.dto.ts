/**
 * Estructura de la respuesta de consulta de RUC
 * Todos los campos son opcionales y devuelven null si no existen
 */
export interface RucResponseDto {
  success: boolean;
  message: string;
  data: RucData | null;
}

export interface RucData {
  // Datos básicos
  numRuc: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  estadoContribuyente: string | null;

  // Actividad económica
  actividadEconomicaPrincipal: string | null;
  tipoContribuyente: string | null;
  regimen: string | null;
  categoria: string | null;

  // Obligaciones tributarias
  obligadoLlevarContabilidad: string | null;
  agenteRetencion: string | null;
  contribuyenteEspecial: string | null;

  // Representante legal
  identificacionRepresentanteLegal: string | null;
  nombreRepresentanteLegal: string | null;
  representanteLegalFirstNames: string | null;
  representanteLegalLastNames: string | null;

  // Estados y fechas
  fechaInicioActividades: string | null;
  fechaCese: string | null;
  fechaReinicioActividades: string | null;
  fechaActualizacion: string | null;
  motivoCancelacionSuspension: string | null;

  // Clasificaciones
  contribuyenteFantasma: string | null;
  transaccionesInexistente: string | null;

  // Dirección
  direccionCompleta: string | null;

  // Establecimientos
  establecimientos: EstablecimientoData[] | null;
}

export interface EstablecimientoData {
  numeroEstablecimiento: string | null;
  nombreFantasiaComercial: string | null;
  direccionCompleta: string | null;
  estado: string | null;
  tipoEstablecimiento: string | null;
}
