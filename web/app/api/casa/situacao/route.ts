import { pastaDaBiblioteca } from '@/lib/biblioteca';
import { acervo } from '@/lib/casa/acervo';
import { banco } from '@/lib/casa/banco';
import { tmdbConfigurado } from '@/lib/tmdb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Situação do modo de casa, para conferir que o acervo está vivo e
 * atualizado. Não expõe caminho de pasta nem chave: só se estão configurados.
 */
export function GET() {
  const relatorio = banco().lerControle('ultimo-relatorio');
  return Response.json(
    {
      tmdb: tmdbConfigurado(),
      biblioteca: pastaDaBiblioteca() !== null,
      acervo: acervo.situacao(),
      ultimoCiclo: relatorio ? JSON.parse(relatorio) : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
