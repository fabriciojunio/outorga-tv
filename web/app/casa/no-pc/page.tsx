import type { Metadata } from 'next';
import { Fileira } from '@/components/casa/Fileira';
import { itensDaBiblioteca } from '@/components/casa/itensDaBiblioteca';
import { listarBiblioteca, pastaDaBiblioteca } from '@/lib/biblioteca';

export const metadata: Metadata = { title: 'No seu PC' };
export const dynamic = 'force-dynamic';

export default async function NoPc() {
  if (!pastaDaBiblioteca()) {
    return (
      <div className="envolucro secao">
        <h1 className="titulo-pagina">No seu PC</h1>
        <p className="fraco">
          Nenhuma pasta de vídeos configurada neste servidor. No PC de casa, coloque o caminho em{' '}
          <code>BIBLIOTECA_DIR</code> no arquivo <code>web/.env.local</code>.
        </p>
      </div>
    );
  }

  const arquivos = await listarBiblioteca();
  const secoes = [
    { titulo: 'Filmes', itens: arquivos.filter((a) => a.temporada === null) },
    { titulo: 'Séries', itens: arquivos.filter((a) => a.temporada !== null) },
    { titulo: 'Dublados', itens: arquivos.filter((a) => a.idioma === 'dublado') },
    { titulo: 'Legendados', itens: arquivos.filter((a) => a.idioma === 'legendado') },
    { titulo: 'Ainda sem capa (nome não reconhecido)', itens: arquivos.filter((a) => !a.tmdb) },
  ];

  return (
    <div className="envolucro casa-fileiras">
      <h1 className="titulo-pagina">No seu PC</h1>
      <p className="fraco">
        {arquivos.length} vídeo{arquivos.length === 1 ? '' : 's'} na pasta. Arquivo novo aparece aqui em até um minuto.
      </p>
      {secoes.map((s) => (
        <Fileira key={s.titulo} titulo={s.titulo} itens={itensDaBiblioteca(s.itens)} />
      ))}
    </div>
  );
}
