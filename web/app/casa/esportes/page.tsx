import type { Metadata } from 'next';
import Link from 'next/link';
import { AtualizarSozinho } from '@/components/casa/AtualizarSozinho';
import { transmissoes, type Transmissao } from '@/lib/casa/aoVivo';
import { diaEmBrasilia, jogos, tituloFalaDoJogo, type Jogo } from '@/lib/casa/esportes';

export const metadata: Metadata = { title: 'Esportes' };
export const dynamic = 'force-dynamic';

const hora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const diaDe = (iso: string) => diaEmBrasilia(0, new Date(iso));

function Placar({ jogo, noApp }: { jogo: Jogo; noApp: Transmissao | null }) {
  return (
    <div className={`jogo ${jogo.estado === 'agora' ? 'jogo-agora' : ''}`}>
      <div className="jogo-topo">
        <span className="apagado">{jogo.competicao}</span>
        {jogo.estado === 'agora' ? (
          <span className="selo ruim">AO VIVO · {jogo.detalhe}</span>
        ) : jogo.estado === 'fim' ? (
          <span className="selo">Encerrado</span>
        ) : (
          <span className="selo">{hora(jogo.inicio)}</span>
        )}
      </div>
      {[jogo.casa, jogo.fora].map((time) => (
        <div key={time.nome} className="jogo-time">
          {time.logo ? <img src={time.logo} alt="" width={28} height={28} loading="lazy" /> : <span className="jogo-sem-logo" />}
          <span>{time.nome}</span>
          <strong>{time.placar ?? ''}</strong>
        </div>
      ))}
      {noApp ? (
        <Link href={`/casa/ao-vivo/${noApp.canal}`} className="botao largo" style={{ marginTop: 10 }}>
          ▶ Assistir aqui na {noApp.nome}
        </Link>
      ) : (
        jogo.estado !== 'fim' && <p className="apagado jogo-onde">Costuma passar em: {jogo.ondePassa.join(', ')}</p>
      )}
    </div>
  );
}

export default async function Esportes({ searchParams }: { searchParams: Promise<{ esporte?: string }> }) {
  const filtro = (await searchParams).esporte;
  const [{ lista, atualizadoEm }, aoVivo] = await Promise.all([jogos(), transmissoes().catch(() => [])]);
  const noAr = aoVivo.filter((t) => t.video && t.titulo);

  const escolhidos = lista.filter((j) => !filtro || j.esporte === filtro);
  const hoje = diaEmBrasilia(0);
  const grupos = [
    { titulo: 'Acontecendo agora', itens: escolhidos.filter((j) => j.estado === 'agora') },
    { titulo: 'Mais tarde, hoje', itens: escolhidos.filter((j) => j.estado === 'antes' && diaDe(j.inicio) === hoje) },
    { titulo: 'Amanhã', itens: escolhidos.filter((j) => j.estado === 'antes' && diaDe(j.inicio) > hoje) },
    { titulo: 'Já terminaram hoje', itens: escolhidos.filter((j) => j.estado === 'fim') },
  ];
  const acharNoApp = (jogo: Jogo) =>
    jogo.estado === 'agora' ? (noAr.find((t) => tituloFalaDoJogo(t.titulo ?? '', jogo)) ?? null) : null;

  return (
    <div className="envolucro casa-fileiras">
      <AtualizarSozinho segundos={60} />
      <h1 className="titulo-pagina">Esportes</h1>
      <nav className="linha" aria-label="Escolher esporte" style={{ marginBottom: 10 }}>
        <Link href="/casa/esportes" className={`botao ${filtro ? 'secundario' : ''}`}>
          Todos
        </Link>
        <Link href="/casa/esportes?esporte=futebol" className={`botao ${filtro === 'futebol' ? '' : 'secundario'}`}>
          Futebol
        </Link>
        <Link href="/casa/esportes?esporte=basquete" className={`botao ${filtro === 'basquete' ? '' : 'secundario'}`}>
          Basquete
        </Link>
      </nav>
      <p className="apagado">
        O placar se atualiza sozinho a cada minuto.
        {atualizadoEm ? ` Última atualização às ${hora(new Date(atualizadoEm).toISOString())}.` : ''}
      </p>

      {lista.length === 0 && (
        <div className="aviso atencao">Não foi possível carregar os jogos agora. A página tenta de novo sozinha.</div>
      )}

      {grupos.map(
        (g) =>
          g.itens.length > 0 && (
            <section key={g.titulo} className="fileira">
              <h2 className="titulo-secao">{g.titulo}</h2>
              <div className="grade-jogos">
                {g.itens.map((j) => (
                  <Placar key={j.id} jogo={j} noApp={acharNoApp(j)} />
                ))}
              </div>
            </section>
          ),
      )}

      {escolhidos.length === 0 && lista.length > 0 && <p className="fraco">Nenhum jogo deste esporte hoje nem amanhã.</p>}

      <section className="fileira">
        <h2 className="titulo-secao">Transmissões esportivas agora</h2>
        <p className="fraco">
          A CazéTV passa muitos jogos de graça e toca aqui dentro. Quando ela estiver ao vivo, aparece na página{' '}
          <Link href="/casa/ao-vivo">Ao vivo</Link>.
        </p>
      </section>
    </div>
  );
}
