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

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.client.Invocation;
import jakarta.ws.rs.client.Invocation.Builder;
import jakarta.ws.rs.client.WebTarget;
import jakarta.ws.rs.core.Form;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;

/**
 * Servicio REST para utilizar desde la aplicación del lado del cliente.
 *
 * Es a su vez un cliente REST para invocar servicios provistos
 *
 * Este mecanismo permite invocar los servicios internos desde un cliente
 * externo.
 *
 * @author Ricardo Arguello
 */
@Path("/firmadigital")
public class ServicioFirmaDigital {

    /**
     * Nombre de la propiedad de sistema que contiene el archivo de
     * configuracion del servidor WildFly (standalone.xml)
     */
    private static final String WS_SYSTEM_PROPERTY = "firmadigital-servicio.url";

    // Servicio REST interno
    private static final String REST_SERVICE_URL = System.getProperty(WS_SYSTEM_PROPERTY) + "/documentos";

    /**
     * Obterner un documento mediante una invocación REST
     *
     * @param token
     * @return
     */
    @GET
    @Path("{token}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerDocumentos(@PathParam("token") String token) {
        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(REST_SERVICE_URL).path("{token}").resolveTemplate("token", token);
            Builder builder = target.request(MediaType.APPLICATION_JSON);
            Invocation invocation = builder.buildGet();
            try {
                Response response = invocation.invoke();
                int statusCode = response.getStatus();
                String jsonResponse = response.readEntity(String.class);
                if (statusCode == 200) {
                    return Response.ok(jsonResponse).header("Content-Length", jsonResponse.length()).build();
                } else {
                    return Response.status(Status.NOT_ACCEPTABLE).type(MediaType.TEXT_PLAIN).entity(jsonResponse).build();
                }
            } catch (WebApplicationException e) {
                String mensaje;
                if (e.getResponse().hasEntity()) {
                    mensaje = e.getResponse().readEntity(String.class);
                } else {
                    mensaje = e.toString();
                }
                return Response.status(Status.INTERNAL_SERVER_ERROR).type(MediaType.TEXT_PLAIN).entity(
                        "Error al invocar servicio de obtencion de documentos en firmadigital-servicio: " + mensaje)
                        .build();
            }
        }
    }

    /**
     * Actualizar un documento mediante una invocación REST
     *
     * @param token
     * @param json
     * @param base64
     * @return
     */
    @PUT
    @Path("{token}")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response actualizarDocumentos(@PathParam("token") String token, @FormParam("json") String json, @FormParam("base64") String base64) {
        if (json == null) {
            return Response.status(Status.BAD_REQUEST).entity("Se debe incluir json").build();
        }
        if (base64 == null) {
            return Response.status(Status.BAD_REQUEST).entity("Se debe incluir base64").build();
        }

        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(REST_SERVICE_URL).path("{token}").resolveTemplate("token", token);
            Builder builder = target.request();
            Form form = new Form();
            form.param("json", json);
            form.param("base64", base64);
            Invocation invocation = builder.buildPut(Entity.form(form));
            try {
                Response response = invocation.invoke();
                int statusCode = response.getStatus();
                String jsonResponse = response.readEntity(String.class);
                if (statusCode == 200) {
                    return Response.ok(jsonResponse).header("Content-Length", jsonResponse.length()).build();
                } else {
                    return Response.status(Status.NOT_ACCEPTABLE).type(MediaType.TEXT_PLAIN).entity(jsonResponse).build();
                }
            } catch (WebApplicationException e) {
                String mensaje;
                if (e.getResponse().hasEntity()) {
                    mensaje = e.getResponse().readEntity(String.class);
                } else {
                    mensaje = e.toString();
                }
                return Response.status(Status.INTERNAL_SERVER_ERROR).type(MediaType.TEXT_PLAIN).entity(
                        "Error al invocar servicio de obtencion de documentos en firmadigital-servicio: " + mensaje)
                        .build();
            }
        }
    }
}
