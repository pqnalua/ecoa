import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ModalController } from '@ionic/angular/lazy';
import { SpeechService } from '../../services/speech.service';
import { IaExtratorService, DadosTransacaoVoz } from '../../services/ia-extrator.service';
import { SupabaseService } from '../../services/supabase.service';

type EstadoVoz = 'escutando' | 'processando' | 'revisao' | 'erro';

@Component({
  selector: 'app-comando-voz-modal',
  templateUrl: './comando-voz-modal.component.html',
  styleUrls: ['./comando-voz-modal.component.scss'],
  standalone: false,
})
export class ComandoVozModalComponent implements OnInit, OnDestroy {
  estado: EstadoVoz = 'escutando';

  transcricao = '';
  textoInterim = '';
  mensagemErro = '';
  salvando = false;

  dados: DadosTransacaoVoz = {
    descricao: '',
    valor: 0,
    tipo: 'despesa',
    categoria: 'Alimentação',
    humor: null,
    natureza: 'variavel',
  };

  categoriasDisponiveis: string[] = [];
  private categoriaIds = new Map<string, string>();

  readonly humores = [
    { id: 'alegria', label: 'Alegria', imagem: 'assets/alegria.png' },
    { id: 'tristeza', label: 'Tristeza', imagem: 'assets/tristeza.png' },
    { id: 'ansiedade', label: 'Ansiedade', imagem: 'assets/ansiedade.png' },
    { id: 'tedio', label: 'Tédio', imagem: 'assets/tedio.png' },
    { id: 'raiva', label: 'Raiva', imagem: 'assets/raiva.png' },
  ];

  constructor(
    private modalCtrl: ModalController,
    private speechService: SpeechService,
    private iaExtrator: IaExtratorService,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    this.categoriasDisponiveis = this.iaExtrator.categoriasPermitidas;
  }

  async ngOnInit() {
    await this.carregarCategorias();
    this.iniciarGravacao();
  }

  ngOnDestroy() {
    this.speechService.stopListening();
  }

  private async carregarCategorias() {
    try {
      const { data } = await this.supabase.client
        .from('categoria')
        .select('id_categoria, nome');

      if (data && data.length > 0) {
        this.categoriaIds = new Map(
          data.map((c: any): [string, string] => [c.nome.toLowerCase(), c.id_categoria])
        );
      }
    } catch (e) {
      console.warn('Erro ao carregar categorias:', e);
    }
  }

  iniciarGravacao() {
    this.estado = 'escutando';
    this.transcricao = '';
    this.textoInterim = '';
    this.mensagemErro = '';
    this.cdr.detectChanges();

    if (!this.speechService.isSupported()) {
      this.estado = 'erro';
      this.mensagemErro =
        'Seu navegador não possui suporte ao reconhecimento de voz da Web Speech API. Recomendamos usar o Google Chrome ou Edge.';
      this.cdr.detectChanges();
      return;
    }

    const iniciado = this.speechService.startListening({
      onInterim: (texto) => {
        this.textoInterim = texto;
        this.cdr.detectChanges();
      },
      onFinal: (texto) => {
        this.transcricao = texto;
        this.textoInterim = '';
        this.cdr.detectChanges();
        this.processarComIa(texto);
      },
      onError: (err) => {
        console.warn('Erro de reconhecimento de voz:', err);
        if (err.error === 'not-allowed') {
          this.mensagemErro =
            'Permissão do microfone negada. Autorize o microfone no navegador para gravar por voz.';
          this.estado = 'erro';
        } else if (err.error === 'no-speech') {
          // Apenas não ouviu nada, permanece ouvindo
        } else {
          this.mensagemErro = 'Não foi possível capturar sua voz. Tente falar novamente.';
          this.estado = 'erro';
        }
        this.cdr.detectChanges();
      },
      onEnd: () => {
        if (this.estado === 'escutando' && this.transcricao.trim()) {
          this.processarComIa(this.transcricao);
        }
      },
    });

    if (!iniciado) {
      this.estado = 'erro';
      this.mensagemErro = 'Não foi possível inicializar o microfone.';
      this.cdr.detectChanges();
    }
  }

  pararGravacaoManual() {
    this.speechService.stopListening();
    const textoCompleto = (this.transcricao + ' ' + this.textoInterim).trim();
    if (textoCompleto) {
      this.transcricao = textoCompleto;
      this.processarComIa(textoCompleto);
    } else {
      this.estado = 'erro';
      this.mensagemErro = 'Nenhum som foi identificado. Clique no microfone para tentar novamente.';
      this.cdr.detectChanges();
    }
  }

  async processarComIa(frase: string) {
    if (!frase.trim()) return;

    this.estado = 'processando';
    this.cdr.detectChanges();

    try {
      const resultado = await this.iaExtrator.interpretarFrase(frase);
      this.dados = resultado;
      this.estado = 'revisao';
    } catch (e) {
      console.error('Erro ao interpretar frase:', e);
      this.estado = 'erro';
      this.mensagemErro = 'Houve um erro ao processar os dados com a IA. Tente novamente.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  selecionarHumor(id: string) {
    this.dados.humor = this.dados.humor === id ? null : (id as any);
  }

  selecionarTipo(tipo: 'despesa' | 'receita') {
    this.dados.tipo = tipo;
    if (tipo === 'receita') {
      this.dados.humor = null;
    }
  }

  async confirmarRegistro() {
    if (this.salvando) return;
    if (!this.dados.descricao.trim() || Number(this.dados.valor) <= 0) {
      alert('Preencha um nome e um valor maior que zero.');
      return;
    }

    this.salvando = true;

    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) {
        alert('Sessão expirada. Faça login novamente.');
        this.fechar();
        return;
      }

      const idCat =
        this.categoriaIds.get(this.dados.categoria.toLowerCase()) || null;

      const payload = {
        id_usuario: user.id,
        descricao: this.dados.descricao.trim(),
        valor: Number(this.dados.valor),
        tipo: this.dados.tipo,
        natureza: this.dados.natureza || 'variavel',
        humor: this.dados.tipo === 'despesa' ? this.dados.humor : null,
        id_categoria: idCat,
        origem: 'voz',
        texto_original: this.transcricao,
        data_transacao: new Date().toISOString().split('T')[0],
        status: 'concluida',
      };

      const { error } = await this.supabase.client
        .from('movimentacao')
        .insert(payload);

      if (error) {
        console.error('Erro ao salvar no banco:', error);
        alert('Erro ao salvar movimentação no banco: ' + error.message);
      } else {
        this.modalCtrl.dismiss({ registrado: true, payload });
      }
    } catch (e: any) {
      console.error('Erro inesperado:', e);
      alert('Erro inesperado ao salvar movimentação.');
    } finally {
      this.salvando = false;
      this.cdr.detectChanges();
    }
  }

  fechar() {
    this.speechService.stopListening();
    this.modalCtrl.dismiss();
  }
}
