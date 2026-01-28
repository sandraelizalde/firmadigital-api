import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);

    constructor(private readonly httpService: HttpService) { }

    /**
     * Envía un mensaje de plantilla de WhatsApp
     * @param phone Número de teléfono (se formateará automáticame)
     * @param templateName Nombre de la plantilla en Facebook Business
     * @param params Array de parámetros para el body de la plantilla (en orden)
     * @param languageCode Código de idioma (default: es_EC)
     */
    async sendTemplate(
        phone: string,
        templateName: string,
        params: string[],
        languageCode: string = 'es_EC',
    ): Promise<void> {
        if (process.env.ENVIRONMENT !== 'production') {
            this.logger.warn(`WhatsApp no enviado: Entorno no es producción (${process.env.ENVIRONMENT})`);
            return;
        }

        const formattedPhone = this.formatPhone(phone);
        if (!formattedPhone) {
            this.logger.warn(`Número de teléfono inválido o vacío: ${phone}`);
            return;
        }

        const token = process.env.WHATSAPP_API_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_ID;

        if (!token || !phoneId) {
            this.logger.warn(
                'WhatsApp no enviado: Faltan configuraciones (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_ID)',
            );
            return;
        }

        const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

        const componentParams = params.map((p) => ({ type: 'text', text: p }));

        const data = {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: [
                    {
                        type: 'body',
                        parameters: componentParams,
                    },
                ],
            },
        };

        try {
            await firstValueFrom(
                this.httpService.post(url, data, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                })
            );
            this.logger.log(`WhatsApp enviado a ${formattedPhone} (Template: ${templateName})`);
        } catch (error) {
            const errorMsg = error.response
                ? JSON.stringify(error.response.data)
                : error.message;
            this.logger.error(`Error enviando WhatsApp a ${formattedPhone}: ${errorMsg}`);
        }
    }

    /**
     * Formatea un número de teléfono para Ecuador (593...)
     * Soporta: 09XXXXXXXX, 06XXXXXXX, 07XXXXXXX, etc.
     */
    formatPhone(phone: string): string | null {
        if (!phone) return null;

        let cleanPhone = phone.replace(/\D/g, '');

        if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
            cleanPhone = '593' + cleanPhone.substring(1);
        }

        return cleanPhone;
    }
}
