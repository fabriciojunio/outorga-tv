import { ImageResponse } from 'next/og';

// O Android só aceita instalar o app com ícone PNG de 192 e 512. Em vez de
// guardar imagens no repositório, o desenho do icon.svg é refeito aqui no
// tamanho pedido, e o resultado fica em cache como arquivo estático.
const TAMANHOS = new Set(['192', '512', '180']);

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [...TAMANHOS].map((tamanho) => ({ tamanho: `${tamanho}.png` }));
}

export async function GET(_pedido: Request, { params }: { params: Promise<{ tamanho: string }> }) {
  const lado = (await params).tamanho.replace(/\.png$/, '');
  if (!TAMANHOS.has(lado)) return new Response('Tamanho não disponível', { status: 404 });
  const n = Number(lado);
  const u = n / 32;

  return new ImageResponse(
    (
      <div style={{ width: n, height: n, background: '#0d0f14', display: 'flex', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 6 * u, top: 10 * u, width: 11 * u, height: 2.5 * u, borderRadius: 1.25 * u, background: '#e6b800' }} />
        <div style={{ position: 'absolute', left: 6 * u, top: 16 * u, width: 20 * u, height: 10 * u, borderRadius: 2 * u, border: `${2 * u}px solid #e6b800` }} />
        <div style={{ position: 'absolute', left: 8.5 * u, top: 21.5 * u, width: 15 * u, height: 1.5 * u, borderRadius: 0.75 * u, background: '#e6b800', opacity: 0.55 }} />
      </div>
    ),
    { width: n, height: n },
  );
}
