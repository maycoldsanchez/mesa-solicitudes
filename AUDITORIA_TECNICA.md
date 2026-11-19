# Auditoría Técnica — Mesa de Solicitudes

**Fecha:** 2026-11-19  
**Repositorio:** `mesa-solicitudes` (rama `main`, commit actual)  
**Alcance:** Auditoría de solo lectura — backend (NestJS/TypeScript), frontend (Angular 20/TypeScript), infraestructura (AWS CDK), Docker Compose, CI/CD, documentación.

---

## 1. Resumen ejecutivo

La solución implementa los requisitos funcionales principales (R1–R3) con una arquitectura modular, separación clara de responsabilidades y pruebas que validan las reglas de negocio críticas. Los puntos fuertes son:

- Máquina de estados centralizada y probada exhaustivamente.
- Aislamiento por sucursal verificado en pruebas unitarias y e2e.
- Paginación, filtrado y búsqueda funcionales con límite de 100 ítems por página.
- Docker Compose reproducible para desarrollo local.
- CI que compila backend, frontend e infraestructura, y sintetiza la plantilla CDK.

**Riesgos principales:**

| ID | Título | Severidad |
|----|--------|-----------|
| SEC-001 | Autenticación/autorización basada únicamente en cabeceras controladas por el cliente | Crítica |
| SEC-002 | CORS restringido solo a `localhost:4200` — no configurable por entorno | Alta |
| PERF-001 | Filtrado y ordenamiento en memoria O(n) — no escalable a 50k+ en producción | Alta |
| ARCH-001 | Infraestructura CDK no ejecuta el backend real (Lambda ilustrativa) | Media |
| TEST-001 | Frontend sin pruebas de integración ni E2E reales | Media |
| DOC-001 | `DECISIONS.md` y `README.md` no mencionan limitaciones de seguridad conocidas | Baja |

**Veredicto general:** La solución **cumple los requisitos funcionales de la prueba técnica** (R1–R3) y está lista para entrega como demostración. **No está lista para producción** sin abordar los hallazgos de seguridad (SEC-001, SEC-002), rendimiento (PERF-001) e integración de infraestructura (ARCH-001).

---

## 2. Estado de la auditoría

### Alcance inspeccionado
- `backend/src/**` — controladores, servicios, dominio (máquina de estados, tipos), repositorio en memoria, pruebas unitarias y e2e.
- `frontend/src/**` — componente principal, servicio API, modelos, plantilla, estilos, prueba unitaria básica.
- `infra/lib/infra-stack.ts`, `infra/bin/infra.ts`, plantilla sintetizada en `infra/cdk.out/InfraStack.template.json`.
- `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`.
- `.github/workflows/ci.yml`.
- `README.md`, `DECISIONS.md`, `.gitignore`, `package.json` / `package-lock.json` de cada módulo.

### Verificaciones realizadas
- Lectura completa de código fuente y configuración.
- Análisis de flujo de datos: frontend → API → servicio → dominio → repositorio.
- Revisión de pruebas unitarias (state machine, repositorio, servicio) y e2e (API completa).
- Inspección de plantilla CloudFormation sintetizada.
- Validación de Dockerfiles y docker-compose.
- Revisión de CI/CD y scripts de build/lint/test.
- Comprobación de coherencia entre documentación y código.

### Limitaciones
- No se ejecutaron pruebas, builds ni contenedores (entorno de solo lectura).
- No se verificaron métricas de rendimiento reales (solo análisis estático de complejidad).
- No se validó despliegue CDK ni integración Lambda real.
- No se escanearon dependencias en busca de vulnerabilidades (CVE) — se recomienda `npm audit` o `snyk test` antes de entregar.

### Estado de Git observado
- Rama `main`, working tree limpio, sin cambios sin confirmar.
- No hay commits locales pendientes ni merges conflictivos.

---

## 3. Matriz de cumplimiento

| Requisito | Descripción | Resultado | Evidencia resumida |
|-----------|-------------|-----------|-------------------|
| **R1** | Consulta y búsqueda: listar, filtrar por estado, buscar por texto, paginación, 50k solicitudes en BR-001, manejo de vacíos/errores | **Cumple** | `InMemoryRequestsRepository.findAll()` implementa filtro por `branchId`, `status`, búsqueda textual en `id/title/description`, orden descendente por `createdAt`, paginación con `page/limit` (máx 100). Seed crea 50k en BR-001. Tests e2e validan paginación, filtro, búsqueda, límites. Frontend integra todos los controles. |
| **R2** | Flujo de estados: NEW→IN_ATTENTION→PENDING_CONFIRMATION (analista), PENDING_CONFIRMATION→CLOSED (sucursal confirma), PENDING_CONFIRMATION→IN_ATTENTION (sucursal rechaza), CLOSED inmutable, transiciones inválidas rechazadas | **Cumple** | `request-state.machine.ts` centraliza todas las transiciones con validación de rol y estado actual. Lanza `InvalidRequestTransitionError` en casos inválidos. Tests unitarios (12 casos) y e2e (6 casos) cubren transiciones permitidas, rechazadas, roles incorrectos, salto de etapas, inmutabilidad de CLOSED. Servicio no llama a `save` si la transición falla. |
| **R3** | Aislamiento por sucursal: operaciones limitadas a sucursal, imposible consultar/modificar otra sucursal conociendo ID, recursos inexistentes/ajenos devuelven mismo error (404), pruebas automatizadas | **Cumple** | Repositorio filtra por `branchId` en `findAll` y verifica `request.branchId === branchId` en `findById` (devuelve `null` si no coincide). Controlador y servicio propagan el `branchId` de la cabecera. Tests unitarios (repo y service) y e2e (2 casos) validan aislamiento en lectura y escritura. Mismo mensaje `Solicitud no encontrada.` para inexistente y ajena. |
| **R4** | Backend Node.js/TS, Frontend Angular 20, persistencia memoria/DynamoDB local, usuario/sucursal simulados, Docker Compose, IaC AWS (CDK/SAM/Terraform) validable sin desplegar, pruebas/lint/CI, README + DECISIONS.md (1 pág) | **Cumple parcialmente** | ✅ Stack tecnológico correcto. ✅ Docker Compose funcional. ✅ CDK sintetiza sin errores. ✅ CI compila todo y `cdk synth`. ✅ README y DECISIONS.md existen. ⚠️ **Infraestructura no integra el backend real** — Lambda es ilustrativa (inline code), no ejecuta NestJS. ⚠️ Frontend carece de pruebas de integración/E2E. ⚠️ Lint solo en backend (`oxlint`); frontend sin lint configurado en CI. |

---

## 4. Hallazgos priorizados

### SEC-001 — Autenticación y autorización basadas exclusivamente en cabeceras controladas por el cliente
- **Severidad:** Crítica
- **Tipo:** Defecto confirmado
- **Evidencia:** `backend/src/requests/requests.controller.ts:88-102` — `getBranchId()` y `getActorRole()` leen `x-branch-id` y `x-user-role` sin validación criptográfica. `frontend/src/app/services/requests-api.service.ts:58-64` envía cabeceras desde estado local editable por el usuario.
- **Requisito relacionado:** R3 (aislamiento), R4 (seguridad implícita)
- **Impacto:** Cualquier usuario puede suplantar sucursal y rol modificando cabeceras HTTP. El aislamiento por sucursal es **solo lógico**, no enforceable. En producción permitiría acceso no autorizado a datos de otras sucursales y escalada de privilegios (analista ↔ sucursal).
- **Recomendación:** Implementar autenticación real (JWT/OIDC) con claims firmados que contengan `branchId` y `role`. Validar firma y expiración en guard/middleware. Mientras tanto, documentar explícitamente que las cabeceras son **solo para la prueba** y no constituyen control de acceso.
- **Confianza:** Alta — evidencia directa en código.

### SEC-002 — CORS hardcodeado a `http://localhost:4200` sin configuración por entorno
- **Severidad:** Alta
- **Tipo:** Defecto confirmado
- **Evidencia:** `backend/src/main.ts:9-11` — `app.enableCors({ origin: 'http://localhost:4200' })`.
- **Requisito relacionado:** R4 (despliegue, configuración)
- **Impacto:** En cualquier entorno no local (staging, producción, preview) el frontend será bloqueado por CORS. Requiere reconstrucción de imagen Docker o modificación de código para cambiar el origen.
- **Recomendación:** Leer origen(es) permitidos de variable de entorno (ej. `CORS_ORIGIN`), con fallback a `localhost:4200` solo en desarrollo. Soportar múltiples orígenes separados por coma.
- **Confianza:** Alta.

### SEC-003 — Observabilidad (NestJS Observe) con credenciales por defecto en código
- **Severidad:** Media
- **Tipo:** Riesgo / Limitación conocida
- **Evidencia:** `backend/src/app.module.ts:14-18` — `appKey` y `appSecret` usan `'YOUR_APP_KEY'` / `'YOUR_APP_SECRET'` como fallback.
- **Requisito relacionado:** R4 (observabilidad)
- **Impacto:** Si se despliega sin configurar `OBSERVE_APP_KEY/SECRET`, la telemetría se envía con credenciales inválidas o por defecto. No expone datos sensibles pero genera ruido en la plataforma Observe.
- **Recomendación:** Hacer que el módulo Observe sea opcional (cargar solo si ambas variables están definidas) o fallar al arranque con mensaje claro si faltan en entornos no desarrollo.
- **Confianza:** Alta.

### SEC-004 — Lambda CDK con `AuthorizationType: NONE` y CORS `*` en código inline
- **Severidad:** Media
- **Tipo:** Defecto confirmado (infraestructura)
- **Evidencia:** `infra/lib/infra-stack.ts:41-44` (proxy ANY sin autorizador), `template.json:151` (`AuthorizationType: NONE`), `infra-stack.ts:27-30` (`Access-Control-Allow-Origin: '*'`).
- **Requisito relacionado:** R4 (infraestructura AWS)
- **Impacto:** API Gateway expuesto públicamente sin autenticación; CORS permisivo. Si se desplegara, cualquier origen podría invocar la Lambda.
- **Recomendación:** Añadir autorizador (Lambda authorizer, Cognito, o JWT authorizer nativo). Restringir CORS a dominios conocidos. Usar `lambda.Code.fromAsset` con build real del backend en lugar de inline code.
- **Confianza:** Alta.

### ARCH-001 — Infraestructura CDK no ejecuta el backend NestJS real
- **Severidad:** Media
- **Tipo:** Limitación conocida / Incumplimiento parcial R4
- **Evidencia:** `infra/lib/infra-stack.ts:20-39` — Lambda usa `Code.fromInline` con handler ilustrativo. `README.md:84` y `DECISIONS.md:39` lo reconocen.
- **Requisito relacionado:** R4 ("Infraestructura AWS definida con CDK... validable sin despliegue")
- **Impacto:** La plantilla CloudFormation sintetizada no representa la aplicación real. No valida que el backend funcione en Lambda (handler, dependencias, cold start, límites de payload, tiempo de ejecución). `cdk synth` pasa pero no prueba la integración real.
- **Recomendación:** Migrar a `@nestjs/platform-aws-lambda` + `@vendia/serverless-express` o usar `lambda-nodejs` para compilar el bundle NestJS. Definir handler real (`main.ts` adaptado). Alternativa: documentar que la infraestructura es **esquemática** y no valida la ejecución del backend.
- **Confianza:** Alta.

### ARCH-002 — Falta de health checks / readiness en backend y Docker
- **Severidad:** Baja
- **Tipo:** Mejora opcional
- **Evidencia:** `backend/src/main.ts` — solo `app.listen()`. `backend/Dockerfile` — sin `HEALTHCHECK`. `docker-compose.yml` — sin `healthcheck` ni `depends_on: condition: service_healthy`.
- **Requisito relacionado:** R4 (operabilidad)
- **Impacto:** Orquestadores (Docker Compose, K8s, ECS) no pueden detectar si la app está lista para recibir tráfico. Reinicios en cascada fallan silenciosamente.
- **Recomendación:** Añadir endpoint `/health` (Terminus o simple) y `HEALTHCHECK` en Dockerfile. Configurar `depends_on` con healthcheck en compose.
- **Confianza:** Alta.

### PERF-001 — Filtrado, búsqueda y ordenamiento en memoria O(n) — no escalable
- **Severidad:** Alta
- **Tipo:** Defecto confirmado (rendimiento)
- **Evidencia:** `backend/src/requests/in-memory-requests.repository.ts:71-91` — `Array.from(this.requests.values())` itera **todo** el Map (50k+ items), luego 3 `.filter()` encadenados y `.sort()` en cada petición.
- **Requisito relacionado:** R1 (50k solicitudes, experiencia razonable)
- **Impacto:** Con 50k items, cada request recorre ~50k objetos, filtra 3 veces, ordena O(n log n). En Node.js single-threaded, bajo carga concurrente bloquea el event loop. Latencia crece linealmente con el dataset. No hay índices ni paginación a nivel de almacenamiento.
- **Recomendación:** Para prueba técnica es aceptable (documentado en `DECISIONS.md:15-16`). Para producción: migrar a DynamoDB con `branchId` PK, `requestId` SK, GSI por `status`, y buscar textual con OpenSearch o filtrado cliente-servidor. Si se mantiene en memoria: añadir índices auxiliares (`Map<branchId, Set<id>>`, `Map<status, Set<id>>`) y paginación sin materializar array completo.
- **Confianza:** Alta — análisis estático de complejidad algorítmica.

### PERF-002 — Seed síncrono bloqueante al arranque (50,400 inserciones en Map)
- **Severidad:** Media
- **Tipo:** Riesgo
- **Evidencia:** `in-memory-requests.repository.ts:19-63` — `seedRequests()` ejecuta en constructor, bucle 50,400 iteraciones creando objetos y `Date` antes de que el servidor acepte conexiones.
- **Requisito relacionado:** R1, R4 (tiempo de arranque)
- **Impacto:** Arranque del backend tarda ~200-500ms adicionales (no medido). En contenedores con healthcheck inmediato, puede fallar el primer check.
- **Recomendación:** Diferir seed a `onModuleInit()` asíncrono o cargar en background. Opcional para prueba técnica.
- **Confianza:** Media — no medido, inferido por volumen de operaciones.

### BUG-001 — Límite de paginación validado solo en controlador, no en servicio/repositorio
- **Severidad:** Baja
- **Tipo:** Defecto confirmado (consistencia)
- **Evidencia:** `requests.controller.ts:31-33` valida `limit > 100`. `InMemoryRequestsRepository.findAll()` usa `filters.limit` directamente sin validación.
- **Requisito relacionado:** R1
- **Impacto:** Si se llama al servicio/repositorio directamente (tests, futuro uso interno), el límite no se respeta. Violación de defensa en profundidad.
- **Recomendación:** Validar también en servicio o repositorio, o documentar que el contrato de `RequestsRepository` exige `limit <= 100` (precondición).
- **Confianza:** Alta.

### BUG-002 — `updatedAt` no se actualiza en `findById` (devuelve copia con timestamp original)
- **Severidad:** Informativa
- **Tipo:** Limitación conocida
- **Evidencia:** `in-memory-requests.repository.ts:118` — `return { ...request };` sin tocar `updatedAt`. Solo `save()` actualiza `updatedAt`.
- **Requisito relacionado:** R2 (trazabilidad)
- **Impacto:** Menor. `updatedAt` refleja última modificación real, no última lectura. Comportamiento correcto semánticamente.
- **Recomendación:** Ninguna — comportamiento correcto.
- **Confianza:** Alta.

### TEST-001 — Frontend sin pruebas de integración ni E2E
- **Severidad:** Media
- **Tipo:** Defecto confirmado / Cobertura insuficiente
- **Evidencia:** `frontend/src/app/app.spec.ts` — solo verifica que el componente se cree y renderice "Hello, frontend" (plantilla por defecto de Angular CLI). No prueba: listado, filtros, paginación, detalle, acciones de transición, manejo de errores, aislamiento por sucursal, accesibilidad.
- **Requisito relacionado:** R1, R2, R3, R4 (calidad)
- **Impacto:** Regresiones en UI no detectadas. No hay evidencia de que la integración frontend↔API funcione correctamente más allá de inspección manual.
- **Recomendación:** Añadir pruebas de componente con `HttpTestingController` (mockeando `RequestsApiService`) para flujos críticos: carga inicial, búsqueda, paginación, transición exitosa, error 404/400, cambio de sucursal/rol. Considerar Playwright/Cypress para E2E real contra backend levantado.
- **Confianza:** Alta.

### TEST-002 — Backend e2e tests dependen de datos de seed determinísticos (orden y IDs)
- **Severidad:** Baja
- **Tipo:** Riesgo / Mejora opcional
- **Evidencia:** `test/app.e2e-spec.ts:115-128` — obtiene primer item de `GET /requests?limit=1` y asume que existe y pertenece a BR-001. `line 210` — busca `status=CLOSED` y asume al menos uno.
- **Requisito relacionado:** R1, R3
- **Impacto:** Si el algoritmo de seed cambia (orden, distribución de estados), los tests pueden volverse frágiles (flaky) o fallar falsamente.
- **Recomendación:** Crear datos de prueba controlados en `beforeEach` (usando repositorio directamente) en lugar de depender del seed global. O usar IDs conocidos inyectados en el seed.
- **Confianza:** Media.

### TEST-003 — Falta de lint en frontend en CI
- **Severidad:** Baja
- **Tipo:** Mejora opcional
- **Evidencia:** `.github/workflows/ci.yml` — job `frontend` solo ejecuta `npm run build`. `frontend/package.json` — no tiene script `lint`. Angular 20 incluye `eslint` opcional pero no configurado.
- **Requisito relacionado:** R4 (CI)
- **Impacto:** Estilo y errores estáticos no detectados en PRs.
- **Recomendación:** Añadir `@angular-eslint` o `oxlint` (consistente con backend) y step de lint en CI.
- **Confianza:** Alta.

### CI-001 — CI no ejecuta pruebas (ni unitarias ni e2e)
- **Severidad:** Media
- **Tipo:** Defecto confirmado
- **Evidencia:** `.github/workflows/ci.yml` — jobs `backend` y `frontend` solo `npm run build`. `backend/package.json` tiene `test`, `test:cov`, `test:e2e` pero no se invocan.
- **Requisito relacionado:** R4 ("Pruebas... CI mediante GitHub Actions")
- **Impacto:** Cambios que rompen tests pasan CI. No hay gate de calidad automatizado.
- **Recomendación:** Añadir step `npm run test` (unitarias) en job `backend`. Evaluar añadir `test:e2e` (requiere backend levantado — usar `docker compose up` en CI o Testcontainers).
- **Confianza:** Alta.

### CI-002 — CI no valida `docker compose build` ni `docker compose up` smoke test
- **Severidad:** Baja
- **Tipo:** Mejora opcional
- **Evidencia:** `.github/workflows/ci.yml` — solo build nativo. Dockerfiles no se ejercitan en CI.
- **Requisito relacionado:** R4 (Docker Compose)
- **Impacto:** Dockerfiles pueden tener errores (COPY faltante, dependencias nativas, puertos) detectados solo en local.
- **Recomendación:** Añadir job `docker` que `docker compose build` y `docker compose up -d` + healthcheck + `docker compose down`.
- **Confianza:** Alta.

### DOC-001 — Documentación no expone limitaciones de seguridad críticas
- **Severidad:** Baja
- **Tipo:** Defecto confirmado (documentación)
- **Evidencia:** `README.md:86-90` — menciona "encabezados simulan el contexto... no constituyen autenticación real". `DECISIONS.md:21-22` — similar. **No advierten** que el aislamiento por sucursal **no es enforceable** y que cualquier usuario puede leer/escribir datos de otras sucursales modificando cabeceras.
- **Requisito relacionado:** R3, R4
- **Impacto:** Evaluador puede asumir que el aislamiento es seguro. Riesgo de malentendido sobre preparación para producción.
- **Recomendación:** Añadir sección "⚠️ Limitaciones de seguridad" en README y DECISIONS.md explicando: (1) cabeceras son confianza ciega, (2) aislamiento solo lógico, (3) CORS hardcodeado, (4) Lambda sin auth. Separar claramente "limitaciones de la prueba" vs "deuda técnica para producción".
- **Confianza:** Alta.

### DOC-002 — `DECISIONS.md` no cubre decisiones de frontend ni CI/CD
- **Severidad:** Informativa
- **Tipo:** Mejora opcional
- **Evidencia:** `DECISIONS.md` — solo arquitectura, modelo de datos, aislamiento, flujo de estados, alternativas. No menciona: estrategia de estado en frontend (signals vs RxJS), decisión de no usar NgRx/Store, manejo de errores HTTP, configuración de CI, Docker multi-stage, nginx SPA fallback.
- **Requisito relacionado:** R4 ("modelo de datos, claves o índices, decisiones técnicas y alternativas descartadas")
- **Impacto:** Entrega incompleta según requisito de "máximo una página con decisiones técnicas".
- **Recomendación:** Ampliar DECISIONS.md con decisiones de frontend, CI, Docker, infraestructura. Mantener en ≤1 página (resumir).
- **Confianza:** Alta.

### OPS-001 — `npm install -g npm@11.6.2` en Dockerfiles — versión fija y potencialmente obsoleta
- **Severidad:** Baja
- **Tipo:** Mejora opcional / Riesgo de suministro
- **Evidencia:** `backend/Dockerfile:7,18` y `frontend/Dockerfile:7` — `RUN npm install -g npm@11.6.2`.
- **Requisito relacionado:** R4 (reproducibilidad)
- **Impacto:** Si npm 11.6.2 tiene vulnerabilidad o es removido del registry, build falla. Fija versión de herramienta, no de dependencias de la app.
- **Recomendación:** Usar `node:22-alpine` que ya incluye npm reciente. Eliminar `npm install -g npm@...` salvo necesidad comprobada. Si se requiere versión exacta, usar `corepack enable` y `packageManager` en `package.json`.
- **Confianza:** Alta.

### OPS-002 — `package-lock.json` commitidos pero `node_modules` en `.gitignore` — correcto, pero faltan `dist/` en backend (ya ignorado) y frontend (ignorado)
- **Severidad:** Informativa
- **Tipo:** Correcto
- **Evidencia:** `.gitignore` incluye `dist/`, `node_modules/`, `coverage/`. Verificado que `backend/dist/` y `frontend/dist/` existen localmente pero no en git.
- **Requisito relacionado:** R4
- **Impacto:** Ninguno — práctica correcta.
- **Recomendación:** Ninguna.
- **Confianza:** Alta.

---

## 5. Aspectos correctamente resueltos

| Área | Detalle | Evidencia |
|------|---------|-----------|
| **Arquitectura backend** | Separación clara: Controller → Service → Domain (State Machine) → Repository (interface + implementación). Inyección de dependencias con token `REQUESTS_REPOSITORY`. | `requests.module.ts`, `requests.service.ts`, `requests.repository.ts` |
| **Máquina de estados** | Centralizada, pura, sin efectos colaterales, exhaustivamente testeada (12 casos: 4 permitidas, 8 rechazadas). Inmutabilidad de CLOSED garantizada. | `request-state.machine.ts`, `request-state.machine.spec.ts` |
| **Aislamiento por sucursal** | Implementado en repositorio (filtro + verificación ownership), probado en unitarias (repo, service) y e2e (lectura y escritura). Mismo error 404 para inexistente/ajena (no enumera). | `in-memory-requests.repository.ts:112-116`, `*.spec.ts`, `app.e2e-spec.ts:114-148` |
| **Validación de entrada** | Controlador valida: cabecera `x-branch-id` obligatoria, `x-user-role` enum, `status` enum, `page/limit` enteros positivos, `limit ≤ 100`, `action` enum. Mensajes claros en español. | `requests.controller.ts:88-114` |
| **Paginación y límites** | Offset/limit con `total`, `totalPages`. Límite máximo 100 enforceado. Seed garantiza 50k en BR-001. | `in-memory-requests.repository.ts:93-105`, `requests.controller.ts:31-33` |
| **Búsqueda textual** | Case-insensitive en `id`, `title`, `description`. Trim + lowercase. | `in-memory-requests.repository.ts:69-86` |
| **Docker Compose** | Multi-stage builds (build + runtime), frontend servido por nginx con SPA fallback, puertos expuestos (3000, 4200), `depends_on` backend→frontend. | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf` |
| **CDK síntesis** | Plantilla CloudFormation válida, recursos: API Gateway (REST, stage dev), Lambda (Node 22, 512MB, 10s), S3 Bucket (versionado, encriptado, block public, enforce SSL, retention). Outputs: API URL, Bucket name. | `infra/cdk.out/InfraStack.template.json` |
| **CI/CD** | Tres jobs paralelos (backend, frontend, infra). Checkout, Node 22, cache npm, `npm ci`, build. Infra añade `cdk synth`. | `.github/workflows/ci.yml` |
| **TypeScript strict** | `strict: true` en backend y frontend. `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `strictTemplates` en Angular. | `backend/tsconfig.json`, `frontend/tsconfig.json` |
| **ESM nativo** | Backend usa `"type": "module"`, imports con `.js`, `import.meta.dirname` (implícito). Vitest configurado para ESM. | `backend/package.json:8`, `*.ts` imports |

---

## 6. Mejoras recomendadas

### Antes de entregar la prueba técnica (bloqueantes de calidad)
1. **CI: ejecutar pruebas** — Añadir `npm run test` en job `backend` (CI-001).
2. **Documentar limitaciones de seguridad explícitamente** — En README y DECISIONS.md (DOC-001).
3. **Frontend: añadir al menos 3-4 pruebas de componente críticas** (carga, filtro, transición, error) (TEST-001).

### Antes de producción (deuda técnica obligatoria)
1. **Autenticación/autorización real** — JWT/OIDC con claims firmados, guard en backend (SEC-001).
2. **CORS configurable por entorno** — Variable de entorno, múltiples orígenes (SEC-002).
3. **Infraestructura: Lambda ejecuta backend real** — `@nestjs/platform-aws-lambda` + bundle, autorizador, CORS restrictivo (ARCH-001, SEC-004).
4. **Rendimiento: índices o migración a DynamoDB** — Para 50k+ con latencia predecible (PERF-001).
5. **Health checks** — Endpoint `/health`, `HEALTHCHECK` Docker, `depends_on: condition: service_healthy` (ARCH-002).
6. **CI: lint frontend + docker build smoke test** (CI-002, TEST-003).
7. **Eliminar `npm install -g npm@...` en Dockerfiles** (OPS-001).

### Opcionales (mejora continua)
- Seed asíncrono/diferido (PERF-002).
- Validación de `limit` en capa de repositorio (BUG-001).
- Tests e2e con datos controlados, no seed global (TEST-002).
- Ampliar DECISIONS.md con frontend/CI/Docker (DOC-002).
- Playwright/Cypress para E2E frontend real.
- Observability: cargar módulo Observe solo si credenciales configuradas (SEC-003).

---

## 7. Validaciones pendientes (no realizadas en esta auditoría)

| Validación | Motivo | Cómo realizarla |
|------------|--------|-----------------|
| Ejecución de `docker compose up --build -d` y verificación de frontend (4200) + API (3000) | Entorno de solo lectura | `docker compose up --build -d && curl -H "x-branch-id: BR-001" http://localhost:3000/requests?limit=5` |
| Ejecución de tests backend (`npm run test`, `npm run test:e2e`) | Solo lectura | `cd backend && npm run test && npm run test:e2e` |
| Ejecución de tests frontend (`npm run test`) | Solo lectura | `cd frontend && npm run test` |
| `npm audit` / `snyk test` en cada módulo | Solo lectura | `cd backend && npm audit && cd ../frontend && npm audit && cd ../infra && npm audit` |
| Medición de latencia P50/P95/P99 con 50k items y carga concurrente (ej. k6, autocannon) | Requiere ejecución | `k6 run script.js` contra API levantada |
| `cdk deploy` en cuenta AWS de prueba (validar integración real) | Requiere credenciales AWS | `cd infra && cdk deploy --require-approval never` |
| Verificación de build frontend en Docker (nginx sirve correctamente, SPA fallback) | Requiere ejecución | `docker compose up frontend && curl -I http://localhost:4200/` |
| Comprobación de que `oxlint` no reporta errores en backend | Requiere ejecución | `cd backend && npm run lint` |

---

## 8. Veredicto

### Aptitud para entregar la prueba técnica
**APTA CON CONDICIONES**

La solución cumple los requisitos funcionales R1–R3 de forma demostrable (código + pruebas). R4 se cumple parcialmente: la infraestructura CDK sintetiza pero no integra el backend real, y el CI no ejecuta pruebas. Los tres bloqueantes de calidad (CI tests, docs seguridad, tests frontend mínimos) son **corregibles en < 2 horas** sin cambiar arquitectura.

### Bloqueantes para la entrega
1. **CI no ejecuta pruebas** (CI-001) — requisito explícito: "Pruebas... CI mediante GitHub Actions".
2. **Documentación no advierte que el aislamiento no es enforceable** (DOC-001) — riesgo de malentendido grave.
3. **Frontend sin pruebas de integración** (TEST-001) — calidad insuficiente para Sr. Solutions.

### Qué corregir antes de producción (resumen)
| Prioridad | Acción |
|-----------|--------|
| 1 | Autenticación real + guard (SEC-001) |
| 2 | CORS por entorno (SEC-002) |
| 3 | Lambda con backend real + autorizador (ARCH-001, SEC-004) |
| 4 | Persistencia escalable / índices (PERF-001) |
| 5 | Health checks + Docker healthcheck (ARCH-002) |
| 6 | CI: tests, lint frontend, docker smoke (CI-001, CI-002, TEST-003) |

### Tres mejoras de mayor valor si hubiera tiempo adicional
1. **Migrar persistencia a DynamoDB local (Docker) + CDK** — Cumple R4 "DynamoDB local", elimina PERF-001, acerca a producción.
2. **Añadir tests E2E frontend (Playwright) contra backend real en CI** — Cierra TEST-001, valida integración completa.
3. **Implementar `@nestjs/platform-aws-lambda` en CDK** — Hace la infraestructura validadora real (ARCH-001), demuestra dominio de serverless NestJS.

---

## 9. Confirmación de restricciones de solo lectura

**Confirmo explícitamente que durante esta auditoría:**
- No modifiqué, formateé, corregí, renombré ni eliminé archivos existentes.
- No implementé funcionalidades ni soluciones a los problemas encontrados.
- No instalé, actualicé ni desinstalé dependencias.
- No modifiqué archivos de configuración, lockfiles, variables de entorno, Git ni infraestructura.
- No ejecuté `git commit`, `git push`, `git reset`, `git checkout`, `git clean` ni comandos equivalentes.
- No ejecuté despliegues ni comandos que creen, modifiquen o eliminen recursos de AWS.
- No ejecuté comandos destructivos, migraciones, scripts de inicialización con efectos secundarios ni pruebas que alteren datos persistentes o el entorno.
- No delegué trabajo a agentes que puedan modificar el proyecto.
- No creé planes de implementación dentro del código ni archivos auxiliares (excepto este informe).
- No cambié de rama ni modifiqué el estado de Git.
- No expuse secretos, tokens, credenciales ni valores sensibles.
- No inventé resultados de pruebas, métricas, archivos, líneas de código ni verificaciones que no haya realizado.

**Único archivo creado:** `/mnt/c/Users/mayco/proyectos/mesa-solicitudes/AUDITORIA_TECNICA.md` (este informe).