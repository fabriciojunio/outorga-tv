package br.com.outorga.casa;

import android.content.Context;
import android.content.SharedPreferences;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletionService;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Decide para onde o app aponta: o PC de casa, se ele estiver na mesma rede,
 * ou o site da internet, se não estiver.
 *
 * Ninguém precisa digitar endereço. O app lembra o último PC achado; se ele
 * não responder (o roteador pode ter trocado o número dele), varre a rede
 * local procurando quem responde em /api/casa/vivo na porta 3000.
 */
final class Servidor {

    static final int PORTA = 3000;
    private static final String PREFERENCIAS = "outorga";
    private static final String CHAVE_CASA = "endereco_casa";
    private static final String CHAVE_SO_INTERNET = "so_internet";

    private Servidor() {
    }

    static SharedPreferences preferencias(Context contexto) {
        return contexto.getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
    }

    static String casaGuardada(Context contexto) {
        return preferencias(contexto).getString(CHAVE_CASA, null);
    }

    static void guardarCasa(Context contexto, String endereco) {
        preferencias(contexto).edit().putString(CHAVE_CASA, endereco).apply();
    }

    static boolean soInternet(Context contexto) {
        return preferencias(contexto).getBoolean(CHAVE_SO_INTERNET, false);
    }

    static void definirSoInternet(Context contexto, boolean valor) {
        preferencias(contexto).edit().putBoolean(CHAVE_SO_INTERNET, valor).apply();
    }

    /** O endereço responde como um Outorga TV de casa? */
    static boolean responde(String base, int limiteMs) {
        HttpURLConnection conexao = null;
        try {
            conexao = (HttpURLConnection) new URL(base + "/api/casa/vivo").openConnection();
            conexao.setConnectTimeout(limiteMs);
            conexao.setReadTimeout(limiteMs);
            conexao.setUseCaches(false);
            if (conexao.getResponseCode() != 200) return false;
            try (InputStream entrada = conexao.getInputStream()) {
                byte[] buffer = new byte[256];
                int lidos = entrada.read(buffer);
                String corpo = lidos > 0 ? new String(buffer, 0, lidos, StandardCharsets.UTF_8) : "";
                return corpo.contains("\"outorga\":\"casa\"");
            }
        } catch (Exception erro) {
            return false;
        } finally {
            if (conexao != null) conexao.disconnect();
        }
    }

    /** Endereços IPv4 da rede local deste aparelho (Wi-Fi ou cabo). */
    static List<String> prefixosLocais() {
        List<String> prefixos = new ArrayList<>();
        try {
            for (NetworkInterface placa : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!placa.isUp() || placa.isLoopback()) continue;
                for (InetAddress endereco : Collections.list(placa.getInetAddresses())) {
                    if (endereco instanceof Inet4Address && endereco.isSiteLocalAddress()) {
                        String ip = endereco.getHostAddress();
                        String prefixo = ip.substring(0, ip.lastIndexOf('.') + 1);
                        if (!prefixos.contains(prefixo)) prefixos.add(prefixo);
                    }
                }
            }
        } catch (Exception ignorado) {
            // sem rede local, sem busca
        }
        return prefixos;
    }

    /**
     * Varre a rede local atrás do PC. São 254 endereços por rede, 48 de cada
     * vez, com meio segundo de espera cada: em torno de três segundos no pior
     * caso. Devolve o primeiro que responder, ou null.
     */
    static String procurarNaRede() {
        List<String> prefixos = prefixosLocais();
        if (prefixos.isEmpty()) return null;

        ExecutorService operarios = Executors.newFixedThreadPool(48);
        CompletionService<String> resultados = new ExecutorCompletionService<>(operarios);
        List<Future<String>> tarefas = new ArrayList<>();
        try {
            for (String prefixo : prefixos) {
                for (int ultimo = 1; ultimo <= 254; ultimo++) {
                    final String base = "http://" + prefixo + ultimo + ":" + PORTA;
                    tarefas.add(resultados.submit(() -> responde(base, 500) ? base : null));
                }
            }
            for (int i = 0; i < tarefas.size(); i++) {
                Future<String> pronto = resultados.poll(6, TimeUnit.SECONDS);
                if (pronto == null) break;
                String achado = pronto.get();
                if (achado != null) return achado;
            }
            return null;
        } catch (Exception erro) {
            return null;
        } finally {
            operarios.shutdownNow();
        }
    }

    /**
     * O endereço a usar agora. Roda fora da tela principal, porque pode levar
     * alguns segundos. Nunca devolve null: na dúvida, é a internet.
     */
    static Escolha escolher(Context contexto) {
        if (soInternet(contexto)) return new Escolha(BuildConfig.ENDERECO_INTERNET, false);

        String guardada = casaGuardada(contexto);
        if (guardada != null && responde(guardada, 1500)) return new Escolha(guardada, true);

        String achada = procurarNaRede();
        if (achada != null) {
            guardarCasa(contexto, achada);
            return new Escolha(achada, true);
        }
        return new Escolha(BuildConfig.ENDERECO_INTERNET, false);
    }

    static final class Escolha {
        final String base;
        final boolean emCasa;

        Escolha(String base, boolean emCasa) {
            this.base = base;
            this.emCasa = emCasa;
        }
    }
}
