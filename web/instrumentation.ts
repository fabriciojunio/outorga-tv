/**
 * Roda uma vez quando o servidor do Next sobe. Liga o sincronizador do
 * acervo de casa, que mantém o banco atualizado a partir do TMDB.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { iniciarSincronizacao } = await import('./lib/casa/sincronizacao');
  iniciarSincronizacao();
}
