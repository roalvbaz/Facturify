/**
 * GET /api/cron/verifactu
 *
 * Cron job que procesa la cola de envíos Veri*factu.
 * Ejecutar cada 60 segundos desde Render Cron Jobs o externamente.
 *
 * Seguridad: comprobar un token de cabecera para evitar invocaciones no autorizadas.
 * Configurar VERIFACTU_CRON_SECRET en Render (openssl rand -hex 32).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processQueue } from '@/lib/verifactu/queue/processor';

export async function GET(req: NextRequest) {
  // Verificar token de autorización del cron
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.VERIFACTU_CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await processQueue(20);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('❌ Error en cron Veri*factu:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error del procesador' },
      { status: 500 }
    );
  }
}
