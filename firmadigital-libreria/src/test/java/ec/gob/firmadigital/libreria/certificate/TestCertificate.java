/*
 * Copyright (C) 2020 
 * Authors: Ricardo Arguello, Misael Fernández
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.*
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.libreria.certificate;

import java.security.KeyStore;
import java.security.KeyStore.PrivateKeyEntry;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.List;

import ec.gob.firmadigital.libreria.certificate.CrlUtils;
import ec.gob.firmadigital.libreria.certificate.ValidationResult;
import ec.gob.firmadigital.libreria.certificate.ec.securitydata.CertificadoSecurityData;
import ec.gob.firmadigital.libreria.certificate.ec.securitydata.CertificadoSecurityDataFactory;
import ec.gob.firmadigital.libreria.certificate.ec.securitydata.SecurityDataSubCaCert20112026;
import ec.gob.firmadigital.libreria.utils.CertificateUtils;
import ec.gob.firmadigital.libreria.utils.OcspUtils;

public class TestCertificate {

    private static final String CERT_PATH = "PRUEBA_PERSONA_NATURAL_NOMBREAPELLIDO.p12";
    private static final String CERT_PASS = "12345678";
    private static final String CERT_ALIAS = "PRUEBA PERSONA_NATURAL NOMBRE1 NOMBRE2 APELLIDO1 APELLIDO2's ENTIDAD CERTIFICADORA S.A. ID";

    // @Test
    public void testSD() throws Exception {
        KeyStore ks = KeyStore.getInstance("PKCS12");
        ks.load(ClassLoader.getSystemResourceAsStream(CERT_PATH), CERT_PASS.toCharArray());
        PrivateKeyEntry pke = (PrivateKeyEntry) ks.getEntry(CERT_ALIAS,
                new KeyStore.PasswordProtection(CERT_PASS.toCharArray()));

        X509Certificate cert = (X509Certificate) pke.getCertificate();
        boolean esSD = CertificadoSecurityDataFactory.esCertificadoDeSecurityData(cert);
        System.out.println("Es SD? " + esSD);
        System.setProperty("jsse.enableSNIExtension", "false");

        CertificadoSecurityData certSD = CertificadoSecurityDataFactory.construir(cert);
        System.out.println("nombres=" + certSD.getNombres());

        for (String url : CertificateUtils.getCrlDistributionPoints(cert)) {
            System.out.println("url=" + url);
        }

        // new SecurityDataCaCert().getPublicKey()
        ValidationResult result = CrlUtils.verifyCertificateCRLs(cert, new SecurityDataSubCaCert20112026().getPublicKey(),
                Arrays.asList(
                        "https://entidad.certificadora.ec/crlfile.crl"));
        System.out.println("Validation result: " + result);

        List<String> ocspUrls = CertificateUtils.getAuthorityInformationAccess(cert);
        for (String ocsp : ocspUrls) {
            System.out.println("OCSP=" + ocsp);
        }

        System.out.println("Valid? " + OcspUtils.isValidCertificate(cert));
    }
}
