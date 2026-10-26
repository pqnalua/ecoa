import { Component } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

type Aba = 'registrar' | 'planilha' | 'graficos';
type Natureza = 'fixo' | 'variavel' | 'extra';
type TipoTransacao = 'despesa' | 'receita';

interface MovimentacaoItem {
  id: string;
  descricao: string;
  valor: number;
  data: string; // AAAA-MM-DD
  categoria: string;
  tipoTransacao: TipoTransacao;
  natureza: Natureza;
  humor: string | null;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  aba: Aba = 'registrar';

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

  novo = this.formVazio();
  private requisicao = 0;

  constructor(private supabase: SupabaseService) {}

  async ionViewWillEnter() {
    await this.carregarCategorias();
    await this.carregarMovimentacoes();
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
    this.carregando = false;

    if (error) {
      console.error('Erro ao carregar movimentações:', error);
      this.erro = 'Não foi possível carregar as movimentações.';
      return;
    }

    this.movimentacoes = ((data ?? []) as any[]).map((r) => ({
      id: r.id_movimentacao,
      descricao: r.descricao ?? '',
      valor: Number(r.valor),
      data: r.data_transacao,
      categoria: r.categoria?.nome ?? (r.tipo === 'receita' ? 'Receita' : 'Outros'),
      tipoTransacao: (r.tipo ?? 'despesa') as TipoTransacao,
      natureza: (r.natureza ?? 'variavel') as Natureza,
      humor: r.humor ?? null,
    }));
  }

  get mesLabel(): string {
    return `${this.meses[this.mesRef.getMonth()]} de ${this.mesRef.getFullYear()}`;
  }

  mesAnterior() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() - 1, 1);
    this.carregarMovimentacoes();
  }

  proximoMes() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() + 1, 1);
    this.carregarMovimentacoes();
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
        imagem: this.humores.find((h) => h.id === id)?.imagem ?? '',
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
    return this.humores.find((h) => h.id === id)?.imagem ?? '';
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
}
