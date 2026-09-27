import { promises as fs } from 'node:fs';
import { caminhoSeguro, legendaDe, srtParaVtt } from '@/lib/biblioteca';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = caminhoSeguro(id);
  const legenda = video ? await legendaDe(video) : null;
  if (!legenda) return new Response('Sem legenda', { status: 404 });

  const bytes = await fs.readFile(legenda);
  // Legenda baixada no Brasil vem muito em Windows-1252. Se o UTF-8 não
  // fecha, lê como latin1, senão todo "ç" vira losango na tela.
  let texto = bytes.toString('utf8');
  if (texto.includes('�')) texto = bytes.toString('latin1');

  return new Response(legenda.endsWith('.vtt') ? texto : srtParaVtt(texto), {
    headers: { 'Content-Type': 'text/vtt; charset=utf-8' },
  });
}
