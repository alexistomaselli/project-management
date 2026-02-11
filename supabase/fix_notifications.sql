-- 1. Habilitar Realtime para la tabla de recordatorios
-- Esto soluciona el problema de que el globo de notificaciones no se actualiza sin refrescar la página.
ALTER PUBLICATION supabase_realtime ADD TABLE reminders;

-- 2. Asegurar que pg_cron y pg_net estén instalados (requerido para el envío automático)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. (Opcional) Limpiar jobs anteriores si existen para evitar duplicidad
-- SELECT cron.unschedule('process-reminders-job');

-- 4. Programar el procesamiento de recordatorios cada minuto
-- NOTA: Ajustaremos el URL a la URL de tu proyecto. El Service Role Key debe estar configurado en platform_settings.
DO $$
DECLARE
    project_url TEXT;
    service_role TEXT;
BEGIN
    SELECT value->>'url' INTO project_url FROM platform_settings WHERE key = 'api_info';
    SELECT value->>'service_role_key' INTO service_role FROM platform_settings WHERE key = 'api_info';

    IF project_url IS NOT NULL AND service_role IS NOT NULL THEN
        PERFORM cron.schedule(
            'process-reminders-job',
            '* * * * *',
            format(
                'SELECT net.http_post(url := %L, headers := %L, body := %L)',
                project_url || '/functions/v1/process-reminders',
                jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || service_role
                ),
                '{}'::jsonb
            )
        );
    END IF;
END $$;
