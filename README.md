# Mesa de Solicitudes

Aplicación web para consultar y gestionar solicitudes de servicio por sucursal, con control de acceso por sucursal y un flujo de estados validado en el backend.

## Tecnologías

- **Frontend:** Angular 20 y TypeScript.
- **Backend:** NestJS y TypeScript.
- **Persistencia:** almacenamiento en memoria mediante `Map`.
- **Contenedores:** Docker y Docker Compose.
- **Infraestructura como código:** AWS CDK con TypeScript.

## Arquitectura

La aplicación está dividida en tres componentes principales:

- `frontend/`: interfaz para consultar solicitudes, aplicar filtros, navegar entre páginas y ejecutar acciones según el rol.
- `backend/`: API REST que aplica las reglas de negocio, valida las transiciones de estado y limita las operaciones a la sucursal indicada.
- `infra/`: definición de recursos de AWS mediante CDK. La infraestructura se sintetiza y valida sin desplegar recursos en AWS.

Docker Compose permite ejecutar el frontend y el backend localmente. No se requiere una base de datos adicional para esta versión.

## Requisitos previos

- Docker Desktop con Docker Compose.
- Git, para clonar el repositorio.

## Ejecución local

Clonar el repositorio:

```bash
git clone git@github.com:maycoldsanchez/mesa-solicitudes.git
cd mesa-solicitudes
```

Construir e iniciar los servicios:

```bash
docker compose up --build -d
```

Acceder a los servicios:

- **Frontend:** http://localhost:4200
- **API:** http://localhost:3000

Para detener los servicios:

```bash
docker compose down
```
## Configuración por variables de entorno

Docker Compose permite personalizar la configuración del backend mediante variables de entorno. Todas son opcionales para la ejecución local.

| Variable | Valor predeterminado | Descripción |
|---|---|---|
| `BACKEND_PORT` | `3000` | Puerto publicado por Docker para el backend. |
| `CORS_ORIGINS` | `http://localhost:4200` | Orígenes permitidos, separados por comas. |
| `OBSERVE_ENABLED` | `false` | Activa la instrumentación de NestJS Observe cuando vale `true`. |
| `OBSERVE_APP_KEY` | Vacío | Clave de la aplicación para Observe. |
| `OBSERVE_APP_SECRET` | Vacío | Secreto de la aplicación para Observe. |
| `OBSERVE_SERVICE_ID` | `mesa-solicitudes-backend` | Identificador del servicio observado. |

Para personalizar los valores, se pueden definir variables de entorno antes de ejecutar Docker Compose o declararlas en un archivo `.env` local en la raíz del proyecto.

Ejemplo de configuración opcional:

```dotenv
BACKEND_PORT=3000
CORS_ORIGINS=http://localhost:4200
OBSERVE_ENABLED=false
OBSERVE_SERVICE_ID=mesa-solicitudes-backend
```

No se deben incluir credenciales reales en el repositorio. Si se activa Observe, deben proporcionarse sus credenciales mediante variables de entorno y mantenerse fuera del control de versiones.

El frontend utiliza la ruta relativa `/api/requests`. Nginx redirige las peticiones `/api/` al backend, por lo que la URL del backend no está fijada en el código compilado de Angular.

## Seguridad y alcance de la autorización

Las cabeceras `x-branch-id` y `x-user-role` se utilizan para simular el contexto de sucursal y el rol durante esta prueba. Cualquier cliente puede enviar o modificar esas cabeceras; por tanto, no representan una identidad autenticada ni una autorización confiable.

La solución no debe exponerse como sistema de producción sin incorporar autenticación real, autorización validada en el servidor y controles adecuados para proteger las operaciones por sucursal y rol.

## Funcionalidades

- Listado de solicitudes con paginación.
- Filtrado por estado y búsqueda por texto.
- Consulta de detalles de una solicitud.
- Transiciones de estado controladas por el backend.
- Confirmación o rechazo de resolución por parte de la sucursal.
- Aislamiento de solicitudes por sucursal.
- Datos iniciales de prueba, incluyendo 50.000 solicitudes para la sucursal BR-001.

## Flujo de estados

- `NEW` → `IN_ATTENTION`: avance realizado por un analista.
- `IN_ATTENTION` → `PENDING_CONFIRMATION`: avance realizado por un analista.
- `PENDING_CONFIRMATION` → `CLOSED`: resolución confirmada por la sucursal.
- `PENDING_CONFIRMATION` → `IN_ATTENTION`: resolución rechazada por la sucursal.

Las solicitudes cerradas no pueden modificarse. Las transiciones inválidas se rechazan en el backend.

## Infraestructura AWS

La infraestructura se define en `infra/` mediante AWS CDK. Para compilar y sintetizar la plantilla de CloudFormation:

```bash
cd infra
npm ci
npm run build
npx cdk synth
```

Estos comandos validan la definición localmente; no despliegan recursos. La Lambda actual es ilustrativa y todavía no ejecuta el backend NestJS.

## Limitaciones conocidas

- La persistencia en memoria se pierde al reiniciar el backend.
- Los encabezados de sucursal y rol simulan el contexto del usuario para esta prueba; no constituyen autenticación real.
- La infraestructura AWS es una definición inicial y requiere integración adicional para ejecutar la aplicación completa en la nube.
