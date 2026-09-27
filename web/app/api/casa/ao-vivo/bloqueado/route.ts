import { marcarBloqueado } from '@/lib/casa/aoVivo';

export const runtime = 'nodejs';

/** O player avisa que um vídeo não pode tocar embutido. Fica anotado por 6 horas. */
export async function POST(pedido: Request) {
  const corpo = (await pedido.json().catch(() => ({}))) as { video?: unknown };
  const video = typeof corpo.video === 'string' ? corpo.video : '';
  if (!/^[\w-]{11}$/.test(video)) return new Response(null, { status: 400 });
  marcarBloqueado(video);
  return new Response(null, { status: 204 });
}
