# Decisiones de arquitectura

## 1. Arquitectura

Se utiliza Angular 20 para la interfaz y NestJS con TypeScript para la API REST. El backend separa controladores, servicios, máquina de estados y repositorio para facilitar el mantenimiento y permitir cambiar la persistencia.

Docker Compose ejecuta frontend y backend. AWS CDK define una infraestructura inicial que se sintetiza y valida localmente, sin desplegar recursos.

## 2. Modelo de datos y persistencia

Cada solicitud contiene `id`, `branchId`, `title`, `description`, `status`, `createdAt` y `updatedAt`.

La implementación utiliza `Map<string, ServiceRequest>` indexado por `id`, lo que permite búsquedas directas por identificador. El listado filtra por sucursal, estado y texto, ordena por fecha y pagina los resultados.

Se eligió persistencia en memoria para simplificar la ejecución y evitar dependencias adicionales. Como alternativa de producción, DynamoDB permitiría persistencia duradera con `branchId` como clave de partición y `requestId` como clave de ordenamiento. Para filtrar por estado se podrían evaluar índices secundarios según los patrones de consulta. La paginación podría utilizar `LastEvaluatedKey`; la búsqueda textual libre requeriría evaluar un servicio de búsqueda específico.

## 3. Aislamiento por sucursal

Las operaciones utilizan el identificador de sucursal recibido mediante el contexto simulado de la petición. Las consultas y modificaciones se limitan a esa sucursal. Si una solicitud no existe o pertenece a otra sucursal, la API devuelve el mismo error `404 Not Found`.

Los encabezados simulan el contexto del usuario para la prueba. En producción deben sustituirse por autenticación y autorización confiables del lado del servidor.

## 4. Flujo de estados

La máquina de estados centraliza las transiciones permitidas:

- `NEW` → `IN_ATTENTION`: analista.
- `IN_ATTENTION` → `PENDING_CONFIRMATION`: analista.
- `PENDING_CONFIRMATION` → `CLOSED`: sucursal confirma la resolución.
- `PENDING_CONFIRMATION` → `IN_ATTENTION`: sucursal rechaza la resolución.

Las transiciones inválidas se rechazan sin guardar cambios. Las solicitudes cerradas son inmutables.

## 5. Alternativas consideradas

- **Base de datos local:** descartada para esta versión para reducir los requisitos de instalación y configuración.
- **DynamoDB desde el inicio:** descartada para mantener una ejecución local sencilla; se conserva como alternativa de persistencia duradera.
- **Reglas de estado en los controladores:** descartadas para centralizar la lógica de negocio en un componente de dominio reutilizable.
- **Despliegue en AWS:** descartado porque el requisito es validar la infraestructura sin desplegar recursos.

## 6. Limitaciones

La persistencia en memoria se pierde al reiniciar el backend. El listado filtra y ordena registros en memoria, por lo que una solución de producción con grandes volúmenes necesitaría consultas e índices optimizados. Las cabeceras de sucursal y rol son simuladas y pueden falsificarse desde el cliente; se requiere autenticación y autorización reales en el servidor. La infraestructura AWS es inicial y la Lambda definida no ejecuta todavía el backend NestJS. La configuración de CORS, la ruta de la API y la instrumentación pueden parametrizarse mediante variables de entorno y el proxy de Nginx.