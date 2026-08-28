-- Insertar plantillas de correo de ejemplo

INSERT INTO plantillas_correo (nicho, slug, nombre, asunto, cuerpo, variables, activa)
VALUES
  ('general', 'bienvenida-cliente', 'Bienvenida a cliente', 'Bienvenido a BAC — Tu plataforma de cumplimiento LOPDP', 'Hola {{nombre}},

Bienvenido a BAC, tu plataforma integral de cumplimiento con la Ley Orgánica de Protección de Datos Personales (LOPDP).

Tu cuenta ha sido activada correctamente. Puedes acceder en cualquier momento con las credenciales proporcionadas.

**Próximos pasos:**
1. Accede a tu expediente
2. Completa tu Registro de Actividades de Tratamiento (RAT)
3. Realiza el análisis de riesgos
4. Carga los documentos requeridos

Si tienes dudas, contacta a nuestro equipo de soporte.

Saludos,
Equipo BAC', ARRAY['nombre'], true),

  ('general', 'estado-expediente', 'Notificación de estado', 'Actualización de tu expediente en BAC', 'Hola {{nombre}},

Tu expediente ha sido actualizado. Nuevo estado: {{estado}}

{{mensaje}}

Puedes ver los detalles en tu panel: https://bac.ejemplo.com/dashboard

Saludos,
Equipo BAC', ARRAY['nombre', 'estado', 'mensaje'], true),

  ('general', 'documentos-faltantes', 'Aviso de documentos faltantes', 'Documetos pendientes en tu expediente', 'Hola {{nombre}},

Hemos revisado tu expediente y encontramos que faltan los siguientes documentos:

{{documentos}}

Por favor completa la carga de estos documentos para que podamos continuar con la evaluación de tu cumplimiento normativo.

Puedes cargar los documentos aquí: https://bac.ejemplo.com/expediente/documentos

Saludos,
Equipo BAC', ARRAY['nombre', 'documentos'], true),

  ('general', 'confirmacion-datos', 'Confirmación de datos recibidos', 'Confirmación: Datos recibidos correctamente', 'Hola {{nombre}},

Confirmamos que hemos recibido exitosamente los siguientes datos:

- Fecha de recepción: {{fecha}}
- Tipo de documento: {{tipo_documento}}
- Referencia: {{referencia}}

Procederemos a revisar la información de inmediato. Te notificaremos cuando el proceso esté completo.

Saludos,
Equipo BAC', ARRAY['nombre', 'fecha', 'tipo_documento', 'referencia'], true),

  ('general', 'auditoría-completada', 'Auditoría completada', 'Resultado: Auditoría completada', 'Hola {{nombre}},

La auditoría de tu expediente ha sido completada.

**Resultado:** {{resultado}}
**Calificación:** {{calificacion}}/100

Puedes ver el informe detallado en tu dashboard.

Si tienes preguntas sobre el resultado, no dudes en contactarnos.

Saludos,
Equipo BAC', ARRAY['nombre', 'resultado', 'calificacion'], true),

  ('escuelas', 'bienvenida-institucion-educativa', 'Bienvenida institución educativa', 'Bienvenida {{nombre_institucion}} — Cumplimiento LOPDP', 'Estimado Responsable de Protección de Datos,

Bienvenido a BAC. Esta plataforma le guiará en la implementación del cumplimiento con la LOPDP de forma específica para instituciones educativas.

**Información de su institución:**
- Nombre: {{nombre_institucion}}
- Sector: Educación
- Responsable designado: {{nombre_responsable}}

Puede comenzar completando su Registro de Actividades de Tratamiento (RAT) usando la plantilla preparada para su sector.

Para más información, consulte nuestra guía: https://bac.ejemplo.com/guias/educacion

Saludos,
Equipo BAC', ARRAY['nombre_institucion', 'nombre_responsable'], true),

  ('clinicas', 'bienvenida-institucion-salud', 'Bienvenida institución de salud', 'Bienvenida {{nombre_institucion}} — Cumplimiento LOPDP Sector Salud', 'Estimado Responsable de Protección de Datos,

Bienvenido a BAC. Como institución de salud, su cumplimiento con la LOPDP incluye consideraciones especiales sobre datos de salud y categorías especiales.

**Información de su institución:**
- Nombre: {{nombre_institucion}}
- Sector: Salud
- Responsable designado: {{nombre_responsable}}

Iniciamos con una plantilla de RAT adaptada a su sector, incluyendo actividades comunes en clínicas y hospitales.

Para más información, consulte nuestra guía: https://bac.ejemplo.com/guias/salud

Saludos,
Equipo BAC', ARRAY['nombre_institucion', 'nombre_responsable'], true)

ON CONFLICT (slug) DO NOTHING;
