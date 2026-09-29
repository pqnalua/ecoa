import { Component } from '@angular/core';

type Aba = 'registrar' | 'planilha' | 'graficos';
type Tipo = 'fixo' | 'variavel' | 'extra';

interface Gasto {
  id: number;
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

  readonly categorias = [
    'Alimentação', 'Moradia', 'Transporte', 'Lazer',
    'Saúde', 'Educação', 'Compras', 'Outros',
  ];

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
  mensagemSucesso = false;
  private proximoId = 9;

  novo = this.formVazio();

  // TODO: trocar por dados reais (ex.: Supabase) — estes são só de exemplo
  gastos: Gasto[] = [
    { id: 1, descricao: 'Aluguel', valor: 700, data: this.iso(5), categoria: 'Moradia', tipo: 'fixo', humor: null },
    { id: 2, descricao: 'Internet', valor: 100, data: this.iso(8), categoria: 'Moradia', tipo: 'fixo', humor: null },
    { id: 3, descricao: 'Mercado', valor: 180, data: this.iso(9), categoria: 'Alimentação', tipo: 'variavel', humor: 'alegria' },
    { id: 4, descricao: 'Uber', valor: 45, data: this.iso(12), categoria: 'Transporte', tipo: 'variavel', humor: 'ansiedade' },
    { id: 5, descricao: 'iFood', valor: 68, data: this.iso(15), categoria: 'Alimentação', tipo: 'variavel', humor: 'tedio' },
    { id: 6, descricao: 'Tênis novo', valor: 120, data: this.iso(18), categoria: 'Compras', tipo: 'extra', humor: 'tristeza' },
    { id: 7, descricao: 'Cinema', valor: 57, data: this.iso(22), categoria: 'Lazer', tipo: 'variavel', humor: 'alegria' },
    { id: 8, descricao: 'Fone de ouvido', valor: 90, data: this.iso(25), categoria: 'Compras', tipo: 'extra', humor: 'raiva' },
  ];

  /* ---------- Mês ---------- */

  get mesLabel(): string {
    return `${this.meses[this.mesRef.getMonth()]} de ${this.mesRef.getFullYear()}`;
  }

  mesAnterior() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() - 1, 1);
  }

  proximoMes() {
    this.mesRef = new Date(this.mesRef.getFullYear(), this.mesRef.getMonth() + 1, 1);
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

  salvar() {
    if (!this.formValido) {
      return;
    }

    // TODO: salvar no banco (Supabase)
    this.gastos = [
      ...this.gastos,
      {
        id: this.proximoId++,
        descricao: this.novo.descricao.trim(),
        valor: Number(this.novo.valor),
        data: this.novo.data,
        categoria: this.novo.categoria,
        tipo: this.novo.tipo,
        humor: this.novo.humor,
      },
    ];

    // mostra o mês da compra que acabou de ser registrada
    const [ano, mes] = this.novo.data.split('-').map(Number);
    this.mesRef = new Date(ano, mes - 1, 1);

    this.novo = this.formVazio();
    this.mensagemSucesso = true;
    setTimeout(() => (this.mensagemSucesso = false), 2500);
  }

  /* ---------- Planilha ---------- */

  excluir(id: number) {
    // TODO: excluir no banco (Supabase)
    this.gastos = this.gastos.filter((g) => g.id !== id);
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

  private iso(dia: number): string {
    const hoje = new Date();
    return `${this.chaveMes(hoje)}-${String(dia).padStart(2, '0')}`;
  }

  private formVazio() {
    const hoje = new Date();
    return {
      descricao: '',
      valor: null as number | null,
      data: `${this.chaveMes(hoje)}-${String(hoje.getDate()).padStart(2, '0')}`,
      categoria: 'Alimentação',
      tipo: 'variavel' as Tipo,
      humor: null as string | null,
    };
  }
}