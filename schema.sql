-- Esquema integrado para MySQL 8.0.16+ / MariaDB con InnoDB y utf8mb4.
-- Conserva las tablas del sistema de novedades y añade las relaciones KOF.
-- Este DDL describe una base nueva; respaldar y preparar una migracion antes
-- de aplicarlo sobre una instancia que ya contenga datos.

CREATE TABLE areas (
  id          INT NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_areas_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sedes (
  id          VARCHAR(20) NOT NULL COMMENT 'Codigo generado por la aplicacion, por ejemplo SED-001',
  nombre      VARCHAR(140) NOT NULL,
  tipo        VARCHAR(40) NOT NULL,
  direccion   TEXT NOT NULL,
  estado      VARCHAR(10) NOT NULL DEFAULT 'Activa',
  capacidad   INT NOT NULL,
  telefono    VARCHAR(40) NOT NULL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_sedes_tipo CHECK (tipo IN ('Planta de Producción','Centro de Distribución','Oficina Administrativa')),
  CONSTRAINT chk_sedes_estado CHECK (estado IN ('Activa','Inactiva')),
  CONSTRAINT chk_sedes_capacidad CHECK (capacidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trabajadores (
  cedula          VARCHAR(24) NOT NULL,
  nombre          VARCHAR(160) NOT NULL,
  correo          VARCHAR(100) NOT NULL,
  telefono        VARCHAR(40) NOT NULL,
  cargo           VARCHAR(80) NOT NULL,
  departamento    VARCHAR(50) NOT NULL,
  id_area         INT NULL,
  sede_id         VARCHAR(20) NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'Activo',
  fecha_ingreso   DATE NOT NULL,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cedula),
  UNIQUE KEY uq_trabajadores_correo (correo),
  KEY idx_trabajadores_area (id_area),
  KEY idx_trabajadores_sede (sede_id),
  CONSTRAINT fk_trabajadores_area FOREIGN KEY (id_area) REFERENCES areas(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_trabajadores_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_trabajadores_cargo CHECK (cargo IN ('Operador de Línea','Supervisor de Calidad','Conductor','Administrativo','Seguridad','Técnico de Mantenimiento','Otro')),
  CONSTRAINT chk_trabajadores_departamento CHECK (departamento IN ('Producción','Logística','Mantenimiento','Recursos Humanos','Seguridad')),
  CONSTRAINT chk_trabajadores_estado CHECK (estado IN ('Activo','Vacaciones','Suspendido','Inactivo'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresa (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_empresa_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estatus_asis (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estatus_asis_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estatus_nov (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estatus_nov_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tipo_nov (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipo_nov_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE turnos (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_turnos_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id                  INT NOT NULL AUTO_INCREMENT,
  name                VARCHAR(100) NOT NULL,
  email               VARCHAR(100) NOT NULL,
  password            VARCHAR(255) NOT NULL COMMENT 'Guardar hash seguro, nunca contrasena en texto plano',
  two_factor_secret   VARCHAR(255) NULL,
  trabajador_id       VARCHAR(24) NULL COMMENT 'Vinculo opcional con el trabajador representado por esta cuenta',
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_trabajador (trabajador_id),
  CONSTRAINT fk_usuarios_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(cedula) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permisos (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permisos_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles_permisos (
  id_rol      INT NOT NULL,
  id_permiso  INT NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  KEY idx_roles_permisos_permiso (id_permiso),
  CONSTRAINT fk_roles_permisos_rol FOREIGN KEY (id_rol) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_roles_permisos_permiso FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuario_roles (
  id_usuario  INT NOT NULL,
  id_rol      INT NOT NULL,
  PRIMARY KEY (id_usuario, id_rol),
  KEY idx_usuario_roles_rol (id_rol),
  CONSTRAINT fk_usuario_roles_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_usuario_roles_rol FOREIGN KEY (id_rol) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Se conserva el nombre y la estructura funcional de la tabla original.
-- Los campos KOF nuevos son anulables para permitir importar marcajes previos.
CREATE TABLE asistencia (
  id                  INT NOT NULL AUTO_INCREMENT,
  id_usuario          INT NOT NULL,
  fecha_hora          DATETIME NOT NULL,
  puesto              VARCHAR(100) NULL DEFAULT NULL,
  id_turno            INT NULL DEFAULT NULL,
  id_estatus_asis     INT NULL DEFAULT NULL,
  trabajador_id       VARCHAR(24) NULL,
  sede_id             VARCHAR(20) NULL,
  evento              VARCHAR(32) NULL,
  observacion         TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_asistencia_usuario_fecha (id_usuario, fecha_hora),
  KEY idx_asistencia_trabajador_fecha (trabajador_id, fecha_hora),
  KEY idx_asistencia_sede_fecha (sede_id, fecha_hora),
  CONSTRAINT fk_asistencia_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_asistencia_turno FOREIGN KEY (id_turno) REFERENCES turnos(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_asistencia_estatus FOREIGN KEY (id_estatus_asis) REFERENCES estatus_asis(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_asistencia_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(cedula) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_asistencia_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_asistencia_evento CHECK (evento IS NULL OR evento IN ('Entrada Turno','Salida Almuerzo','Entrada Almuerzo','Salida Turno'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE novedades (
  id                  INT NOT NULL AUTO_INCREMENT,
  id_tipo_nov         INT NULL DEFAULT NULL,
  id_usuario          INT NOT NULL,
  descripcion         TEXT NOT NULL,
  fecha_hora          DATETIME NOT NULL,
  id_turno            INT NULL DEFAULT NULL,
  id_area             INT NULL DEFAULT NULL,
  id_empresa          INT NULL DEFAULT NULL,
  id_estatus_nov      INT NULL DEFAULT NULL,
  trabajador_id       VARCHAR(24) NULL COMMENT 'Trabajador afectado; id_usuario conserva al autor del reporte',
  sede_id             VARCHAR(20) NULL,
  PRIMARY KEY (id),
  KEY idx_novedades_usuario_fecha (id_usuario, fecha_hora),
  KEY idx_novedades_trabajador_fecha (trabajador_id, fecha_hora),
  KEY idx_novedades_sede_fecha (sede_id, fecha_hora),
  KEY idx_novedades_area (id_area),
  KEY idx_novedades_tipo_estado (id_tipo_nov, id_estatus_nov),
  CONSTRAINT fk_novedades_tipo FOREIGN KEY (id_tipo_nov) REFERENCES tipo_nov(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_novedades_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_novedades_turno FOREIGN KEY (id_turno) REFERENCES turnos(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_novedades_area FOREIGN KEY (id_area) REFERENCES areas(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_novedades_empresa FOREIGN KEY (id_empresa) REFERENCES empresa(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_novedades_estatus FOREIGN KEY (id_estatus_nov) REFERENCES estatus_nov(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_novedades_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(cedula) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_novedades_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE accesos (
  id                  VARCHAR(24) NOT NULL COMMENT 'Codigo generado por la aplicacion, por ejemplo ACC-001',
  placa               VARCHAR(16) NOT NULL,
  tipo_vehiculo       VARCHAR(60) NOT NULL,
  responsable_tipo    VARCHAR(30) NOT NULL,
  trabajador_id       VARCHAR(24) NULL,
  visitante_nombre    VARCHAR(160) NULL,
  visitante_cedula    VARCHAR(32) NULL,
  movimiento          VARCHAR(8) NOT NULL,
  fecha_hora          DATETIME NOT NULL,
  zona                VARCHAR(40) NOT NULL,
  sede_id             VARCHAR(20) NOT NULL,
  novedades           TEXT NULL,
  creado_en           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_accesos_placa_fecha (placa, fecha_hora),
  KEY idx_accesos_sede_fecha (sede_id, fecha_hora),
  CONSTRAINT fk_accesos_trabajador FOREIGN KEY (trabajador_id) REFERENCES trabajadores(cedula) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_accesos_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_accesos_tipo_vehiculo CHECK (tipo_vehiculo IN ('Camión de Reparto / Distribución','Vehículo Particular de Empleado','Transporte Externo / Contratista','Montacargas')),
  CONSTRAINT chk_accesos_responsable CHECK (responsable_tipo IN ('Trabajador','Visitante / Contratista')),
  CONSTRAINT chk_accesos_movimiento CHECK (movimiento IN ('Entrada','Salida')),
  CONSTRAINT chk_accesos_zona CHECK (zona IN ('Zona A - Carga','Zona B - Empleados','Zona C - Visitantes','Zona D - Operaciones')),
  CONSTRAINT chk_accesos_responsable_datos CHECK (
    (responsable_tipo = 'Trabajador' AND trabajador_id IS NOT NULL AND visitante_nombre IS NULL AND visitante_cedula IS NULL)
    OR
    (responsable_tipo = 'Visitante / Contratista' AND trabajador_id IS NULL AND visitante_nombre IS NOT NULL AND visitante_cedula IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalogos iniciales que ya utiliza el modulo KOF de personal/asistencia.
-- Los catalogos propios de novedades quedan vacios porque el archivo fuente
-- no incluia filas ni valores permitidos.
INSERT INTO areas (name) VALUES
  ('Producción'), ('Logística'), ('Mantenimiento'), ('Recursos Humanos'), ('Seguridad');

INSERT INTO estatus_asis (name) VALUES
  ('A Tiempo'), ('Retardo'), ('Hora Extra'), ('Permiso Médico');

INSERT INTO sedes (id, nombre, tipo, direccion, estado, capacidad, telefono) VALUES
  ('SED-001', 'Planta Maracaibo', 'Planta de Producción', 'Zona Industrial, Av. 17, Maracaibo, estado Zulia', 'Activa', 350, '+58 261 700 0000');
