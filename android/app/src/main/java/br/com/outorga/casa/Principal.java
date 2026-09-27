package br.com.outorga.casa;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

/**
 * A única tela do app: o Outorga TV aberto num WebView.
 *
 * O app não tem conteúdo próprio. Ele escolhe o servidor (o PC de casa, se
 * estiver na rede, ou a internet) e cuida do que o navegador comum não cuida
 * bem na TV: botão de voltar do controle, vídeo em tela cheia, tela sempre
 * acesa e abrir Netflix, Globoplay e afins no aplicativo deles.
 */
public class Principal extends Activity {

    private WebView web;
    private TextView aviso;
    private FrameLayout raiz;
    private View telaCheia;
    private WebChromeClient.CustomViewCallback fecharTelaCheia;
    private String base;
    private boolean emCasa;
    private final Handler principal = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        // Quem assiste não quer a tela apagando no meio do capítulo.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.parseColor("#0D0F14"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0D0F14"));
        raiz.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        aviso = new TextView(this);
        aviso.setTextColor(Color.parseColor("#E9ECF2"));
        aviso.setTextSize(22);
        aviso.setGravity(Gravity.CENTER);
        aviso.setBackgroundColor(Color.parseColor("#0D0F14"));
        aviso.setPadding(48, 48, 48, 48);
        raiz.addView(aviso, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(raiz);

        prepararWeb();
        conectar();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void prepararWeb() {
        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);
        ajustes.setDomStorageEnabled(true);
        ajustes.setMediaPlaybackRequiresUserGesture(false);
        ajustes.setLoadWithOverviewMode(true);
        ajustes.setUseWideViewPort(true);
        ajustes.setAllowFileAccess(false);
        ajustes.setAllowContentAccess(false);
        ajustes.setUserAgentString(ajustes.getUserAgentString() + " OutorgaApp/" + BuildConfig.VERSION_NAME);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new PonteComOSite(), "OutorgaApp");
        web.setWebViewClient(new Cliente());
        web.setWebChromeClient(new Cromo());
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
    }

    /** Descobre o servidor fora da tela principal e carrega o site. */
    private void conectar() {
        mostrarAviso("Procurando o computador de casa...");
        new Thread(() -> {
            Servidor.Escolha escolha = Servidor.escolher(this);
            principal.post(() -> {
                base = escolha.base;
                emCasa = escolha.emCasa;
                web.loadUrl(base + "/casa");
            });
        }).start();
    }

    private void mostrarAviso(String texto) {
        aviso.setText(texto);
        aviso.setVisibility(View.VISIBLE);
    }

    private boolean ehDoServidor(Uri endereco) {
        if (base == null || endereco == null || endereco.getHost() == null) return false;
        Uri nosso = Uri.parse(base);
        return endereco.getHost().equalsIgnoreCase(nosso.getHost()) && endereco.getPort() == nosso.getPort();
    }

    /** Netflix, Globoplay, SBT: abre no app do serviço, ou no navegador do aparelho. */
    private boolean abrirFora(Uri endereco) {
        try {
            Intent abrir = new Intent(Intent.ACTION_VIEW, endereco);
            abrir.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(abrir);
            return true;
        } catch (ActivityNotFoundException semApp) {
            return false;
        }
    }

    private final class Cliente extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView vista, WebResourceRequest pedido) {
            Uri endereco = pedido.getUrl();
            if (ehDoServidor(endereco)) return false;
            // Fora do nosso servidor, abre no app certo. Se não houver app
            // nenhum para abrir, deixa o WebView tentar.
            return abrirFora(endereco);
        }

        @Override
        public void onPageFinished(WebView vista, String url) {
            if (url != null && url.startsWith("http")) aviso.setVisibility(View.GONE);
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedError(WebView vista, WebResourceRequest pedido, WebResourceError erro) {
            if (!pedido.isForMainFrame()) return;
            mostrarAviso(emCasa
                    ? "O computador de casa não respondeu.\n\nConfira se ele está ligado.\n\nAperte OK para tentar de novo."
                    : "Sem internet agora.\n\nAperte OK para tentar de novo.");
            aviso.setFocusable(true);
            aviso.requestFocus();
            aviso.setOnClickListener(v -> conectar());
        }
    }

    private final class Cromo extends WebChromeClient {
        @Override
        public void onShowCustomView(View vista, CustomViewCallback fechar) {
            if (telaCheia != null) {
                fechar.onCustomViewHidden();
                return;
            }
            telaCheia = vista;
            fecharTelaCheia = fechar;
            raiz.addView(vista, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            web.setVisibility(View.GONE);
            esconderBarras(true);
        }

        @Override
        public void onHideCustomView() {
            if (telaCheia == null) return;
            raiz.removeView(telaCheia);
            telaCheia = null;
            web.setVisibility(View.VISIBLE);
            esconderBarras(false);
            if (fecharTelaCheia != null) fecharTelaCheia.onCustomViewHidden();
            fecharTelaCheia = null;
        }
    }

    @SuppressWarnings("deprecation")
    private void esconderBarras(boolean esconder) {
        getWindow().getDecorView().setSystemUiVisibility(esconder
                ? View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                : View.SYSTEM_UI_FLAG_VISIBLE);
    }

    /**
     * Voltar: primeiro sai da tela cheia, depois pergunta ao site se há algo
     * aberto por cima (o trailer), e só então volta de página ou fecha o app.
     */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (telaCheia != null) {
            new Cromo().onHideCustomView();
            return;
        }
        web.evaluateJavascript("window.outorgaVoltar ? window.outorgaVoltar() : 'nada'", resposta -> {
            if ("\"fechou\"".equals(resposta)) return;
            if (web.canGoBack()) web.goBack();
            else finish();
        });
    }

    @Override
    public boolean onKeyDown(int tecla, KeyEvent evento) {
        // O botão de menu do controle da TV abre a configuração do aparelho.
        if (tecla == KeyEvent.KEYCODE_MENU || tecla == KeyEvent.KEYCODE_SETTINGS) {
            abrirConfiguracao();
            return true;
        }
        return super.onKeyDown(tecla, evento);
    }

    private void abrirConfiguracao() {
        startActivityForResult(new Intent(this, Configuracao.class), 1);
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        super.onActivityResult(pedido, resultado, dados);
        if (resultado == RESULT_OK) conectar();
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    /** O que o site pode pedir ao app. Só o site do nosso servidor é carregado aqui. */
    private final class PonteComOSite {
        @JavascriptInterface
        public String modo() {
            return emCasa ? "casa" : "internet";
        }

        @JavascriptInterface
        public void configurar() {
            principal.post(Principal.this::abrirConfiguracao);
        }
    }
}
