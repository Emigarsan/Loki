## MODOK Control Center

MODOK es una aplicación full-stack pensada para gestionar en vivo las mesas de juego y los contadores globales de un evento temático. El backend (Spring Boot) guarda el estado en memoria y expone una API REST; el frontend (React + Vite) ofrece vistas específicas para registro, seguimiento y operaciones administrativas.

---

### Estructura del repositorio

| Carpeta / archivo | Descripción |
| --- | --- |
| `backend/` | Servicio Spring Boot. Expone APIs para contadores globales, administración, mesas y snapshots. |
| `frontend/` | Aplicación React. Los artefactos principales están en `src/pages` (vistas), `src/App.jsx` (EventView compartido) y `src/styles.css`. |
| `start.sh` | Script de desarrollo local: compila el frontend, copia el build al backend y ejecuta el JAR resultante. |
| `Dockerfile` | Build multi-stage que produce una imagen con backend + frontend listos para producción. |

---

### Vistas del frontend

1. **`/register` – Registro de mesas del evento principal**
   - **Crear mesa**: define número de mesa, nombre opcional, dificultad, número de jugadores y los datos de cada jugador (personaje + aspecto). Tras crear, redirige a `/mesa/:mesaId`.
   - **Unirse**: lista las mesas existentes y permite entrar usando el código generado al crear la mesa.
   - **Límites**: número de jugadores entre 1 y 4; la mesa no puede repetirse.
   - Cada campo muestra un icono `?` con ayudas flotantes que aclaran restricciones y sugerencias.

2. **`/mesa/:mesaId` – Panel de contadores por mesa**
   - Reutiliza `EventView` (M.O.D.O.K, Contadores secundarios y terciarios) pero anota cada acción en `/api/mesas/:mesaId`.
   - Incluye botón **Volver** (redirecciona a `/register`).

3. **`/freegame` – Registro de mesas libres**
   - Similar a la vista de registro: número, nombre, dificultad, reto inevitable, jugadores y sus datos (incluye legado).
   - Tras crear o unirse, redirige a `/freegame/:mesaId`.
   - El reto inevitable `(Ninguno)` deja la puntuación total en 0 y bloquea los puntos de victoria.
   - Los campos numéricos muestran spinners y botones de ayuda `?` con explicaciones breves.

4. **`/freegame/:mesaId` – Ficha de mesa libre**
   - Muestra información de la mesa, desglose de puntuación (base, legados, puntos de victoria).
   - Botón **Volver** → `/freegame`.
   - Permite fijar “Puntos de Victoria”; al enviar se marca como definitivo.

5. **`/event` – Panel de contadores globales**
   - Usa `EventView` para operar los contadores centrales; acepta `?mesa=N` para registrar eventos también como mesa.

6. **`/display` – Visualización pública**
   - Muestra los contadores activos sin controles (modo display).

7. **`/admin` – Consola administrativa**
   - Requiere `X-Admin-Secret`. Permite ajustar contadores, consultar mesas de evento y libres, descargar/exportar datos, gestionar backups (snapshot ahora, listar, descargar, restaurar, purgar, etc.).

---

### API destacada del backend

| Endpoint | Descripción |
| --- | --- |
| `GET /api/counter` | Estado actual de los contadores globales. |
| `POST /api/counter/{primary|secondary|tertiary}/{increment|decrement}` | Ajusta contadores globales. |
| `POST /api/mesas/{mesaId}/contador/{1|2|3}` | Registra eventos de mesa. |
| `GET /api/mesas/summary` | Totales consolidados por mesa. |
| `POST /api/tables/register/create` | Crea mesa del evento. |
| `POST /api/tables/freegame/create` | Crea mesa libre (incluye reto inevitable y puntuación). |
| `GET /api/tables/freegame/by-number/{mesa}` | Recupera una mesa libre específica. |
| `POST /api/admin/backup/*` | Endpoints para snapshots (crear, listar, restaurar, borrar, etc.). |

---

### Puesta en marcha local

```bash
# Requisitos: Node 18+, Java 17+, Maven
./start.sh
# webpack dev server: cd frontend && npm install && npm run dev
# backend dev:       cd backend && mvn spring-boot:run
```

- `/frontend/vite.config.js` ya incluye proxy a `/api` → `http://localhost:8080`.
- Durante el build, el frontend queda embebido en `backend/src/main/resources/static`.

---

### Despliegue con Docker / Railway

```bash
docker build -t modok-control .
docker run -p 8080:8080 modok-control
```

- Para Railway: añadir `BACKUP_DIR`, `BACKUP_EVERY_MS`, `ADMIN_SECRET`, etc. según necesidad.
- El contenedor arranca el jar `app.jar` con el frontend servidos desde Spring Boot.
- La imagen fija `JAVA_TOOL_OPTIONS` con `-Xms128m -Xmx256m -XX:+UseSerialGC`; si necesitas más margen puedes sobrescribir la variable en Railway.
- `spring.main.lazy-initialization=true` viene activado para reducir memoria en reposo; desactívalo si detectas efectos secundarios en arranques muy frecuentes.

---

### Notas operativas

- **Snapshots**: se guardan como `app-YYYYMMDD-HHmmss.json`; puedes listarlos y restaurarlos vía `/api/admin/backup/*`.
- **Reto inevitable**: si es `(Ninguno)`, la puntuación de la mesa libre permanece en 0 (no se contabiliza legado ni VP).
- **Volver**: `/mesa/:id` → `/register`, `/freegame/:id` → `/freegame`.
- **Seguridad**: Ajusta `admin.secret` vía variable de entorno `ADMIN_SECRET`; restringe el acceso a `/admin/*`.

Con estas piezas podrás mantener la aplicación informada y operativa durante el evento, sea en local o desplegada en Railway.

