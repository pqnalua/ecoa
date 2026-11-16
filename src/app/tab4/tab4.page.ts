import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/lazy';
import { SupabaseService } from '../services/supabase.service';
import { NotificacaoService } from '../services/notificacao.service';
import { PlanoService } from '../services/plano.service';
import { Subscription } from 'rxjs';

export type TipoAporte = 'deposito' | 'retirada' | 'ajuste';

export interface Aporte {
  id_aporte?: string;
  id_meta: string;
  valor: number;
  tipo: TipoAporte;
  criado_em: string;
}

export interface Meta {
  id_meta?: string;
  id_usuario?: string;
  nome: string;
  icone?: string;
  valor_alvo?: number;
  valor_atual?: number;
  progresso?: number;
  data_fim?: string;
  concluida?: boolean;
  favorita?: boolean;
  status?: string;
  pendente_sync?: boolean;
}

export interface ResumoMetas {
  totalGuardado: number;
  ativas: number;
  atrasadas: number;
  concluidas: number;
  mensagem: string;
}

export type StatusMeta = 'ok' | 'warn' | 'late';

export interface InsightGastos {
  total: number;
  texto: string;
}

const HUMORES_EMOCIONAIS = ['ansiedade', 'tedio', 'raiva', 'tristeza'];
const NOMES_HUMOR: Record<string, string> = {
  ansiedade: 'ansiedade',
  tedio: 'tédio',
  raiva: 'raiva',
  tristeza: 'tristeza',
};

interface Confete {
  left: number;
  delay: number;
  dur: number;
  cor: string;
}

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit, OnDestroy {
  readonly icones = ['🎯', '✈️', '📱', '🏠', '🚗', '🎓', '🛟', '🎁', '💻', '🎮'];

  novaMeta = {
    nome: '',
    valor: null as number | null,
    dataFim: '',
    icone: '🎯',
  };

  formAberto = false;
  carregando = false;
  temAcessoMetas = true;

  metasFavoritas: Meta[] = [];
  metasOutras: Meta[] = [];
  metasConcluidas: Meta[] = [];
  resumo: ResumoMetas = {
    totalGuardado: 0,
    ativas: 0,
    atrasadas: 0,
    concluidas: 0,
    mensagem: '',
  };

  insightGastos: InsightGastos | null = null;
  private gastosEmocionais: { total: number; humor: string | null; valorHumor: number } | null = null;

  historicoMetaId: string | null = null;
  historico: Aporte[] = [];
  carregandoHistorico = false;

  confetes: Confete[] = [];
  private confeteTimer: any;

  private _metas: Meta[] = [];
  private primeiraCarga = true;
  private sincronizando = new Set<string>();
  private subPlano: Subscription | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private notificacaoService: NotificacaoService,
    private planoService: PlanoService,
    private cdr: ChangeDetectorRef
  ) {}

  get metas(): Meta[] {
    return this._metas;
  }

  set metas(valor: Meta[]) {
    this._metas = valor || [];
    this.recalcular();
  }

  async ngOnInit() {
    this.subPlano = this.planoService.planoAtivo$.subscribe(() => {
      this.verificarAcesso();
    });
    await this.verificarAcesso();
  }

  async ionViewWillEnter() {
    await this.verificarAcesso();
  }

  ngOnDestroy() {
    clearTimeout(this.confeteTimer);
    this.subPlano?.unsubscribe();
  }

  async verificarAcesso() {
    await this.planoService.carregarPlanoAtivo();
    this.temAcessoMetas = this.planoService.temAcessoMetas();
    this.cdr.detectChanges();
    if (this.temAcessoMetas) {
      await this.carregarMetas();
    }
  }

  irParaPlanos() {
    this.router.navigateByUrl('/planos');
  }

  trackMeta(_: number, meta: Meta) {
    return meta.id_meta;
  }

  private ordenarPorData(a: Meta, b: Meta): number {
    if (a.data_fim && b.data_fim) {
      return new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime();
    }
    if (a.data_fim) return -1;
    if (b.data_fim) return 1;
    return 0;
  }

  private recalcular() {
    const lista = this._metas;
    this.metasFavoritas = lista
      .filter((m) => !m.concluida && m.favorita)
      .sort(this.ordenarPorData);
    this.metasOutras = lista
      .filter((m) => !m.concluida && !m.favorita)
      .sort(this.ordenarPorData);
    this.metasConcluidas = lista.filter((m) => m.concluida);

    const ativas = lista.filter((m) => !m.concluida);
    const atrasadas = ativas.filter((m) => (this.diasAteData(m.data_fim) ?? 0) < 0);
    const totalGuardado = lista.reduce(
      (soma, m) =>
        soma + (m.concluida ? Math.max(m.valor_atual || 0, m.valor_alvo || 0) : m.valor_atual || 0),
      0
    );

    this.resumo = {
      totalGuardado,
      ativas: ativas.length,
      atrasadas: atrasadas.length,
      concluidas: this.metasConcluidas.length,
      mensagem: this.mensagemMascote(ativas, atrasadas.length, this.metasConcluidas.length),
    };
    this.atualizarInsight();
  }

  private async carregarGastoEmocional(userId: string) {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const inicio = `${hoje.getFullYear()}-${mes}-01`;
    const seguinte = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const fim = `${seguinte.getFullYear()}-${String(seguinte.getMonth() + 1).padStart(2, '0')}-01`;

    try {
      const { data, error } = await this.supabaseService.client
        .from('movimentacao')
        .select('valor, humor')
        .eq('id_usuario', userId)
        .eq('tipo', 'despesa')
        .is('deletado_em', null)
        .in('humor', HUMORES_EMOCIONAIS)
        .gte('data_transacao', inicio)
        .lt('data_transacao', fim);

      if (error) {
        return;
      }

      const porHumor = new Map<string, number>();
      let total = 0;
      (data || []).forEach((g: any) => {
        const valor = Number(g.valor) || 0;
        total += valor;
        porHumor.set(g.humor, (porHumor.get(g.humor) || 0) + valor);
      });

      let humor: string | null = null;
      let valorHumor = 0;
      porHumor.forEach((v, h) => {
        if (v > valorHumor) {
          humor = h;
          valorHumor = v;
        }
      });

      this.gastosEmocionais = { total, humor, valorHumor };
      this.atualizarInsight();
      this.cdr.detectChanges();
    } catch {}
  }

  private atualizarInsight() {
    const g = this.gastosEmocionais;
    const ref = [...this.metasFavoritas, ...this.metasOutras].find(
      (m) => (m.valor_alvo || 0) - (m.valor_atual || 0) > 0
    );
    if (!g || !ref) {
      this.insightGastos = null;
      return;
    }
    if (g.total <= 0) {
      this.insightGastos = {
        total: 0,
        texto: 'Nenhum gasto por impulso emocional neste mês. Continue assim!',
      };
      return;
    }

    const falta = (ref.valor_alvo || 0) - (ref.valor_atual || 0);
    const pct = Math.round((g.total / falta) * 100);
    const comparacao =
      pct >= 100
        ? `Esse valor seria suficiente para completar "${ref.nome}".`
        : `Isso equivale a ${pct}% do que falta para "${ref.nome}".`;
    const origem = g.humor
      ? ` O maior peso veio de momentos de ${NOMES_HUMOR[g.humor] ?? g.humor} (R$ ${this.formatarMoeda(g.valorHumor)}).`
      : '';
    this.insightGastos = { total: g.total, texto: comparacao + origem };
  }

  private mensagemMascote(ativas: Meta[], atrasadas: number, concluidas: number): string {
    if (atrasadas > 0) {
      return atrasadas === 1
        ? 'Uma meta passou do prazo. Guarde um valor hoje ou ajuste a data.'
        : `${atrasadas} metas passaram do prazo. Guarde um valor hoje ou ajuste as datas.`;
    }
    if (ativas.length === 0) {
      return concluidas > 0
        ? 'Todas as metas alcançadas! Que tal criar a próxima?'
        : 'Crie sua primeira meta.';
    }
    const maior = ativas.reduce((a, b) => ((b.progresso || 0) > (a.progresso || 0) ? b : a));
    const p = maior.progresso || 0;
    const falta = Math.max(0, (maior.valor_alvo || 0) - (maior.valor_atual || 0));
    if (p >= 75) return `"${maior.nome}" está quase lá: faltam R$ ${this.formatarMoeda(falta)}.`;
    if (p >= 50) return `Metade do caminho em "${maior.nome}". Continue assim!`;
    if (p >= 25) return `Bom começo em "${maior.nome}". Cada valor guardado conta.`;
    return 'Guardar um pouquinho de cada vez já faz diferença.';
  }

  private async getActiveUserId(): Promise<string | null> {
    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabaseService.getCurrentUser();
      }
      return user ? user.id : null;
    } catch {
      return null;
    }
  }

  private normalizarMeta(m: any): Meta {
    const alvo = Number(m.valor_alvo ?? m.valor_meta) || 0;
    const atual = Number(m.valor_atual) || 0;
    return {
      id_meta: m.id_meta,
      id_usuario: m.id_usuario,
      nome: m.nome || '',
      icone: m.icone || undefined,
      valor_alvo: alvo,
      valor_atual: atual,
      progresso: this.calcProgresso(atual, alvo),
      data_fim: m.data_fim ?? m.data_alvo ?? undefined,
      concluida: !!m.concluida,
      favorita: !!m.favorita,
      status: m.status || (m.concluida ? 'concluida' : 'ativa'),
      pendente_sync: !!m.pendente_sync,
    };
  }

  private calcProgresso(atual: number, alvo: number): number {
    return alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0;
  }

  private lerCache(userId: string): Meta[] {
    try {
      const raw = localStorage.getItem(`metas_${userId}`);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map((m) => this.normalizarMeta(m)) : [];
    } catch {
      return [];
    }
  }

  private async salvarCache(userId?: string) {
    const id = userId || (await this.getActiveUserId());
    if (!id) return;
    try {
      localStorage.setItem(`metas_${id}`, JSON.stringify(this.metas));
    } catch {}
  }

  async carregarMetas() {
    if (this.carregando || this.sincronizando.size > 0) return;
    this.carregando = true;

    try {
      const userId = await this.getActiveUserId();
      if (!userId) return;

      const locais = this.lerCache(userId);
      let remotas: Meta[] | null = null;

      try {
        const { data, error } = await this.supabaseService.client
          .from('meta')
          .select('*')
          .eq('id_usuario', userId)
          .is('deletado_em', null);

        if (!error && data) {
          remotas = data.map((m: any) => this.normalizarMeta(m));
        }
      } catch {}

      if (remotas) {
        const pendentes = locais
          .filter(
            (m) =>
              !remotas!.some((r) => r.id_meta === m.id_meta) &&
              (m.pendente_sync || remotas!.length === 0)
          )
          .map((m) => ({ ...m, pendente_sync: true }));
        this.metas = [...remotas, ...pendentes];
      } else {
        this.metas = locais;
      }

      if (this.primeiraCarga) {
        this.formAberto = this.metas.length === 0;
        this.primeiraCarga = false;
      }
      await this.salvarCache(userId);
      this.carregarGastoEmocional(userId);
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }

    this.sincronizarPendentes();
  }

  private async sincronizarPendentes() {
    for (const meta of this.metas.filter((m) => m.pendente_sync)) {
      await this.enviarNovaMeta(meta);
    }
  }

  async tentarSincronizar(meta: Meta) {
    const ok = await this.enviarNovaMeta(meta);
    this.avisar(
      ok ? 'Meta salva online.' : 'Ainda não deu para salvar online. Verifique a conexão.',
      ok ? 'success' : 'warning'
    );
  }

  private async enviarNovaMeta(meta: Meta, userId?: string): Promise<boolean> {
    const idLocal = meta.id_meta;
    if (!idLocal || this.sincronizando.has(idLocal)) return false;
    const uid = userId || (await this.getActiveUserId());
    if (!uid) return false;

    this.sincronizando.add(idLocal);
    try {
      const base = {
        id_usuario: uid,
        nome: meta.nome,
        valor_alvo: meta.valor_alvo,
        data_fim: meta.data_fim || null,
        favorita: !!meta.favorita,
        concluida: !!meta.concluida,
        valor_atual: meta.valor_atual || 0,
        progresso: meta.progresso || 0,
        status: meta.status || 'ativa',
      };

      let res = await this.supabaseService.client
        .from('meta')
        .insert({ ...base, icone: meta.icone || null })
        .select()
        .single();

      if (res.error) {
        res = await this.supabaseService.client.from('meta').insert(base).select().single();
      }

      if (res.error || !res.data) {
        return false;
      }

      meta.id_meta = res.data.id_meta;
      meta.id_usuario = uid;
      meta.pendente_sync = false;
      await this.migrarAportes(uid, idLocal, meta.id_meta as string);
      await this.salvarCache(uid);
      this.cdr.detectChanges();
      return true;
    } catch {
      return false;
    } finally {
      this.sincronizando.delete(idLocal);
    }
  }

  private async persistirRemoto(
    meta: Meta,
    campos: Record<string, any>
  ): Promise<'ok' | 'pendente' | 'erro'> {
    if (!meta.id_meta) return 'erro';
    if (meta.pendente_sync) {
      return (await this.enviarNovaMeta(meta)) ? 'ok' : 'pendente';
    }
    try {
      const { error } = await this.supabaseService.client
        .from('meta')
        .update(campos)
        .eq('id_meta', meta.id_meta);
      if (error) {
        return 'erro';
      }
      return 'ok';
    } catch {
      return 'erro';
    }
  }

  private async salvarAlteracao(meta: Meta, campos: Record<string, any>) {
    this.metas = [...this.metas];
    this.cdr.detectChanges();
    await this.salvarCache();
    const resultado = await this.persistirRemoto(meta, campos);
    if (resultado === 'erro') {
      this.avisar('Não foi possível salvar online. Verifique a conexão e tente de novo.');
    }
    this.cdr.detectChanges();
  }

  async adicionarMeta() {
    const nome = this.novaMeta.nome.trim();
    const valor = Number(this.novaMeta.valor);
    if (!nome || !(valor > 0)) {
      this.avisar('Informe o nome da meta e um valor maior que zero.');
      return;
    }
    const userId = await this.getActiveUserId();
    if (!userId) {
      this.avisar('Entre na sua conta para criar metas.');
      return;
    }

    const nova: Meta = {
      id_meta: `local_${Date.now()}`,
      id_usuario: userId,
      nome,
      icone: this.novaMeta.icone,
      valor_alvo: valor,
      data_fim: this.novaMeta.dataFim || undefined,
      favorita: false,
      concluida: false,
      valor_atual: 0,
      progresso: 0,
      status: 'ativa',
      pendente_sync: true,
    };

    this.metas = [...this.metas, nova];
    this.novaMeta = { nome: '', valor: null, dataFim: '', icone: '🎯' };
    this.formAberto = false;
    this.cdr.detectChanges();
    await this.salvarCache(userId);

    const ok = await this.enviarNovaMeta(nova, userId);
    if (!ok) {
      this.avisar('Meta salva neste aparelho. Vamos tentar salvar online de novo depois.');
    }
    this.cdr.detectChanges();
  }

  async solicitarAporte(meta: Meta) {
    if (!meta.id_meta) return;
    const alert = await this.alertCtrl.create({
      header: 'Guardar dinheiro',
      subHeader: meta.nome,
      message: `Meta: R$ ${this.formatarMoeda(meta.valor_alvo)} | Já guardado: R$ ${this.formatarMoeda(meta.valor_atual || 0)}`,
      inputs: [
        { name: 'valor', type: 'number', placeholder: 'Quanto deseja guardar? (R$)', min: 1 },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const valor = parseFloat(data.valor);
            if (!isNaN(valor) && valor > 0) {
              this.adicionarAporte(meta, valor);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async adicionarAporte(meta: Meta, valorAporte: number) {
    if (!meta.id_meta) return;

    const alvo = meta.valor_alvo || 0;
    const jaConcluida = !!meta.concluida;
    const novoValorAtual = Number(meta.valor_atual || 0) + Number(valorAporte);
    const alcancada = alvo > 0 && novoValorAtual >= alvo;

    meta.valor_atual = novoValorAtual;
    meta.progresso = this.calcProgresso(novoValorAtual, alvo);
    if (alcancada) {
      meta.concluida = true;
      meta.status = 'concluida';
    }

    await this.registrarAporte(meta, valorAporte, 'deposito');

    if (alcancada && !jaConcluida) {
      this.dispararConfete();
      this.notificacaoService.criarNotificacao({
        titulo: 'Meta Concluída! 🎯',
        mensagem: `Parabéns! Você alcançou 100% da sua meta "${meta.nome}" (R$ ${this.formatarMoeda(alvo)}).`,
        tipo: 'meta',
        link: '/tabs/tab4',
      });
    }

    await this.salvarAlteracao(meta, {
      valor_atual: novoValorAtual,
      progresso: meta.progresso,
      concluida: !!meta.concluida,
      status: meta.status || 'ativa',
      atualizado_em: new Date().toISOString(),
    });
  }

  async solicitarRetirada(meta: Meta) {
    if (!meta.id_meta) return;
    const guardado = meta.valor_atual || 0;
    if (guardado <= 0) {
      this.avisar('Essa meta ainda não tem valor guardado.');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Retirar dinheiro',
      subHeader: meta.nome,
      message: `Guardado agora: R$ ${this.formatarMoeda(guardado)}`,
      inputs: [
        { name: 'valor', type: 'number', placeholder: 'Quanto deseja retirar? (R$)', min: 1 },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Retirar',
          handler: (data) => {
            const valor = parseFloat(data.valor);
            if (isNaN(valor) || valor <= 0) {
              this.avisar('Informe um valor maior que zero.');
              return false;
            }
            if (valor > guardado) {
              this.avisar(`Você só tem R$ ${this.formatarMoeda(guardado)} guardados nessa meta.`);
              return false;
            }
            this.retirarValor(meta, valor);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async retirarValor(meta: Meta, valor: number) {
    const alvo = meta.valor_alvo || 0;
    const novoValorAtual = Math.max(0, Number(meta.valor_atual || 0) - valor);

    meta.valor_atual = novoValorAtual;
    meta.progresso = this.calcProgresso(novoValorAtual, alvo);
    if (meta.concluida && novoValorAtual < alvo) {
      meta.concluida = false;
      meta.status = 'ativa';
    }

    await this.registrarAporte(meta, valor, 'retirada');
    await this.salvarAlteracao(meta, {
      valor_atual: novoValorAtual,
      progresso: meta.progresso,
      concluida: !!meta.concluida,
      status: meta.status || 'ativa',
      atualizado_em: new Date().toISOString(),
    });
  }

  private lerAportesLocais(userId: string): Record<string, Aporte[]> {
    try {
      const raw = localStorage.getItem(`aportes_${userId}`);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  }

  private salvarAportesLocais(userId: string, mapa: Record<string, Aporte[]>) {
    try {
      localStorage.setItem(`aportes_${userId}`, JSON.stringify(mapa));
    } catch {}
  }

  private async registrarAporte(meta: Meta, valor: number, tipo: TipoAporte) {
    if (!meta.id_meta) return;
    const userId = await this.getActiveUserId();
    const aporte: Aporte = {
      id_meta: meta.id_meta,
      valor,
      tipo,
      criado_em: new Date().toISOString(),
    };

    if (userId) {
      const mapa = this.lerAportesLocais(userId);
      mapa[meta.id_meta] = [aporte, ...(mapa[meta.id_meta] || [])];
      this.salvarAportesLocais(userId, mapa);
    }

    if (this.historicoMetaId === meta.id_meta) {
      this.historico = [aporte, ...this.historico];
    }

    if (userId && !meta.pendente_sync) {
      try {
        await this.supabaseService.client.from('aporte_meta').insert({
          id_meta: meta.id_meta,
          id_usuario: userId,
          valor,
          tipo,
          criado_em: aporte.criado_em,
        });
      } catch {}
    }
  }

  private async migrarAportes(userId: string, idAntigo: string, idNovo: string) {
    const mapa = this.lerAportesLocais(userId);
    const lista = mapa[idAntigo] || [];
    if (lista.length === 0) return;

    delete mapa[idAntigo];
    lista.forEach((a) => (a.id_meta = idNovo));
    mapa[idNovo] = [...(mapa[idNovo] || []), ...lista];
    this.salvarAportesLocais(userId, mapa);
    if (this.historicoMetaId === idAntigo) this.historicoMetaId = idNovo;

    try {
      await this.supabaseService.client.from('aporte_meta').insert(
        lista.map((a) => ({
          id_meta: idNovo,
          id_usuario: userId,
          valor: a.valor,
          tipo: a.tipo,
          criado_em: a.criado_em,
        }))
      );
    } catch {}
  }

  private async obterHistorico(meta: Meta): Promise<Aporte[]> {
    if (!meta.id_meta) return [];
    const userId = await this.getActiveUserId();
    const locais = userId ? this.lerAportesLocais(userId)[meta.id_meta] || [] : [];
    let remotos: Aporte[] = [];

    if (!meta.pendente_sync) {
      try {
        const { data, error } = await this.supabaseService.client
          .from('aporte_meta')
          .select('*')
          .eq('id_meta', meta.id_meta)
          .order('criado_em', { ascending: false });
        if (!error && data) {
          remotos = data.map((a: any) => ({
            id_aporte: a.id_aporte,
            id_meta: a.id_meta,
            valor: Number(a.valor) || 0,
            tipo: a.tipo as TipoAporte,
            criado_em: a.criado_em,
          }));
        }
      } catch {}
    }

    const unicos = new Map<string, Aporte>();
    [...remotos, ...locais].forEach((a) => {
      const chave = `${a.tipo}|${a.valor}|${new Date(a.criado_em).getTime()}`;
      if (!unicos.has(chave)) unicos.set(chave, a);
    });
    return [...unicos.values()].sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );
  }

  async alternarHistorico(meta: Meta) {
    if (!meta.id_meta) return;
    if (this.historicoMetaId === meta.id_meta) {
      this.historicoMetaId = null;
      return;
    }
    this.historicoMetaId = meta.id_meta;
    this.historico = [];
    this.carregandoHistorico = true;
    this.cdr.detectChanges();

    const lista = await this.obterHistorico(meta);
    if (this.historicoMetaId === meta.id_meta) {
      this.historico = lista;
    }
    this.carregandoHistorico = false;
    this.cdr.detectChanges();
  }

  tituloAporte(a: Aporte): string {
    if (a.tipo === 'deposito') return 'Guardou';
    if (a.tipo === 'retirada') return 'Retirou';
    return a.valor >= 0 ? 'Ajuste ao concluir' : 'Ajuste ao reabrir';
  }

  valorNegativo(a: Aporte): boolean {
    return a.tipo === 'retirada' || (a.tipo === 'ajuste' && a.valor < 0);
  }

  valorAporteTexto(a: Aporte): string {
    const sinal = this.valorNegativo(a) ? '−' : '+';
    return `${sinal} R$ ${this.formatarMoeda(Math.abs(a.valor))}`;
  }

  formatarDataHora(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async favoritar(meta: Meta) {
    if (!meta.id_meta) return;
    meta.favorita = !meta.favorita;
    await this.salvarAlteracao(meta, { favorita: meta.favorita });
  }

  async editarMeta(meta: Meta) {
    if (!meta.id_meta) return;
    const alert = await this.alertCtrl.create({
      header: 'Editar meta',
      message: 'Deixe a data em branco para remover o prazo.',
      inputs: [
        { name: 'nome', type: 'text', placeholder: 'Nome da meta', value: meta.nome },
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Valor da meta (R$)',
          value: meta.valor_alvo,
          min: 1,
        },
        {
          name: 'dataFim',
          type: 'date',
          placeholder: 'Data limite',
          value: (meta.data_fim || '').substring(0, 10),
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (data) => {
            const nome = (data.nome || '').trim();
            const valor = Number(data.valor);
            if (!nome || !(valor > 0)) {
              this.avisar('Informe um nome e um valor maior que zero.');
              return false;
            }
            this.aplicarEdicao(meta, nome, valor, data.dataFim || undefined);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async aplicarEdicao(meta: Meta, nome: string, valor: number, dataFim?: string) {
    const alvoAnterior = meta.valor_alvo || 0;
    const atual = meta.valor_atual || 0;
    const atingiu = atual >= valor;

    meta.nome = nome;
    meta.valor_alvo = valor;
    meta.data_fim = dataFim;
    meta.progresso = this.calcProgresso(atual, valor);

    if (!meta.concluida && atingiu) {
      meta.concluida = true;
      meta.status = 'concluida';
      this.dispararConfete();
    } else if (meta.concluida && valor > alvoAnterior && !atingiu) {
      meta.concluida = false;
      meta.status = 'ativa';
    }

    await this.salvarAlteracao(meta, {
      nome,
      valor_alvo: valor,
      data_fim: dataFim || null,
      progresso: meta.progresso,
      concluida: !!meta.concluida,
      status: meta.status || 'ativa',
      atualizado_em: new Date().toISOString(),
    });
  }

  async marcarConcluida(meta: Meta) {
    if (!meta.id_meta) return;

    if (meta.concluida) {
      await this.reabrirMeta(meta);
      return;
    }

    const falta = Math.max(0, (meta.valor_alvo || 0) - (meta.valor_atual || 0));
    if (falta <= 0) {
      await this.concluirMeta(meta, 0);
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Concluir meta',
      message: `Ainda faltam R$ ${this.formatarMoeda(falta)} para o valor da meta. Ao concluir, esse valor será registrado como guardado.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Concluir',
          handler: () => {
            this.concluirMeta(meta, falta);
          },
        },
      ],
    });
    await alert.present();
  }

  private async concluirMeta(meta: Meta, falta: number) {
    meta.valor_atual = meta.valor_alvo || 0;
    meta.progresso = 100;
    meta.concluida = true;
    meta.status = 'concluida';

    if (falta > 0) {
      await this.registrarAporte(meta, falta, 'ajuste');
    }
    this.dispararConfete();
    await this.salvarAlteracao(meta, {
      valor_atual: meta.valor_atual,
      progresso: 100,
      concluida: true,
      status: 'concluida',
      atualizado_em: new Date().toISOString(),
    });
  }

  private async reabrirMeta(meta: Meta) {
    const historico = await this.obterHistorico(meta);
    const ajusteLiquido = historico
      .filter((a) => a.tipo === 'ajuste')
      .reduce((soma, a) => soma + a.valor, 0);

    if (ajusteLiquido > 0) {
      meta.valor_atual = Math.max(0, (meta.valor_atual || 0) - ajusteLiquido);
      await this.registrarAporte(meta, -ajusteLiquido, 'ajuste');
    }

    meta.progresso = this.calcProgresso(meta.valor_atual || 0, meta.valor_alvo || 0);
    meta.concluida = false;
    meta.status = 'ativa';

    await this.salvarAlteracao(meta, {
      valor_atual: meta.valor_atual || 0,
      progresso: meta.progresso,
      concluida: false,
      status: 'ativa',
      atualizado_em: new Date().toISOString(),
    });
  }

  async excluirMeta(meta: Meta) {
    if (!meta.id_meta) return;

    const alert = await this.alertCtrl.create({
      header: 'Excluir meta',
      message: `Deseja realmente excluir a meta "${meta.nome}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: async () => {
            const id = meta.id_meta as string;
            const pendente = !!meta.pendente_sync;

            this.metas = this.metas.filter((m) => m.id_meta !== id);
            if (this.historicoMetaId === id) this.historicoMetaId = null;
            this.cdr.detectChanges();
            await this.salvarCache();

            const userId = await this.getActiveUserId();
            if (userId) {
              const mapa = this.lerAportesLocais(userId);
              delete mapa[id];
              this.salvarAportesLocais(userId, mapa);
            }

            if (!pendente) {
              try {
                await this.supabaseService.client
                  .from('meta')
                  .update({ deletado_em: new Date().toISOString() })
                  .eq('id_meta', id);
              } catch {}
            }
            this.cdr.detectChanges();
          },
        },
      ],
    });
    await alert.present();
  }

  sugestaoMensal(meta: Meta): string | null {
    if (meta.concluida || !meta.data_fim) return null;
    const falta = (meta.valor_alvo || 0) - (meta.valor_atual || 0);
    if (falta <= 0) return null;
    const dias = this.diasAteData(meta.data_fim);
    if (dias === null) return null;

    const faltaTexto = `R$ ${this.formatarMoeda(falta)}`;
    if (dias < 0) return `Faltam ${faltaTexto} e o prazo já passou. Ajuste a data ou guarde o que puder.`;
    if (dias === 0) return `O prazo é hoje e faltam ${faltaTexto}.`;
    if (dias <= 30) return `Faltam ${faltaTexto} para o prazo, em ${dias} ${dias === 1 ? 'dia' : 'dias'}.`;

    const meses = Math.ceil(dias / 30);
    const porMes = Math.ceil((falta / meses) * 100) / 100;
    return `Guarde cerca de R$ ${this.formatarMoeda(porMes)} por mês para chegar a tempo.`;
  }

  statusMeta(meta: Meta): StatusMeta {
    const dias = this.diasAteData(meta.data_fim);
    if (dias !== null && dias < 0) return 'late';
    if (dias !== null && dias <= 7) return 'warn';
    return 'ok';
  }

  marco(meta: Meta): string {
    const p = meta.progresso || 0;
    if (p >= 75) return 'Quase lá!';
    if (p >= 50) return 'Metade do caminho';
    if (p >= 25) return 'Bom começo';
    return '';
  }

  formatarMoeda(valor?: number): string {
    if (valor === null || valor === undefined) return '0,00';
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatarData(dataString?: string): string {
    if (!dataString) return '';
    const parts = dataString.substring(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dataString;
  }

  private diasAteData(dataString?: string): number | null {
    if (!dataString) return null;
    const parts = dataString.substring(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alvo = new Date(parts[0], parts[1] - 1, parts[2]);
    return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
  }

  calcularDiasRestantes(dataString?: string): { texto: string; expirado: boolean } {
    const dias = this.diasAteData(dataString);
    if (dias === null) return { texto: '', expirado: false };
    if (dias < 0) return { texto: `Atrasado ${Math.abs(dias)}d`, expirado: true };
    if (dias === 0) return { texto: 'Vence hoje', expirado: false };
    return { texto: dias === 1 ? '1 dia' : `${dias} dias`, expirado: false };
  }

  private async avisar(mensagem: string, cor: 'success' | 'warning' | 'danger' = 'warning') {
    const toast = await this.toastCtrl.create({
      message: mensagem,
      duration: 3000,
      position: 'top',
      color: cor,
    });
    await toast.present();
  }

  private dispararConfete() {
    const cores = ['#ffffff', '#ece7f6', '#ffd166', '#6fd39b', '#ff8fa3', '#9d8bc9'];
    this.confetes = Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.8 + Math.random() * 1.2,
      cor: cores[i % cores.length],
    }));
    this.cdr.detectChanges();

    clearTimeout(this.confeteTimer);
    this.confeteTimer = setTimeout(() => {
      this.confetes = [];
      this.cdr.detectChanges();
    }, 3500);
  }
}