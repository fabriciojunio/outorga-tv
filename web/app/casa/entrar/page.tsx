'use client';

import { useState } from 'react';

// Só volta para dentro do modo de casa. Um "voltar" apontando para outro site
// transformaria a tela de entrar em trampolim de golpe.
function destinoSeguro(): string {
  if (typeof window === 'undefined') return '/casa';
  const voltar = new URLSearchParams(window.location.search).get('voltar') ?? '';
  return voltar.startsWith('/casa') && !voltar.startsWith('//') ? voltar : '/casa';
}

export default function Entrar() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const resposta = await fetch('/api/casa/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { mensagem?: string };
      if (!resposta.ok) {
        setErro(corpo.mensagem ?? 'Não deu para entrar agora. Tente de novo.');
        return;
      }
      window.location.href = destinoSeguro();
    } catch {
      setErro('Sem conexão com o servidor. Confira a internet ou se o computador de casa está ligado.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="envolucro entrar-casa">
      <form onSubmit={entrar} className="cartao">
        <h1>Entrar</h1>
        <p className="fraco">Digite o seu número e a sua senha.</p>

        <div className="campo">
          <label htmlFor="login">Número</label>
          <input
            id="login"
            inputMode="numeric"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value.replace(/\s/g, ''))}
            autoFocus
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type={mostrar ? 'text' : 'password'}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button type="button" className="botao-texto" onClick={() => setMostrar((m) => !m)}>
          {mostrar ? 'Esconder a senha' : 'Mostrar a senha'}
        </button>

        {erro && (
          <div className="aviso erro" role="alert">
            {erro}
          </div>
        )}

        <button className="botao largo" type="submit" disabled={entrando} style={{ marginTop: 16 }}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="apagado" style={{ marginTop: 14 }}>
          Depois de entrar, este aparelho fica conectado por 6 meses.
        </p>
      </form>
    </div>
  );
}
