import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlayerLocal } from '@/components/casa/PlayerLocal';
import { caminhoSeguro, listarBiblioteca } from '@/lib/biblioteca';

export const dynamic = 'force-dynamic';

type Parametros = { params: Promise<{ id: string }> };

async function achar(id: string) {
  if (!caminhoSeguro(id)) return null;
  const arquivos = await listarBiblioteca();
  const arquivo = arquivos.find((a) => a.id === id);
  if (!arquivo) return null;

  // Próximo episódio: o seguinte da mesma série, na ordem de temporada e número.
  let proximo = null;
  if (arquivo.temporada !== null) {
    const daSerie = arquivos
      .filter((a) => a.temporada !== null && (arquivo.tmdb ? a.tmdb?.id === arquivo.tmdb.id : a.nome === arquivo.nome))
      .sort((a, b) => (a.temporada ?? 0) - (b.temporada ?? 0) || (a.episodio ?? 0) - (b.episodio ?? 0));
    proximo = daSerie[daSerie.findIndex((a) => a.id === id) + 1] ?? null;
  }
  return { arquivo, proximo };
}

const rotulo = (a: { nome: string; temporada: number | null; episodio: number | null }, nomeDaSerie?: string) =>
  a.temporada !== null ? `${nomeDaSerie ?? a.nome} · T${a.temporada} E${a.episodio}` : (nomeDaSerie ?? a.nome);

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const achado = await achar((await params).id);
  return achado ? { title: rotulo(achado.arquivo, achado.arquivo.tmdb?.nome) } : {};
}

export default async function Tocar({ params }: Parametros) {
  const { id } = await params;
  const achado = await achar(id);
  if (!achado) notFound();
  const { arquivo, proximo } = achado;
  const nome = rotulo(arquivo, arquivo.tmdb?.nome);

  return (
    <div className="envolucro secao">
      <div className="espalha" style={{ marginBottom: 14 }}>
        <h1 className="titulo-player">{nome}</h1>
        {arquivo.tmdb && (
          <Link href={`/casa/${arquivo.tmdb.tipo}/${arquivo.tmdb.id}`} className="apagado">
            Sobre o título
          </Link>
        )}
      </div>
      <PlayerLocal
        id={arquivo.id}
        nome={nome}
        capa={arquivo.tmdb?.capa ?? null}
        fundo={arquivo.tmdb?.fundo ?? null}
        temLegenda={arquivo.temLegenda}
        proximo={proximo ? { id: proximo.id, nome: `T${proximo.temporada} E${proximo.episodio}` } : null}
      />
    </div>
  );
}
