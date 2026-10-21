# KOF Maracaibo · Gestión de planta

Aplicación web responsive en HTML, CSS y JavaScript, con una API REST ligera en Node.js sin dependencias externas. Incluye Sedes, Trabajadores, Asistencia y Accesos; creación y lectura de registros, validación del servidor, selectores relacionales y tema claro/oscuro.

`schema.sql` es el esquema relacional integrado para MySQL 8.0.16+ o MariaDB con InnoDB. Conserva las tablas originales del sistema de novedades (`areas`, `asistencia`, `empresa`, `estatus_asis`, `estatus_nov`, `novedades`, `permisos`, `roles`, `roles_permisos`, `tipo_nov`, `turnos`, `usuarios` y `usuario_roles`) y suma sedes, trabajadores y accesos. `usuarios.trabajador_id` vincula opcionalmente una cuenta con el trabajador; `id_usuario` sigue identificando al autor de asistencia y novedades. Las novedades también pueden asociarse con el trabajador afectado y su sede.

## Inicio

Requiere Node.js 18 o superior. Desde esta carpeta ejecuta `npm start` y abre `http://localhost:3000` (en PowerShell de Windows, usa `npm.cmd start` si la política de ejecución bloquea `npm.ps1`). Para usar `http://127.0.0.1:8000`, configura `$env:PORT='8000'` antes de iniciar el servidor. El servidor crea automáticamente `data/erp.json` con la sede inicial Planta Maracaibo. Los registros añadidos desde la aplicación se guardan en ese archivo.

Para crear una base MySQL nueva, ejecuta `schema.sql` una sola vez en la base seleccionada. El DDL incluye las áreas y estados de asistencia usados por el ERP; los catálogos de tipos/estados de novedad, empresas, turnos, roles y permisos quedan vacíos porque el archivo de origen no proporcionó sus datos. El script es un esquema inicial, no una migración para una instalación con datos: respalda esa base y prepara una migración `ALTER TABLE` específica antes de aplicarlo allí.

También es posible abrir `index.html` directamente para probar la interfaz; en ese modo limitado, los cambios quedan en el almacenamiento local del navegador y no usan la API.

## API REST

- `GET /api/health` — estado del servicio.
- `POST /api/login`, `GET /api/session` y `POST /api/logout` — inicio, consulta y cierre de sesión.
- `GET /api/sedes`, `/api/trabajadores`, `/api/asistencia`, `/api/accesos` — listar registros (requiere sesión).
- `POST` a las mismas rutas — crear registro (requiere sesión); devuelve `201` y el registro con ID generado, o `400` con `{ "error": "..." }` si falla la validación.

El servidor valida campos requeridos, catálogos, correo, unicidad de cédula y referencias a sede/trabajador. Los identificadores se generan como `SED-001`, `TRB-001`, `ASI-001` y `ACC-001`.

## Cuentas y acceso

El servidor requiere cuentas locales en `data/auth-users.json` y no crea contraseñas predeterminadas. Crea primero un hash para cada contraseña (se solicita sin mostrarla en pantalla):

```powershell
npm run hash-password
```

En PowerShell de Windows, usa `npm.cmd run hash-password` si la política de ejecución bloquea `npm.ps1`.

Copia el hash generado en `data/auth-users.json`, siguiendo esta estructura:

```json
[
  {
    "id": "admin-001",
    "name": "Encargado de planta",
    "email": "encargado@empresa.com",
    "role": "encargado",
    "passwordHash": "scrypt$PEGA_AQUI_EL_SALT$PEGA_AQUI_EL_HASH"
  },
  {
    "id": "guardia-a",
    "name": "Guardia de turno A",
    "email": "guardia.a@empresa.com",
    "role": "guardia",
    "guard": "A",
    "passwordHash": "scrypt$PEGA_AQUI_EL_SALT$PEGA_AQUI_EL_HASH"
  }
]
```

Genera una cuenta de guardia por cada `guard` (`A`, `B`, `C` y `D`); cada cuenta queda asociada a una sola guardia y el servidor valida que la selección del formulario coincida con esa asignación. Para usar otro archivo, define `KOF_USERS_FILE` con su ruta antes de iniciar el servidor. La interfaz incluye inicio/cierre de sesión, cookie `HttpOnly` con `SameSite=Strict` y bloqueo temporal tras cinco intentos fallidos. Las cuentas de guardia pueden registrar asistencia y accesos; solo el Encargado puede crear sedes o trabajadores. No publiques el archivo de cuentas ni lo guardes dentro de una carpeta servida por otro servidor web.

## Persistencia y producción

La API incluida todavía usa un archivo JSON local como adaptador demostrativo; no se conecta automáticamente a MySQL y el módulo de novedades todavía no tiene vistas/API en la aplicación. `schema.sql` define la base integrada, pero para usarla desde la web falta sustituir el almacenamiento de `server.js` por consultas MySQL y mapear los nombres/catálogos legacy. Para desplegar con datos reales, añadir autenticación/autorización basada en `usuarios`, `roles` y `permisos`, auditoría, TLS, backups y políticas de retención. No utilizar este prototipo como sistema de control de acceso físico sin integración y revisión de seguridad.
