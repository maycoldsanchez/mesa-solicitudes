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
