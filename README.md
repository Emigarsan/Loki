## MODOK Control Center

<div style="background:#3b2f0b;padding:12px 14px;border-radius:10px;border:1px solid #c8a233;color:#f5e9c9;">
  <strong>TODO</strong>
  <ul>
    <li>Arreglar las realidades con datos reales</li>
    <li>Revisar nombres de tablas y valores</li>
    <li>Cambiar umbrales de los planes</li>
    <li>Anadir la info por sectores (dano total por sector, Magog y Puerta)</li>
  </ul>
</div>

---

MODOK es una aplicacion full-stack para gestionar en vivo las mesas de juego y contadores globales del evento. El backend (Spring Boot) guarda el estado en memoria y expone una API REST; el frontend (React + Vite) ofrece vistas de registro, tablero por mesa, display y administracion.

---

### Estructura del repositorio

| Carpeta / archivo | Descripcion |
| --- | --- |
| backend/ | Servicio Spring Boot. Expone APIs para contadores globales, mesas, sectores, admin y snapshots. |
| frontend/ | Aplicacion React. Vistas principales en src/pages y el tablero compartido en src/App.jsx. |
| start.sh | Script local: build del frontend, copia a backend y ejecuta el JAR. |
| Dockerfile | Build multi-stage para backend + frontend. |

---

### Vistas del frontend

1. /register - Registro de mesas del evento principal
   - Crear mesa: numero, nombre opcional, dificultad, jugadores y datos (personaje + aspecto).
   - Unirse: lista mesas existentes y permite entrar con codigo.
   - Tras crear o unirse, redirige a /mesa/:mesaId.

2. /mesa/:mesaId - Panel de mesa
   - Reutiliza EventView con anotacion por mesa.
   - Acciones guiadas para derrotas de avatar, heroe y plan principal.

3. /freegame - Registro de mesas libres
   - Similar al registro principal, con reto inevitable y legado.
   - Tras crear o unirse, redirige a /freegame/:mesaId.

4. /freegame/:mesaId - Ficha de mesa libre
   - Muestra desglose de puntuacion y permite fijar Puntos de Victoria.

5. /event - Panel de contadores globales
   - Tablero central; acepta ?mesa=N para registrar eventos como mesa.

6. /display - Visualizacion publica
   - Muestra contadores sin controles (modo display).

7. /admin - Consola administrativa
   - Autenticada con X-Admin-Secret.
   - Tabs: Modificar valores, Mesas, Estadisticas, Backups.
   - Exportaciones: XLSX (Event y Totales por mesa) y CSV para freegame.

---

### Exportaciones (Admin)

- Event XLSX
  - Una fila por jugador, con conteo de muertes del heroe en su mesa.
  - No incluye columnas de avatares.
- Mesas Totales XLSX
  - Totales por mesa (avatares, ruptura y amenaza).
  - Sin contadores C1-C3.

---

### API destacada del backend

| Endpoint | Descripcion |
| --- | --- |
| GET /api/counter | Estado actual de contadores globales. |
| POST /api/counter/{primary|secondary|tertiary}/{increment|decrement} | Ajusta contadores globales. |
| GET /api/mesas/summary | Totales consolidados por mesa. |
| POST /api/mesas/{mesaId}/hero-defeat | Registra heroe derrotado en una mesa. |
| POST /api/mesas/{mesaId}/plan-completion | Registra plan principal completado en una mesa. |
| POST /api/tables/register/create | Crea mesa del evento. |
| POST /api/tables/freegame/create | Crea mesa libre. |
| GET /api/admin/backup/* | Endpoints de snapshots (crear, listar, restaurar, borrar, etc.). |

---

### Puesta en marcha local

```bash
# Requisitos: Node 18+, Java 17+, Maven
./start.sh
# frontend dev: cd frontend && npm install && npm run dev
# backend dev:  cd backend && mvn spring-boot:run
```

- frontend/vite.config.js incluye proxy a /api -> http://localhost:8080.
- El build del frontend se embebe en backend/src/main/resources/static.

---

### Despliegue con Docker

```bash
docker build -t modok-control .
docker run -p 8080:8080 modok-control
```

- Configura ADMIN_SECRET y variables de backup segun necesidad.
- La imagen fija JAVA_TOOL_OPTIONS con limites conservadores; puedes sobrescribir.

---

### Notas operativas

- Snapshots: se guardan como app-YYYYMMDD-HHmmss.json.
- Reto inevitable: si es (Ninguno), la puntuacion total queda en 0.
- Seguridad: ajusta admin.secret via ADMIN_SECRET y restringe /admin/*.
