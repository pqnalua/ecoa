import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/lazy';
import { SupabaseService } from '../services/supabase.service';
import { OrcamentoService, OrcamentoMensal } from '../services/orcamento.service';
import { PlanoService } from '../services/plano.service';
import { Subscription } from 'rxjs';

type Aba = 'registrar' | 'planilha' | 'graficos' | 'eco_ia';
type Natureza = 'fixo' | 'variavel' | 'extra';
type TipoTransacao = 'despesa' | 'receita';

interface MovimentacaoItem {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  tipoTransacao: TipoTransacao;
  natureza: Natureza;
  humor: string | null;
}

interface MensagemIa {
  autor: 'usuario' | 'eco';
  texto: string;
  hora: string;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer?: ElementRef<HTMLDivElement>;

  aba: Aba = 'registrar';
  temAcessoIaControle = false;
  private subPlano: Subscription | null = null;

  readonly meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];

  readonly categoriasDespesa: string[] = [
    'Alimentação', 'Moradia', 'Transporte', 'Lazer',
    'Saúde', 'Educação', 'Compras', 'Outros',
  ];

  readonly categoriasReceita: string[] = [
    'Salário', 'Freelance', 'Investimentos', 'Presente',
    'Vendas', 'Outros',
  ];

  private categoriaIds = new Map<string, string>();

  readonly tipos: { id: Natureza; label: string; cor: string }[] = [
    { id: 'fixo', label: 'Fixo', cor: '#816eb3' },
    { id: 'variavel', label: 'Variável', cor: '#c9a44c' },
    { id: 'extra', label: 'Extra', cor: '#c15c5c' },
  ];

  readonly humores = [
    { id: 'alegria', label: 'Alegria', imagem: 'assets/alegria.png' },
    { id: 'tristeza', label: 'Tristeza', imagem: 'assets/tristeza.png' },
    { id: 'ansiedade', label: 'Ansiedade', imagem: 'assets/ansiedade.png' },
    { id: 'tedio', label: 'Tédio', imagem: 'assets/tedio.png' },
    { id: 'raiva', label: 'Raiva', imagem: 'assets/raiva.png' },
  ];

  mesRef = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  movimentacoes: MovimentacaoItem[] = [];

  carregando = false;
  salvando = false;
  erro: string | null = null;
  mensagemSucesso = false;

  movimentacaoParaExcluir: MovimentacaoItem | null = null;
  readonly botoesExcluir = [
    { text: 'Cancelar', role: 'cancel' },
    {
      text: 'Excluir',
      role: 'destructive',
      handler: () => {
        this.excluir();
      },
    },
  ];

  orcamento: OrcamentoMensal | null = null;
  novo = this.formVazio();
  private requisicao = 0;

  perguntaIa = '';
  processandoIa = false;
  digitandoIa = false;
  mostrarBotaoDescer = false;
  mensagensNaoLidas = 0;
  historicoIa: MensagemIa[] = [];

  constructor(
    private supabase: SupabaseService,
    private orcamentoService: OrcamentoService,
    private alertCtrl: AlertController,
    private planoService: PlanoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    this.subPlano = this.planoService.planoAtivo$.subscribe(() => {
      this.verificarAcessoIa();
    });
    await this.verificarAcessoIa();
  }

  ngOnDestroy() {
    this.subPlano?.unsubscribe();
  }

  async ionViewWillEnter() {
    await this.verificarAcessoIa();
    await this.carregarCategorias();
    await this.carregarMovimentacoes();
    await this.carregarOrcamento();
    if (this.historicoIa.length === 0) {
      this.iniciarHistoricoIa();
    }
  }

  async verificarAcessoIa() {
    await this.planoService.carregarPlanoAtivo();
    this.temAcessoIaControle = this.planoService.temAcessoIaControle();
    this.cdr.detectChanges();
  }

  irParaPlanos() {
    this.router.navigateByUrl('/planos');
  }

  iniciarHistoricoIa() {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    this.historicoIa = [
      {
        autor: 'eco',
        texto: `Olá! Sou o ECO. Analisei sua planilha de ${this.mesLabel}. Toque em uma pergunta rápida acima ou faça sua pergunta!`,
        hora,
      }
    ];
  }

  async carregarOrcamento() {
    const mes = this.mesRef.getMonth() + 1;
    const ano = this.mesRef.getFullYear();
    const orc = await this.orcamentoService.carregarOrcamentoMes(mes, ano);
    this.ngZone.run(() => {
      this.orcamento = orc;
      this.cdr.detectChanges();
    });
  }

  async definirOuEditarOrcamento() {
    const valorAtual = this.orcamento?.valor_planejado || '';
    const alert = await this.alertCtrl.create({
      header: 'Orçamento Planejado',
      subHeader: `Definir teto de gastos para ${this.mesLabel}`,
      message: 'Insira o valor máximo que você planeja gastar neste mês:',
      inputs: [
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Ex: 1500',
          value: Number(valorAtual) > 0 ? valorAtual : '',
          min: 1,
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Salvar',
          handler: async (dados) => {
            const valor = parseFloat(dados.valor);
            if (!isNaN(valor) && valor > 0) {
              const mes = this.mesRef.getMonth() + 1;
              const ano = this.mesRef.getFullYear();
              await this.orcamentoService.salvarOrcamento(mes, ano, valor);
              await this.carregarOrcamento();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  get categoriasAtuais(): string[] {
    return this.novo.tipoTransacao === 'receita'
      ? this.categoriasReceita
      : this.categoriasDespesa;
  }

  selecionarTipoTransacao(tipo: TipoTransacao) {
    this.novo.tipoTransacao = tipo;
    this.novo.categoria = tipo === 'receita' ? this.categoriasReceita[0] : this.categoriasDespesa[0];
  }

  private async carregarCategorias() {
    try {
      const { data } = await this.supabase.client
        .from('categoria')
        .select('id_categoria, nome, tipo');

      if (data && data.length > 0) {
        this.categoriaIds = new Map(
          data.map((c: any): [string, string] => [c.nome, c.id_categoria])
        );
      }
    } catch (e) {
      console.warn('Erro ao carregar categorias do banco:', e);
    }

    if (!this.categoriasAtuais.includes(this.novo.categoria)) {
      this.novo.categoria = this.categoriasAtuais[0];
    }
  }

  async carregarMovimentacoes() {
    const req = ++this.requisicao;
    this.carregando = true;
    this.erro = null;

    const inicio = `${this.chaveMes(this.mesRef)}-01`;
    const seguinte = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() + 1, 1);
    const fim = `${this.chaveMes(seguinte)}-01`;

    const { data, error } = await this.supabase.client
      .from('movimentacao')
      .select('id_movimentacao, descricao, valor, data_transacao, tipo, natureza, humor, categoria:id_categoria(nome)')
      .is('deletado_em', null)
      .gte('data_transacao', inicio)
      .lt('data_transacao', fim)
      .order('data_transacao', { ascending: false });

    if (req !== this.requisicao) {
      return;
    }

    if (error) {
      console.error('Erro ao carregar movimentações:', error);
      this.ngZone.run(() => {
        this.erro = 'Não foi possível carregar as movimentações.';
        this.carregando = false;
        this.cdr.detectChanges();
      });
      return;
    }

    const lista = ((data ?? []) as any[]).map((r) => ({
      id: r.id_movimentacao,
      descricao: r.descricao ?? '',
      valor: Number(r.valor),
      data: r.data_transacao,
      categoria: r.categoria?.nome ?? (r.tipo === 'receita' ? 'Receita' : 'Outros'),
      tipoTransacao: (r.tipo ?? 'despesa') as TipoTransacao,
      natureza: (r.natureza ?? 'variavel') as Natureza,
      humor: r.humor ?? null,
    }));

    this.ngZone.run(() => {
      this.movimentacoes = lista;
      this.carregando = false;
      this.cdr.detectChanges();
    });
  }

  get mesLabel(): string {
    return `${this.meses[this.mesRef.getMonth()]} de ${this.mesRef.getFullYear()}`;
  }

  mesAnterior() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() - 1, 1);
    this.carregarMovimentacoes();
    this.carregarOrcamento();
    this.iniciarHistoricoIa();
    this.ngZone.run(() => this.cdr.detectChanges());
  }

  proximoMes() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() + 1, 1);
    this.carregarMovimentacoes();
    this.carregarOrcamento();
    this.iniciarHistoricoIa();
    this.ngZone.run(() => this.cdr.detectChanges());
  }

  get movimentacoesDoMes(): MovimentacaoItem[] {
    const chave = this.chaveMes(this.mesRef);
    return this.movimentacoes
      .filter((m) => m.data.slice(0, 7) === chave)
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  get despesasDoMes(): MovimentacaoItem[] {
    return this.movimentacoesDoMes.filter((m) => m.tipoTransacao === 'despesa');
  }

  get receitasDoMes(): MovimentacaoItem[] {
    return this.movimentacoesDoMes.filter((m) => m.tipoTransacao === 'receita');
  }

  get totalDespesas(): number {
    return this.somar(this.despesasDoMes);
  }

  get totalReceitas(): number {
    return this.somar(this.receitasDoMes);
  }

  get saldoMes(): number {
    return this.totalReceitas - this.totalDespesas;
  }

  get saldoMesAbs(): number {
    return Math.abs(this.saldoMes);
  }

  totalNatureza(tipo: Natureza): number {
    return this.somar(this.despesasDoMes.filter((g) => g.natureza === tipo));
  }

  get formValido(): boolean {
    return (
      this.novo.descricao.trim().length > 0 &&
      Number(this.novo.valor) > 0 &&
      !!this.novo.data
    );
  }

  selecionarHumor(id: string) {
    this.novo.humor = this.novo.humor === id ? null : id;
  }

  async salvar() {
    if (!this.formValido || this.salvando) {
      return;
    }

    this.salvando = true;
    this.erro = null;

    const payload: any = {
      descricao: this.novo.descricao.trim(),
      valor: Number(this.novo.valor),
      data_transacao: this.novo.data,
      tipo: this.novo.tipoTransacao,
      natureza: this.novo.tipoTransacao === 'receita' ? (this.novo.natureza || 'fixo') : this.novo.tipo,
      humor: this.novo.tipoTransacao === 'despesa' ? this.novo.humor : null,
      id_categoria: this.categoriaIds.get(this.novo.categoria) ?? null,
      origem: 'manual',
    };

    const { error } = await this.supabase.client.from('movimentacao').insert(payload);

    this.salvando = false;

    if (error) {
      console.error('Erro ao salvar movimentação:', error);
      this.erro = 'Não foi possível salvar a movimentação. Tente novamente.';
      return;
    }

    const [ano, mes] = this.novo.data.split('-').map(Number);
    this.mesRef = new Date(ano, mes - 1, 1);

    this.novo = this.formVazio();
    this.mensagemSucesso = true;
    setTimeout(() => (this.mensagemSucesso = false), 2500);

    await this.carregarMovimentacoes();
    await this.carregarOrcamento();
  }

  pedirExclusao(item: MovimentacaoItem) {
    this.movimentacaoParaExcluir = item;
  }

  get mensagemExclusao(): string {
    const m = this.movimentacaoParaExcluir;
    if (!m) return '';
    const valor = m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `${m.descricao} — ${valor}`;
  }

  async excluir() {
    const item = this.movimentacaoParaExcluir;
    if (!item) return;

    const { error } = await this.supabase.client
      .from('movimentacao')
      .update({ deletado_em: new Date().toISOString() })
      .eq('id_movimentacao', item.id);

    if (error) {
      console.error('Erro ao excluir:', error);
      this.erro = 'Não foi possível excluir o item.';
      return;
    }

    this.movimentacoes = this.movimentacoes.filter((m) => m.id !== item.id);
    await this.carregarOrcamento();
  }

  exportarCsv() {
    const linhas = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Natureza', 'Humor', 'Valor (R$)'],
      ...this.movimentacoesDoMes.map((m) => [
        this.formatarData(m.data, true),
        m.tipoTransacao === 'receita' ? 'Receita' : 'Despesa',
        m.descricao,
        m.categoria,
        m.tipoTransacao === 'despesa' ? this.nomeTipo(m.natureza) : 'Entrada',
        m.humor ? this.nomeHumor(m.humor) : '',
        (m.tipoTransacao === 'receita' ? '+' : '-') + m.valor.toFixed(2).replace('.', ','),
      ]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentacoes-${this.chaveMes(this.mesRef)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  get fatiasDonut() {
    const soma = this.totalDespesas;
    if (soma <= 0) return [];
    let acumulado = 0;
    return this.tipos
      .map((t) => ({ ...t, valor: this.totalNatureza(t.id) }))
      .filter((t) => t.valor > 0)
      .map((t) => {
        const pct = (t.valor / soma) * 100;
        const fatia = { ...t, pct, offset: 25 - acumulado };
        acumulado += pct;
        return fatia;
      });
  }

  get porCategoria() {
    const mapa = new Map<string, number>();
    this.despesasDoMes.forEach((g) =>
      mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + g.valor)
    );
    return this.comPercentual(
      Array.from(mapa, ([nome, valor]) => ({ nome, valor }))
    );
  }

  get porHumor() {
    const mapa = new Map<string, number>();
    this.despesasDoMes
      .filter((g) => g.humor)
      .forEach((g) => mapa.set(g.humor!, (mapa.get(g.humor!) ?? 0) + g.valor));
    return this.comPercentual(
      Array.from(mapa, ([id, valor]) => ({
        id,
        nome: this.nomeHumor(id),
        imagem: this.imagemHumor(id),
        valor,
      }))
    );
  }

  get insightHumor(): string | null {
    const maior = this.porHumor[0];
    if (!maior) return null;
    return `Este mês você gastou mais quando estava com ${maior.nome.toLowerCase()}.`;
  }

  nomeTipo(id: Natureza): string {
    return this.tipos.find((t) => t.id === id)?.label ?? id;
  }

  corTipo(id: Natureza): string {
    return this.tipos.find((t) => t.id === id)?.cor ?? '#999';
  }

  nomeHumor(id: string): string {
    return this.humores.find((h) => h.id === id)?.label ?? id;
  }

  imagemHumor(id: string): string {
    const mapa: { [key: string]: string } = {
      alegria: 'assets/alegre.png',
      alegre: 'assets/alegre.png',
      ansiedade: 'assets/ansioso.png',
      ansioso: 'assets/ansioso.png',
      tedio: 'assets/entediado.png',
      entediado: 'assets/entediado.png',
      raiva: 'assets/raivoso.png',
      raivoso: 'assets/raivoso.png',
      tristeza: 'assets/triste.png',
      triste: 'assets/triste.png',
    };
    return mapa[id] || (this.humores.find((h) => h.id === id)?.imagem ?? '');
  }

  imagemHumorIa(id: string): string {
    return this.imagemHumor(id);
  }

  formatarData(iso: string, completa = false): string {
    const [ano, mes, dia] = iso.split('-');
    return completa ? `${dia}/${mes}/${ano}` : `${dia}/${mes}`;
  }

  private comPercentual<T extends { valor: number }>(lista: T[]) {
    const max = Math.max(...lista.map((i) => i.valor), 0);
    return lista
      .sort((a, b) => b.valor - a.valor)
      .map((i) => ({ ...i, pct: max ? (i.valor / max) * 100 : 0 }));
  }

  private somar(lista: MovimentacaoItem[]): number {
    return lista.reduce((s, g) => s + g.valor, 0);
  }

  private chaveMes(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private formVazio() {
    const hoje = new Date();
    return {
      descricao: '',
      valor: null as number | null,
      data: `${this.chaveMes(hoje)}-${String(hoje.getDate()).padStart(2, '0')}`,
      categoria: this.categoriasDespesa[0],
      tipoTransacao: 'despesa' as TipoTransacao,
      tipo: 'variavel' as Natureza,
      natureza: 'fixo' as Natureza,
      humor: null as string | null,
    };
  }

  onChatScroll(e: Event) {
    const el = e.target as HTMLElement;
    if (!el) return;
    const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.mostrarBotaoDescer = distanciaDoFim > 70;
    if (!this.mostrarBotaoDescer) {
      this.mensagensNaoLidas = 0;
    }
    this.cdr.detectChanges();
  }

  rolarChatParaBaixo(suave = true) {
    setTimeout(() => {
      if (this.chatContainer?.nativeElement) {
        const el = this.chatContainer.nativeElement;
        el.scrollTo({
          top: el.scrollHeight,
          behavior: suave ? 'smooth' : 'auto',
        });
      }
      this.mostrarBotaoDescer = false;
      this.mensagensNaoLidas = 0;
      this.cdr.detectChanges();
    }, 60);
  }

  async perguntarIa(pergunta: string) {
    if (this.processandoIa || !pergunta.trim()) return;
    this.processandoIa = true;

    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    this.historicoIa.push({ autor: 'usuario', texto: pergunta, hora });
    this.digitandoIa = true;
    this.cdr.detectChanges();
    this.rolarChatParaBaixo(true);

    const resposta = this.gerarRespostaIa(pergunta);
    await new Promise((resolve) => setTimeout(resolve, 950));

    this.digitandoIa = false;
    const horaResposta = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    this.historicoIa.push({ autor: 'eco', texto: resposta, hora: horaResposta });
    this.processandoIa = false;
    this.cdr.detectChanges();

    if (this.mostrarBotaoDescer) {
      this.mensagensNaoLidas++;
      this.cdr.detectChanges();
    } else {
      this.rolarChatParaBaixo(true);
    }
  }

  enviarPerguntaManual() {
    if (!this.perguntaIa.trim() || this.processandoIa) return;
    const txt = this.perguntaIa.trim();
    this.perguntaIa = '';
    this.perguntarIa(txt);
  }

  gerarAnaliseCompleta() {
    this.perguntarIa('Faça uma leitura completa da minha planilha e gráficos');
  }

  private gerarRespostaIa(pergunta: string): string {
    const p = pergunta.toLowerCase();
    const maiorCat = this.porCategoria[0];
    const maiorHumor = this.porHumor[0];

    if (
      p.includes('suicid') ||
      p.includes('me matar') ||
      p.includes('me machucar') ||
      p.includes('tirar minha vida') ||
      p.includes('morrer') ||
      p.includes('socorro') ||
      p.includes('preciso de ajuda') ||
      p.includes('ajuda psicolog') ||
      p.includes('crise de panico') ||
      p.includes('nao aguento mais') ||
      p.includes('não aguento mais') ||
      p.includes('desespero') ||
      p.includes('saude mental') ||
      p.includes('saúde mental') ||
      p.includes('apoio emocional') ||
      p.includes('cvv') ||
      p.includes('caps') ||
      p.includes('psicolog') ||
      p.includes('psiquiatr')
    ) {
      return `Desculpe, mas estou aqui apenas para analisar seus dados financeiros.

Se você ou alguém que você conhece está precisando de apoio emocional ou ajuda médica e psicológica, procure estes profissionais e canais gratuitos no Brasil:

• CVV (Centro de Valorização da Vida): Ligue 188 (ligação gratuita, 24 horas) ou acesse cvv.org.br
• SAMU (Ambulância / Emergência médica): Ligue 192
• Polícia Militar (Emergência): Ligue 190
• Corpo de Bombeiros: Ligue 193
• CAPS (Centro de Atenção Psicossocial): Procure a unidade de saúde municipal do seu bairro.

Você não está sozinho(a). Por favor, entre em contato com um desses serviços!`;
    }

    if (
      p === 'oi' ||
      p === 'ola' ||
      p === 'olá' ||
      p === 'opa' ||
      p.startsWith('oi ') ||
      p.startsWith('olá ') ||
      p.startsWith('ola ') ||
      p.includes('bom dia') ||
      p.includes('boa tarde') ||
      p.includes('boa noite') ||
      p.includes('tudo bem') ||
      p.includes('quem e voce') ||
      p.includes('quem é você')
    ) {
      return `Olá! Sou o ECO, sua inteligência de análise financeira. Analiso seus gastos, gráficos e hábitos de consumo em ${this.mesLabel}. O que gostaria de analisar hoje?`;
    }

    if (
      p.includes('planej') ||
      p.includes('organiz') ||
      p.includes('dica') ||
      p.includes('conselho') ||
      p.includes('meta')
    ) {
      return `Análise para planejamento financeiro em ${this.mesLabel}:
1. Regra 50/30/20: até 50% para despesas fixas, 30% para variáveis e 20% para reserva.
2. Teto de gastos: Toque no botão "Definir" no topo para registrar seu limite mensal.
3. Acompanhamento: Registre as saídas no dia a dia e consulte a aba Gráficos para monitorar as proporções.
4. Saldo preventivo: Separe a cota de economia logo no início do mês ao registrar suas receitas.`;
    }

    if (
      p.includes('economiz') ||
      p.includes('poupar') ||
      p.includes('cortar') ||
      p.includes('reduzir') ||
      p.includes('guardar dinheiro')
    ) {
      if (!maiorCat) {
        return 'Registre despesas neste mês para eu analisar e apontar onde economizar.';
      }
      const valorCat = maiorCat.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const economia15 = (maiorCat.valor * 0.15).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `Na análise deste mês, o maior volume está em ${maiorCat.nome} (${valorCat}). Uma redução de 15% nessa categoria representa uma economia de ${economia15} em ${this.mesLabel}. Foco em conter compras impulsivas nessa área!`;
    }

    if (
      p.includes('emoc') ||
      p.includes('humor') ||
      p.includes('sentimento') ||
      p.includes('impulso')
    ) {
      if (!maiorHumor) {
        return 'Você ainda não registrou emoções nas despesas deste mês. Ao cadastrar gastos na aba "Registrar", marque seu humor para eu analisar o impacto emocional nas suas contas!';
      }
      const valorHumor = maiorHumor.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `Análise comportamental: você gastou mais quando estava com ${maiorHumor.nome} (${valorHumor}). Dica de controle: ao vivenciar ${maiorHumor.nome.toLowerCase()}, aguarde 24 horas antes de efetuar compras que não sejam estritamente necessárias.`;
    }

    if (
      p.includes('orcamento') ||
      p.includes('orçamento') ||
      p.includes('teto') ||
      p.includes('limite')
    ) {
      if (!this.orcamento || this.orcamento.valor_planejado === 0) {
        return 'Você ainda não definiu um teto de gastos para este mês. Toque no botão "Definir" no topo para analisar seu progresso!';
      }
      const planejado = this.orcamento.valor_planejado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const gasto = this.orcamento.valor_gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const status = this.orcamento.statusAlerta === 'estourado'
        ? '🚨 Limite estourado! Evite despesas adicionais.'
        : (this.orcamento.statusAlerta === 'atencao'
          ? '⚠️ Atenção: você já consumiu mais de 80% do teto planejado.'
          : '✅ Situação controlada: seus gastos permanecem dentro do limite definido.');
      return `Teto: ${planejado} | Gasto: ${gasto} (${this.orcamento.percentualConsumido}% consumido). ${status}`;
    }

    if (
      p.includes('invest') ||
      p.includes('reserva') ||
      p.includes('divid') ||
      p.includes('dívid') ||
      p.includes('juro') ||
      p.includes('cartao') ||
      p.includes('cartão')
    ) {
      return `Análise de estrutura patrimonial:
• Priorize liquidar dívidas com juros elevados antes de iniciar aportes em investimentos.
• Forme uma Reserva de Emergência (3 a 6 meses do custo mensal) com alta liquidez e baixo risco.
• Mantenha os lançamentos atualizados no aplicativo para identificar com precisão a sobra líquida mensal.`;
    }

    if (
      p.includes('leitura') ||
      p.includes('grafic') ||
      p.includes('gráfico') ||
      p.includes('planilha') ||
      p.includes('extrato') ||
      p.includes('resumo') ||
      p.includes('balanco') ||
      p.includes('balanço') ||
      p.includes('saldo') ||
      p.includes('situac') ||
      p.includes('situaç') ||
      p.includes('conta') ||
      p.includes('gasto') ||
      p.includes('despesa') ||
      p.includes('receita')
    ) {
      const rec = this.totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const desp = this.totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const saldo = this.saldoMesAbs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const cat = maiorCat ? `${maiorCat.nome} (${maiorCat.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` : 'Nenhuma';
      const humor = maiorHumor ? `${maiorHumor.nome}` : 'Não informado';

      return `Resumo direto de ${this.mesLabel}:\n• Entradas: +${rec}\n• Saídas: -${desp}\n• Saldo Líquido: ${this.saldoMes >= 0 ? '+' : '-'}${saldo} (${this.saldoMes >= 0 ? 'No azul' : 'No vermelho'})\n• Maior Categoria: ${cat}\n• Emoção Dominante: ${humor}\n\nFoco para fechar bem: priorize custos fixos e evite compras extras!`;
    }

    return 'Desculpe, mas estou aqui apenas para analisar financeiramente seus dados. Posso analisar seus gráficos, sua planilha de gastos ou identificar como suas emoções estão impactando seu bolso neste mês!';
  }
}