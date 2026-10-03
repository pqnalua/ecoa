import { Component } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';



type Aba = 'registrar' | 'planilha' | 'graficos';
type Tipo = 'fixo' | 'variavel' | 'extra';

interface Gasto {
  id: string;
  descricao: string;
  valor: number;
  data: string; // AAAA-MM-DD
  categoria: string;
  tipo: Tipo;
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

  // Lista inicial; é substituída pelas categorias do banco ao abrir a tela
  categorias: string[] = [
    'Alimentação', 'Moradia', 'Transporte', 'Lazer',
    'Saúde', 'Educação', 'Compras', 'Outros',
  ];
  private categoriaIds = new Map<string, string>();

  readonly tipos: { id: Tipo; label: string; cor: string }[] = [
    { id: 'fixo', label: 'Fixo', cor: '#816eb3' },
    { id: 'variavel', label: 'Variável', cor: '#c9a44c' },
    { id: 'extra', label: 'Extra', cor: '#c15c5c' },
  ];

  // mesmas imagens da home
  readonly humores = [
    { id: 'alegria', label: 'Alegria', imagem: 'assets/alegria.png' },
    { id: 'tristeza', label: 'Tristeza', imagem: 'assets/tristeza.png' },
    { id: 'ansiedade', label: 'Ansiedade', imagem: 'assets/ansiedade.png' },
    { id: 'tedio', label: 'Tédio', imagem: 'assets/tedio.png' },
    { id: 'raiva', label: 'Raiva', imagem: 'assets/raiva.png' },
  ];

  mesRef = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  gastos: Gasto[] = [];

  carregando = false;
  salvando = false;
  erro: string | null = null;
  mensagemSucesso = false;

  // Exclusão (controla o <ion-alert> do template)
  gastoParaExcluir: Gasto | null = null;
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

  // evita que uma resposta antiga sobrescreva a de um mês mais novo
  private requisicao = 0;

  constructor(private supabase: SupabaseService) {}

  /* ---------- Ciclo de vida ---------- */

  // Roda toda vez que a aba é aberta (inclusive na primeira)
  async ionViewWillEnter() {
    await this.carregarCategorias();
    await this.carregarGastos();
  }

  /* ---------- Banco (Supabase) ---------- */

  private async carregarCategorias() {
    const { data, error } = await this.supabase.client
      .from('categoria')
      .select('id_categoria, nome')
      .eq('tipo', 'despesa');

    if (error || !data?.length) {
      console.error('Categorias não carregadas', error);
      return;
    }

    const lista = (data as any[]).sort((a, b) =>
      a.nome === 'Outros' ? 1 : b.nome === 'Outros' ? -1 : a.nome.localeCompare(b.nome, 'pt-BR')
    );

    this.categoriaIds = new Map(
      lista.map((c): [string, string] => [c.nome, c.id_categoria])
    );
    this.categorias = lista.map((c) => c.nome);

    if (!this.categorias.includes(this.novo.categoria)) {
      this.novo.categoria = this.categorias[0];
    }
  }

  async carregarGastos() {
    const req = ++this.requisicao;
    this.carregando = true;
    this.erro = null;

    const inicio = `${this.chaveMes(this.mesRef)}-01`;
    const seguinte = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() + 1, 1);
    const fim = `${this.chaveMes(seguinte)}-01`;

    const { data, error } = await this.supabase.client
      .from('movimentacao')
      .select('id_movimentacao, descricao, valor, data_transacao, natureza, humor, categoria:id_categoria(nome)')
      .eq('tipo', 'despesa')
      .is('deletado_em', null)
      .gte('data_transacao', inicio)
      .lt('data_transacao', fim)
      .order('data_transacao', { ascending: false });

    if (req !== this.requisicao) {
      return; // chegou uma resposta mais nova, descarta esta
    }
    this.carregando = false;

    if (error) {
      console.error('Erro ao carregar gastos', error);
      this.erro = 'Não foi possível carregar seus gastos.';
      return;
    }

    this.gastos = ((data ?? []) as any[]).map((r) => ({
      id: r.id_movimentacao,
      descricao: r.descricao ?? '',
      valor: Number(r.valor),
      data: r.data_transacao,
      categoria: r.categoria?.nome ?? 'Outros',
      tipo: (r.natureza ?? 'variavel') as Tipo,
      humor: r.humor ?? null,
    }));
  }

  /* ---------- Mês ---------- */

  get mesLabel(): string {
    return `${this.meses[this.mesRef.getMonth()]} de ${this.mesRef.getFullYear()}`;
  }

  mesAnterior() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() - 1, 1);
    this.carregarGastos();
  }

  proximoMes() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() + 1, 1);
    this.carregarGastos();
  }

  get gastosDoMes(): Gasto[] {
    const chave = this.chaveMes(this.mesRef);
    return this.gastos
      .filter((g) => g.data.slice(0, 7) === chave)
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  get total(): number {
    return this.somar(this.gastosDoMes);
  }

  totalTipo(tipo: Tipo): number {
    return this.somar(this.gastosDoMes.filter((g) => g.tipo === tipo));
  }

  /* ---------- Registrar ---------- */

  get formValido(): boolean {
    return (
      this.novo.descricao.trim().length > 0 &&
      Number(this.novo.valor) > 0 &&
      !!this.novo.data
    );
  }

  selecionarHumor(id: string) {
    // clicar de novo desmarca
    this.novo.humor = this.novo.humor === id ? null : id;
  }

  async salvar() {
    if (!this.formValido || this.salvando) {
      return;
    }

    this.salvando = true;
    this.erro = null;

    // id_usuario é preenchido pelo banco (default auth.uid())
    const { error } = await this.supabase.client.from('movimentacao').insert({
      descricao: this.novo.descricao.trim(),
      valor: Number(this.novo.valor),
      data_transacao: this.novo.data,
      tipo: 'despesa',
      natureza: this.novo.tipo,
      humor: this.novo.humor,
      id_categoria: this.categoriaIds.get(this.novo.categoria) ?? null,
      origem: 'manual',
    });

    this.salvando = false;

    if (error) {
      console.error('Erro ao salvar gasto', error);
      this.erro = 'Não foi possível salvar a compra. Tente novamente.';
      return;
    }

    // mostra o mês da compra que acabou de ser registrada
    const [ano, mes] = this.novo.data.split('-').map(Number);
    this.mesRef = new Date(ano, mes - 1, 1);

    this.novo = this.formVazio();
    this.mensagemSucesso = true;
    setTimeout(() => (this.mensagemSucesso = false), 2500);

    await this.carregarGastos();
  }

  /* ---------- Planilha ---------- */

  pedirExclusao(gasto: Gasto) {
    this.gastoParaExcluir = gasto;
  }

  get mensagemExclusao(): string {
    const g = this.gastoParaExcluir;
    if (!g) {
      return '';
    }
    const valor = g.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `${g.descricao} — ${valor}`;
  }

  async excluir() {
    const gasto = this.gastoParaExcluir;
    if (!gasto) {
      return;
    }

    // exclusão lógica: mantém o registro (e o id_externo do Pluggy) no banco
    const { error } = await this.supabase.client
      .from('movimentacao')
      .update({ deletado_em: new Date().toISOString() })
      .eq('id_movimentacao', gasto.id);

    if (error) {
      console.error('Erro ao excluir gasto', error);
      this.erro = 'Não foi possível excluir a compra.';
      return;
    }

    this.gastos = this.gastos.filter((g) => g.id !== gasto.id);
  }

  exportarCsv() {
    const linhas = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Humor', 'Valor'],
      ...this.gastosDoMes.map((g) => [
        this.formatarData(g.data, true),
        g.descricao,
        g.categoria,
        this.nomeTipo(g.tipo),
        g.humor ? this.nomeHumor(g.humor) : '',
        g.valor.toFixed(2).replace('.', ','),
      ]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos-${this.chaveMes(this.mesRef)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- Gráficos ---------- */

  // Rosca por tipo de gasto (círculo de circunferência 100 pra facilitar a conta)
  get fatiasDonut() {
    const soma = this.total;
    let acumulado = 0;
    return this.tipos
      .map((t) => ({ ...t, valor: this.totalTipo(t.id) }))
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
    this.gastosDoMes.forEach((g) =>
      mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + g.valor)
    );
    return this.comPercentual(
      Array.from(mapa, ([nome, valor]) => ({ nome, valor }))
    );
  }

  get porHumor() {
    const mapa = new Map<string, number>();
    this.gastosDoMes
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
    if (!maior) {
      return null;
    }
    return `Este mês você gastou mais quando estava com ${maior.nome.toLowerCase()}.`;
  }

  /* ---------- Auxiliares ---------- */

  nomeTipo(id: Tipo): string {
    return this.tipos.find((t) => t.id === id)?.label ?? id;
  }

  corTipo(id: Tipo): string {
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

  private somar(lista: Gasto[]): number {
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
      categoria: this.categorias?.[0] ?? 'Alimentação',
      tipo: 'variavel' as Tipo,
      humor: null as string | null,
    };
  }
}