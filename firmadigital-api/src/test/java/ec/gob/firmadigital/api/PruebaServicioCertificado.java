/*
 * Firma Digital: API
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.api;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Esta clase permite probar el servicio REST que verifica un certificado
 * digital mediante el CRL almacenado en la base de datos del servicio.
 *
 * @author Ricardo Arguello
 */
public class PruebaServicioCertificado {

    private static final String CERTIFICADO_URL = "https://api.firmadigital.gob.ec/api/certificado/revocado";
//    private static final String CERTIFICADO_URL = "https://impapi.firmadigital.gob.ec:8080/api/certificado/revocado";
//    private static final String CERTIFICADO_URL = "http://localhost:8080/api/certificado/revocado";

    private static final Logger LOGGER = Logger.getLogger(PruebaServicioCertificado.class.getName());

    public boolean verificarCrlServidor(int serial) throws IOException {
        URL url = new URL(CERTIFICADO_URL + "/" + serial);
        HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
        int responseCode = urlConnection.getResponseCode();

        if (responseCode != HttpURLConnection.HTTP_OK) {
            LOGGER.log(Level.SEVERE,CERTIFICADO_URL + " Response Code: {0}", responseCode);
            return false;
        }

        try (InputStream is = urlConnection.getInputStream()) {
            InputStreamReader reader = new InputStreamReader(is);
            BufferedReader in = new BufferedReader(reader);
            return Boolean.parseBoolean(in.readLine());
        }
    }

    public static void main(String[] args) throws Exception {
        PruebaServicioCertificado main = new PruebaServicioCertificado();
        int serial;
        boolean valido;

        // Este certificado si es valido
        serial = 1312818414;
        valido = main.verificarCrlServidor(serial);
        LOGGER.log(Level.INFO, "certificado {0} revocado? {1}", new Object[]{serial, valido});

        serial = 1234567;
        valido = main.verificarCrlServidor(serial);
        LOGGER.log(Level.INFO, "certificado {0} revocado? {1}", new Object[]{serial, valido});
    }
}
