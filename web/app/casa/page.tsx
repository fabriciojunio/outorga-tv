import Link from 'next/link';
import { ContinuarAssistindo } from '@/components/casa/ContinuarAssistindo';
import { Fileira } from '@/components/casa/Fileira';
import { itensDaBiblioteca } from '@/components/casa/itensDaBiblioteca';
import { Prateleiras } from '@/components/casa/Prateleiras';
import { listarBiblioteca, pastaDaBiblioteca, type ArquivoDeVideo } from '@/lib/biblioteca';
import { acervo } from '@/lib/casa/acervo';
import { tmdbConfigurado, type Detalhe } from '@/lib/tmdb';

// A pasta de casa muda quando alguém copia um filme, então a página é
// montada a cada visita. Quem responde é o banco, então isso custa pouco.
export const dynamic = 'force-dynamic';

const ATALHOS = [
  { href: '/casa/ao-vivo', titulo: 'TV ao vivo', texto: 'Globo, SBT, Record, notícias' },
  { href: '/casa/series', titulo: 'Novelas e séries', texto: 'Separadas por serviço' },
  { href: '/casa/filmes', titulo: 'Filmes', texto: 'Netflix, Prime, Globoplay...' },
  { href: '/casa/esportes', titulo: 'Esportes', texto: 'Jogos de hoje e onde passa' },
  { href: '/casa/infantil', titulo: 'Infantil', texto: 'Só o que é livre' },
];

export default async function Casa() {
  if (!tmdbConfigurado()) {
    return (
      <div className="envolucro secao">
        <div className="aviso atencao">
          Falta a chave do TMDB. Coloque <code>TMDB_TOKEN</code> no arquivo <code>web/.env.local</code> e
          reinicie o servidor. O passo a passo está em <code>docs/CASA.md</code>.
        </div>
      </div>
    );
  }

  const [arquivos, emAlta] = await Promise.all([
    listarBiblioteca().catch(() => [] as ArquivoDeVideo[]),
    acervo.lista('emAlta').catch(() => []),
  ]);

  // O destaque é o primeiro em alta. O detalhe dele quase sempre já está no
  // banco (o sincronizador puxa antes); se não estiver, a página segue sem.
  let destaque: Detalhe | null = null;
  const primeiro = emAlta[0];
  if (primeiro && acervo.temTitulo(primeiro.tipo, primeiro.id)) {
    destaque = await acervo.titulo(primeiro.tipo, primeiro.id).catch(() => null);
  }

  return (
    <>
      {destaque && (
        <section className="destaque" style={{ backgroundImage: destaque.fundo ? `url(${destaque.fundo})` : undefined }}>
          <div className="destaque-sombra">
            <div className="envolucro">
              <span className="apagado">Em alta esta semana</span>
              <h1>{destaque.nome}</h1>
              {destaque.sinopse && <p>{destaque.sinopse}</p>}
              <div className="acoes">
                <Link href={`/casa/${destaque.tipo}/${destaque.id}`} className="botao">
                  Ver detalhes
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="envolucro casa-fileiras">
        <nav className="atalhos" aria-label="Atalhos">
          {ATALHOS.map((a) => (
            <Link key={a.href} href={a.href} className="atalho" prefetch={false}>
              <strong>{a.titulo}</strong>
              <span>{a.texto}</span>
            </Link>
          ))}
        </nav>

        <ContinuarAssistindo />

        {pastaDaBiblioteca() &&
          (arquivos.length > 0 ? (
            <>
              <Fileira titulo="No seu PC" itens={itensDaBiblioteca(arquivos)} />
              <p>
                <Link href="/casa/no-pc" className="apagado">
                  Ver tudo que está no PC, separado em dublados e legendados →
                </Link>
              </p>
            </>
          ) : (
            <p className="apagado">A pasta de vídeos está configurada, mas ainda não tem nenhum vídeo nela.</p>
          ))}

        <Prateleiras pagina="inicio" />
      </div>
    </>
  );
}
