Operativa de Backups y Mesas

- Backups locales: cada 1 min en `backups/app-YYYYMMDD-HHmmss.json`, se purgan >60 min.
- Copia a Drive: cada 10 min a `I:\Mi unidad\LMDT\InevitableCON 2025\Backups`, mantiene 6 copias.

Configuración (backend/src/main/resources/application.properties):
- `backup.dir=backups`
- `backup.every.ms=60000`
- `backup.retention.min=60`
- `drive.backup.dir=I:\\Mi unidad\\LMDT\\InevitableCON 2025\\Backups`
- `drive.every.ms=600000`
- `drive.keep.copies=6`

APIs por mesa:
- `POST /api/mesas/{mesaId}/contador/{1|2|3}` body `{ delta, uuid, ts }`
- `GET /api/mesas/summary` devuelve totales por mesa.

UI por mesa:
- Ruta del frontend: `/mesa/:mesaId` con botones `+1/-1` para cada contador.

Notas Windows:
- Si el servicio corre fuera de sesión, la unidad `I:` puede no montarse. Ejecuta bajo tu usuario o cambia `drive.backup.dir`.
