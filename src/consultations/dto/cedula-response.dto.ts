/**
 * Estructura de la respuesta de consulta de cédula
 * Todos los campos son opcionales y devuelven null si no existen
 */
export interface CedulaResponseDto {
  success: boolean;
  message: string;
  data: CedulaData | null;
}

export interface CedulaData {
  // Datos básicos
  nui: string | null;
  nombre: string | null;
  firstNames: string | null;
  lastNames: string | null;
  fechaNacimiento: string | null;
  sexo: string | null;
  genero: string | null;
  nacionalidad: string | null;

  // Datos de ubicación
  lugarNacimiento: string | null;
  domicilio: string | null;
  calle: string | null;
  numeroCasa: string | null;

  // Datos civiles
  estadoCivil: string | null;
  conyuge: string | null;

  // Datos familiares
  nombreMadre: string | null;
  nombrePadre: string | null;

  // Datos educación/profesión
  instruccion: string | null;
  profesion: string | null;

  // Datos de cedulación
  condicionCedulado: string | null;
  fechaCedulacion: string | null;

  // Otros datos
  fechaInscripcionDefuncion: string | null;
  fechaInscripcionGenero: string | null;
  lugarInscripcionGenero: string | null;
}
