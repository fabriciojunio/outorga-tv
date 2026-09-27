package br.com.outorga.casa;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * Configuração do aparelho. Quase ninguém vai precisar abrir: o app acha o
 * PC de casa sozinho. Serve para quando o PC mudou de lugar na rede, ou para
 * forçar o uso pela internet. Abre pelo botão de menu do controle, ou pelo
 * link "Configurar aparelho" no rodapé do app.
 */
public class Configuracao extends Activity {

    private final Handler principal = new Handler(Looper.getMainLooper());
    private TextView situacao;
    private EditText endereco;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);

        LinearLayout coluna = new LinearLayout(this);
        coluna.setOrientation(LinearLayout.VERTICAL);
        coluna.setPadding(56, 48, 56, 48);
        coluna.setBackgroundColor(Color.parseColor("#0D0F14"));

        coluna.addView(texto("Configurar aparelho", 28, "#E9ECF2"));
        situacao = texto("", 18, "#9AA4B5");
        coluna.addView(situacao);

        coluna.addView(texto("Endereço do computador de casa", 16, "#9AA4B5"));
        endereco = new EditText(this);
        endereco.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        endereco.setTextColor(Color.parseColor("#E9ECF2"));
        endereco.setTextSize(20);
        endereco.setHint("http://192.168.0.10:3000");
        endereco.setHintTextColor(Color.parseColor("#6B7484"));
        String guardado = Servidor.casaGuardada(this);
        if (guardado != null) endereco.setText(guardado);
        coluna.addView(endereco);

        coluna.addView(botao("Procurar o computador de casa agora", this::procurar));
        coluna.addView(botao("Salvar este endereço", this::salvar));
        coluna.addView(botao(Servidor.soInternet(this) ? "Voltar a usar o computador de casa" : "Usar sempre pela internet", this::alternarInternet));
        coluna.addView(botao("Voltar", this::finish));

        ScrollView rolagem = new ScrollView(this);
        rolagem.setBackgroundColor(Color.parseColor("#0D0F14"));
        rolagem.addView(coluna);
        setContentView(rolagem);

        atualizarSituacao();
    }

    private TextView texto(String conteudo, int tamanho, String cor) {
        TextView t = new TextView(this);
        t.setText(conteudo);
        t.setTextSize(tamanho);
        t.setTextColor(Color.parseColor(cor));
        t.setPadding(0, 16, 0, 16);
        return t;
    }

    private Button botao(String rotulo, Runnable acao) {
        Button b = new Button(this);
        b.setText(rotulo);
        b.setTextSize(20);
        b.setAllCaps(false);
        b.setOnClickListener(v -> acao.run());
        LinearLayout.LayoutParams medidas = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        medidas.topMargin = 18;
        b.setLayoutParams(medidas);
        return b;
    }

    private void atualizarSituacao() {
        String casa = Servidor.casaGuardada(this);
        situacao.setText(Servidor.soInternet(this)
                ? "Agora: sempre pela internet."
                : casa != null ? "Computador de casa: " + casa : "Computador de casa ainda não encontrado.");
    }

    private void procurar() {
        situacao.setText("Procurando na rede... isso leva alguns segundos.");
        new Thread(() -> {
            String achado = Servidor.procurarNaRede();
            principal.post(() -> {
                if (achado != null) {
                    Servidor.guardarCasa(this, achado);
                    endereco.setText(achado);
                    situacao.setText("Achei: " + achado);
                } else {
                    situacao.setText("Não achei. Confira se o computador está ligado, com o Outorga TV aberto, e na mesma rede Wi-Fi.");
                }
            });
        }).start();
    }

    private void salvar() {
        String digitado = endereco.getText().toString().trim().replaceAll("/+$", "");
        if (!digitado.startsWith("http")) digitado = "http://" + digitado;
        final String alvo = digitado;
        situacao.setText("Testando " + alvo + "...");
        new Thread(() -> {
            boolean ok = Servidor.responde(alvo, 2500);
            principal.post(() -> {
                if (ok) {
                    Servidor.guardarCasa(this, alvo);
                    Servidor.definirSoInternet(this, false);
                    setResult(RESULT_OK);
                    finish();
                } else {
                    situacao.setText("Esse endereço não respondeu como Outorga TV.");
                }
            });
        }).start();
    }

    private void alternarInternet() {
        Servidor.definirSoInternet(this, !Servidor.soInternet(this));
        setResult(RESULT_OK);
        finish();
    }
}
