
import { supabase } from './supabase';
import { Activity } from '../types';

export interface ReportData {
    projectName: string;
    summary: string;
    activities: any[];
    startDate: string;
    endDate: string;
    totalAmount?: number;
    type: 'activity' | 'estimate';
}

export const reportService = {
    async fetchActivities(projectId: string, startDate: string, endDate: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('activities')
            .select('*, projects(name), issues(title, description)')
            .eq('project_id', projectId)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async fetchGlobalActivities(userId: string, startDate: string, endDate: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('activities')
            .select('*, projects(name), issues(title, description)')
            .eq('user_id', userId)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async summarizeActivities(
        activities: any[],
        type: 'activity' | 'estimate',
        userId?: string,
        totalAmount?: number,
        mode: 'project' | 'personal' = 'project',
        startDate?: string,
        endDate?: string
    ): Promise<string> {
        if (activities.length === 0) return "No se encontraron actividades en el periodo seleccionado.";

        // Simplify activities for the LLM
        const simplified = activities.map(a => ({
            action: a.action,
            details: a.details,
            issue_title: a.issues?.title,
            timestamp: a.created_at
        }));

        const prompt = mode === 'personal' ? `
      Actúa como una extensión de mi propia memoria (mi "Second Brain"). Mi objetivo es recordar qué hice y en qué proyectos invertí mi tiempo.
      
      FECHAS: Del ${new Date(startDate!).toLocaleDateString()} al ${new Date(endDate!).toLocaleDateString()}
      
      ACTIVIDADES REGISTRADAS:
      ${JSON.stringify(simplified, null, 2)}
      
      INSTRUCCIONES DE ESTRUCTURA:
      1. **Resumen Ejecutivo (Obligatorio):** Comienza con un párrafo breve (3-4 líneas) que sintetice mi actividad global. Responde: ¿Cuál fue mi foco principal? ¿Qué grandes avances logré? (Habla en primera persona: "Te enfocaste en...", "Lograste cerrar...").
      2. **Distribución por Proyectos:** Crea una sección por cada proyecto donde hubo actividad. Utiliza títulos claros con el nombre del proyecto.
      3. **Hitos por Proyecto:** Dentro de cada proyecto, agrupa las tareas por afinidad (ej: "Infraestructura", "UI/UX", "Correcciones"). No listes cada log individual si son muy similares, agrúpalos en un logro mayor.
      4. **Tono:** Personal, directo y que resalte los logros, no solo "crear tareas". 
      5. **Formato:** Markdown limpio, con negritas para destacar nombres de proyectos y hitos.
    ` : `
      Actúa como un gestor de proyectos experto. Tu tarea es resumir las siguientes actividades de desarrollo para un cliente.
      
      ESTILO: Professional, enfocado en el valor entregado y el progreso, NO técnico (evita detalles de código, enfócate en funcionalidad).
      
      TIPO DE REPORTE: ${type === 'activity' ? 'Resumen de Actividad' : 'Presupuesto/Estimación'}
      ${totalAmount ? `MONTO TOTAL: $${totalAmount} USD` : ''}
      
      ACTIVIDADES:
      ${JSON.stringify(simplified, null, 2)}
      
      INSTRUCCIONES:
      1. Agrupa las tareas por módulos o áreas de impacto.
      2. Si hay muchas actualizaciones visuales, menciónalas como mejoras de UX/UI.
      3. Destaca hitos importantes.
      4. Si es un presupuesto, explica brevemente el valor de lo implementado o por implementar.
      5. La respuesta debe estar en formato Markdown, estructurada con títulos y viñetas.
    `;

        try {
            const { data, error } = await supabase.functions.invoke('ai-brain', {
                body: {
                    message: prompt,
                    user_id: userId,
                    system_prompt: "Eres un generador de reportes de alta calidad para DyD Labs. Tu objetivo es resumir actividades técnicas en valor de negocio para el cliente.",
                }
            });

            if (error) throw error;
            return data?.response || "Error generando el resumen.";
        } catch (err) {
            console.error("Error in summarizeActivities:", err);
            return "Lo siento, hubo un error conectando con el cerebro de IA para resumir las actividades.";
        }
    },

    async saveReportAsDoc(projectId: string, title: string, content: string, type: string = 'draft'): Promise<void> {
        const { error } = await supabase
            .from('project_docs')
            .insert({
                project_id: projectId,
                title,
                content,
                type
            });

        if (error) throw error;
    },

    generateReportHtml(data: ReportData): string {
        const { projectName, summary, startDate, endDate, totalAmount, type } = data;
        const formattedStartDate = new Date(startDate).toLocaleDateString();
        const formattedEndDate = new Date(endDate).toLocaleDateString();

        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte - ${projectName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4F46E5;
            --primary-dark: #3730A3;
            --bg: #F8FAFC;
            --text: #1E293B;
            --text-light: #64748B;
            --white: #FFFFFF;
            --border: #E2E8F0;
            --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
        }

        .container {
            background-color: var(--white);
            max-width: 800px;
            width: 100%;
            padding: 50px;
            border-radius: 24px;
            box-shadow: var(--shadow);
            position: relative;
        }

        header {
            border-bottom: 2px solid var(--border);
            padding-bottom: 30px;
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .logo-area h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: var(--primary);
            letter-spacing: -0.025em;
        }

        .report-meta {
            text-align: right;
        }

        .report-meta h2 {
            margin: 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-light);
            font-weight: 700;
        }

        .report-meta p {
            margin: 5px 0 0;
            font-weight: 600;
            color: var(--text);
        }

        .project-banner {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            padding: 30px;
            border-radius: 16px;
            color: white;
            margin-bottom: 40px;
        }

        .project-banner h3 {
            margin: 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            opacity: 0.8;
        }

        .project-banner h2 {
            margin: 10px 0 0;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.025em;
        }

        .date-range {
            display: flex;
            gap: 20px;
            margin-top: 20px;
            font-size: 14px;
            font-weight: 600;
            opacity: 0.9;
        }

        .summary-content {
            font-size: 16px;
            color: var(--text);
        }

        .summary-content h1 { font-size: 24px; margin-top: 30px; border-bottom: 2px solid var(--border); padding-bottom: 10px; }
        .summary-content h2 { font-size: 20px; margin-top: 25px; color: var(--primary); }
        .summary-content h3 { font-size: 18px; margin-top: 20px; }
        .summary-content ul, .summary-content ol { padding-left: 20px; margin-bottom: 20px; }
        .summary-content li { margin-bottom: 8px; }
        .summary-content strong { color: var(--text); font-weight: 700; }
        .summary-content blockquote { border-left: 4px solid var(--primary); padding-left: 15px; color: var(--text-light); font-style: italic; margin: 20px 0; }
        .summary-content code { background: var(--bg); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }

        footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 2px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .monto-total {
            text-align: right;
        }

        .monto-total span {
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--text-light);
            font-weight: 700;
        }

        .monto-total strong {
            font-size: 28px;
            color: var(--text);
            font-weight: 800;
        }

        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; border: 1px solid #eee; }
            .no-print { display: none; }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo-area">
                <h1>DyD Labs</h1>
                <p style="font-size: 12px; color: var(--text-light); margin: 5px 0 0;">Project Management Intelligence</p>
            </div>
            <div class="report-meta">
                <h2>${type === 'activity' ? 'Resumen de Desarrollo' : 'Propuesta Económica'}</h2>
                <p>REF: ${projectName.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}</p>
            </div>
        </header>

        <div class="project-banner">
            <h3>Proyecto</h3>
            <h2>${projectName}</h2>
            <div class="date-range">
                <span>Desde: ${formattedStartDate}</span>
                <span>Hasta: ${formattedEndDate}</span>
            </div>
        </div>

        <div class="summary-content" id="rendered-summary">
            <!-- Cargando resumen... -->
        </div>

        <script>
            try {
                const rawSummary = ${JSON.stringify(summary)};
                document.getElementById('rendered-summary').innerHTML = marked.parse(rawSummary);
            } catch (e) {
                console.error('Error renderizando markdown:', e);
                document.getElementById('rendered-summary').innerText = 'Error al renderizar el contenido.';
            }
        </script>

        ${totalAmount ? `
        <footer>
            <div>
                <p style="font-size: 12px; color: var(--text-light); max-width: 300px;">Este reporte ha sido generado automáticamente basándose en los registros de actividad del sistema.</p>
            </div>
            <div class="monto-total">
                <span>Total Estimado</span>
                <strong>$${totalAmount} USD</strong>
            </div>
        </footer>
        ` : `
        <footer>
            <p style="font-size: 12px; color: var(--text-light);">Reporte de actividad para fines informativos y de seguimiento de hitos.</p>
        </footer>
        `}
    </div>
</body>
</html>
    `;
    }
};
