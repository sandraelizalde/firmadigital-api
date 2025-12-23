import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

interface PayphoneConfirmRequest {
  id: number;
  clientTxId: string;
}

interface PayphoneConfirmResponse {
  statusCode: number;
  transactionStatus: string;
  clientTransactionId: string;
  authorizationCode: string;
  transactionId: number;
  email: string;
  phoneNumber: string;
  document: string;
  amount: number;
  cardType: string;
  cardBrandCode: string;
  cardBrand: string;
  bin: string;
  lastDigits: string;
  deferred: boolean;
  deferredCode: string;
  message: string | null;
  messageCode: number;
  currency: string;
  reference: string;
  optionalParameter3: string;
  optionalParameter4: string;
  storeName: string;
  date: string;
  regionIso: string;
  transactionType: string;
}

@Injectable()
export class PayphoneService {
  private readonly httpClient: AxiosInstance;
  private readonly logger = new Logger(PayphoneService.name);
  private readonly baseUrl: string | undefined;
  private readonly token: string | undefined;
  private readonly storeId: string | undefined;

  constructor() {
    this.baseUrl = process.env.PAYPHONE_BASE_URL;
    this.token = process.env.PAYPHONE_TOKEN;
    this.storeId = process.env.PAYPHONE_STORE_ID;

    if (!this.baseUrl || !this.token || !this.storeId) {
      throw new Error(
        'Faltan configuraciones de Payphone en las variables de entorno',
      );
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    });
  }

  /**
   * Confirma el estado de una transacción con Payphone
   * @param data - Datos de confirmación (id y clientTxId)
   * @returns Detalles completos de la transacción
   */
  async confirmTransaction(
    data: PayphoneConfirmRequest,
  ): Promise<PayphoneConfirmResponse> {
    try {
      this.logger.log(`Confirmando transacción Payphone: ${data.clientTxId}`);

      const response = await this.httpClient.post<PayphoneConfirmResponse>(
        '/api/button/V2/Confirm',
        data,
      );

      this.logger.log(
        `Transacción confirmada: ${response.data.transactionStatus}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al confirmar transacción Payphone: ${error.message}`,
      );

      if (error.response?.data) {
        throw new Error(
          error.response.data.message ||
            'Error al confirmar transacción con Payphone',
        );
      }

      throw new Error('Error al comunicarse con Payphone');
    }
  }

}
