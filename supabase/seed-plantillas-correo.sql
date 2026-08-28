-- Plantillas de correo predefinidas para BAC
-- Ejecutar una sola vez en Supabase SQL Editor

INSERT INTO plantillas_correo (tipo, asunto, cuerpo)
VALUES
  ('bienvenida', 'Bienvenido a BAC — Tu plataforma de cumplimiento LOPDP',
   '<p>Estimado/a cliente,</p><p>Le damos la bienvenida a <strong>BAC Legal Advisor</strong>, su plataforma integral de cumplimiento con la Ley Orgánica de Protección de Datos Personales (LOPDP).</p><p>Su cuenta ha sido activada correctamente. Puede acceder en cualquier momento con las credenciales proporcionadas.</p><p><strong>Próximos pasos:</strong></p><ol><li>Acceda a su expediente</li><li>Complete su Registro de Actividades de Tratamiento (RAT)</li><li>Realice el análisis de riesgos</li><li>Cargue los documentos requeridos</li></ol><p>Si tiene dudas, no dude en contactar a nuestro equipo.</p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>'),

  ('recordatorio', 'Recordatorio: Documentos pendientes en su expediente',
   '<p>Estimado/a cliente,</p><p>Le recordamos que tiene <strong>documentos pendientes</strong> por cargar en su expediente de cumplimiento LOPDP.</p><p>La carga oportuna de estos documentos es fundamental para mantener su nivel de cumplimiento normativo al día.</p><p>Por favor, ingrese a su plataforma y complete la carga de los documentos faltantes a la brevedad posible.</p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>'),

  ('actualizacion', 'Actualización de su expediente en BAC',
   '<p>Estimado/a cliente,</p><p>Le informamos que su expediente de cumplimiento LOPDP ha sido actualizado.</p><p>Le invitamos a revisar los cambios realizados ingresando a su plataforma.</p><p>Si tiene preguntas sobre las modificaciones, no dude en contactarnos.</p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>'),

  ('vencimiento', 'Aviso: Próximo vencimiento de plazo LOPDP',
   '<p>Estimado/a cliente,</p><p>Le notificamos que se aproxima el <strong>vencimiento de un plazo</strong> relacionado con su cumplimiento LOPDP.</p><p>Es importante que tome las acciones necesarias antes de la fecha límite para evitar posibles sanciones o incumplimientos.</p><p>Ingrese a su plataforma para revisar los detalles y tomar las medidas correspondientes.</p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>'),

  ('brecha', 'IMPORTANTE: Notificación de brecha de seguridad',
   '<p>Estimado/a cliente,</p><p>Se ha registrado una <strong>brecha de seguridad</strong> que requiere su atención inmediata.</p><p>De acuerdo con la LOPDP, toda brecha de seguridad que afecte datos personales debe ser:</p><ol><li>Documentada internamente</li><li>Notificada a la Autoridad de Protección de Datos dentro de las 72 horas</li><li>Comunicada a los titulares afectados si implica un riesgo alto</li></ol><p>Por favor, ingrese a su plataforma para completar el informe de brecha y tome las acciones correspondientes.</p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>'),

  ('auditoria', 'Resultado de auditoría de cumplimiento LOPDP',
   '<p>Estimado/a cliente,</p><p>La auditoría de su expediente de cumplimiento LOPDP ha sido completada.</p><p>Puede revisar el resultado detallado, incluyendo su puntuación de cumplimiento y las recomendaciones de mejora, directamente en su plataforma.</p><p>Le recomendamos atender las observaciones encontradas para mejorar su nivel de cumplimiento.</p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>'),

  ('credenciales', 'Sus credenciales de acceso a BAC',
   '<p>Estimado/a cliente,</p><p>A continuación encontrará sus credenciales de acceso a la plataforma BAC Legal Advisor:</p><p><strong>Correo:</strong> (su correo registrado)<br/><strong>Contraseña:</strong> (la contraseña proporcionada)</p><p>Le recomendamos cambiar su contraseña después del primer inicio de sesión.</p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>'),

  ('general', 'Comunicado de BAC Legal Advisor',
   '<p>Estimado/a cliente,</p><p></p><p>Atentamente,<br/>Equipo BAC Legal Advisor</p>')

ON CONFLICT DO NOTHING;
