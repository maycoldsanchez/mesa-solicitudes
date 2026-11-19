# Decisiones de arquitectura

## 1. Arquitectura

Se utiliza Angular 20 para la interfaz y NestJS con TypeScript para la API REST. El backend separa las reglas de negocio, la máquina de estados, el servicio y el repositorio para facilitar el mantenimiento y permitir cambiar la persistencia.

Docker Compose ejecuta frontend y backend. AWS CDK define una infraestructura inicial que se valida localmente, sin despliegue.

## 2. Modelo de datos y persistencia

Cada solicitud contiene:

- `id`: identificador único de la solicitud.
- `branchId`: identificador de la sucursal propietaria.
- `title` y `description`: información descriptiva.
- `status`: estado actual.
- `createdAt` y `updatedAt`: fechas de creación y última modificación.

La versión actual utiliza un `Map<string, ServiceRequest>` indexado por `id`. Esto permite consultar directamente una solicitud por identificador. El listado filtra por sucursal, estado y texto, y luego ordena y pagina los resultados.

Se eligió persistencia en memoria para simplificar la ejecución y evitar dependencias adicionales. Como alternativa de producción, DynamoDB permitiría persistencia duradera con una clave de partición `branchId` y una clave de ordenamiento `requestId`; los índices adicionales dependerían de los patrones de consulta requeridos.

## 3. Aislamiento por sucursal

Las operaciones de consulta y modificación reciben el identificador de sucursal del contexto simulado de la petición. El repositorio busca las solicitudes dentro de esa sucursal. Si una solicitud no existe o pertenece a otra sucursal, la API responde con el mismo error de recurso no encontrado.

Los encabezados simulan el contexto de usuario para la prueba. En producción deben sustituirse por identidad autenticada y autorización confiable del lado del servidor.

## 4. Flujo de estados

La máquina de estados centraliza las transiciones permitidas:

- `NEW` → `IN_ATTENTION`: analista.
- `IN_ATTENTION` → `PENDING_CONFIRMATION`: analista.
- `PENDING_CONFIRMATION` → `CLOSED`: sucursal.
- `PENDING_CONFIRMATION` → `IN_ATTENTION`: sucursal.

Las transiciones no permitidas se rechazan sin persistir cambios. Una solicitud cerrada es inmutable.

## 5. Alternativas consideradas

- **Base de datos local:** descartada para esta versión por aumentar los requisitos de instalación y configuración.
- **DynamoDB desde el inicio:** descartada para mantener una ejecución sencilla y local; se conserva como alternativa para persistencia duradera.
- **Reglas de estado en el controlador:** descartadas para concentrar las reglas en un componente de dominio reutilizable.
- **Desplegar AWS:** descartado porque el requisito es validar la infraestructura sin desplegar recursos.

## 6. Limitaciones

El almacenamiento en memoria se pierde al reiniciar el proceso. El listado filtra y ordena los registros en memoria, por lo que una implementación de producción con grandes volúmenes requeriría índices y consultas optimizadas. La autenticación real y la integración completa de la infraestructura AWS quedan fuera de esta versión.
