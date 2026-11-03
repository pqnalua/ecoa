import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/lazy';
import { SupabaseService } from '../services/supabase.service';

export interface Meta {
  id_meta?: string;
  id_usuario?: string;
  nome: string;
  valor_alvo?: number;
  valor_meta?: number;
  valor_atual?: number;
  progresso?: number;
  data_fim?: string;
  data_alvo?: string;
  concluida?: boolean;
  favorita?: boolean;
  status?: string;
}

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit {
  novaMeta = {
    nome: '',
    valor: null as number | null,
    dataFim: '',
  };

  metas: Meta[] = [];
  carregando = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.carregarMetas();
  }

  ionViewWillEnter() {
    this.carregarMetas();
  }

  private async getActiveUserId(): Promise<string | null> {
    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabaseService.getCurrentUser();
      }
      if (!user) {
        return null;
      }
      return user.id;
    } catch {
      return null;
    }
  }

  private async salvarMetas(userId?: string) {
    let id = userId;
    if (!id) {
      id = (await this.getActiveUserId()) || undefined;
    }
    if (id) {
      localStorage.setItem(`metas_${id}`, JSON.stringify(this.metas));
    }
    try {
      await this.supabaseService.client.auth.updateUser({
        data: { metas: this.metas }
      });
    } catch {}
  }

  async carregarMetas() {
    this.carregando = true;
    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    let user: any = sessionData?.session?.user;
    if (!user) {
      user = await this.supabaseService.getCurrentUser();
    }
    if (!user) {
      this.carregando = false;
      this.cdr.detectChanges();
      return;
    }

    let metasCarregadas: Meta[] = [];

    try {
      const { data, error } = await this.supabaseService.client
        .from('meta')
        .select('*')
        .eq('id_usuario', user.id)
        .is('deletado_em', null);

      if (!error && data && data.length > 0) {
        metasCarregadas = data.map((m: any) => ({
          ...m,
          valor_alvo: Number(m.valor_alvo || m.valor_meta) || 0,
          valor_atual: Number(m.valor_atual) || 0,
          progresso: m.progresso !== undefined && m.progresso !== null 
            ? Number(m.progresso) 
            : Math.min(100, Math.round(((Number(m.valor_atual) || 0) / (Number(m.valor_alvo || m.valor_meta) || 1)) * 100)),
        }));
      }
    } catch {}

    if (metasCarregadas.length === 0) {
      const metadata = user.user_metadata?.['metas'];
      if (Array.isArray(metadata) && metadata.length > 0) {
        metasCarregadas = metadata;
      } else {
        const local = localStorage.getItem(`metas_${user.id}`);
        if (local) {
          try {
            metasCarregadas = JSON.parse(local);
          } catch {}
        }
      }
    }

    this.metas = metasCarregadas;
    this.carregando = false;
    this.cdr.detectChanges();
  }

  private ordenarPorData(a: Meta, b: Meta): number {
    if (a.data_fim && b.data_fim) {
      return new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime();
    }
    if (a.data_fim) return -1;
    if (b.data_fim) return 1;
    return 0;
  }

  get metasFavoritas(): Meta[] {
    return this.metas
      .filter((m) => !m.concluida && m.favorita)
      .sort(this.ordenarPorData);
  }

  get metasOutras(): Meta[] {
    return this.metas
      .filter((m) => !m.concluida && !m.favorita)
      .sort(this.ordenarPorData);
  }

  get metasConcluidas(): Meta[] {
    return this.metas.filter((m) => m.concluida);
  }

  async adicionarMeta() {
    if (!this.novaMeta.nome || !this.novaMeta.valor) return;

    const userId = await this.getActiveUserId();
    if (!userId) return;

    const nova: Meta = {
      id_meta: Date.now().toString(),
      id_usuario: userId,
      nome: this.novaMeta.nome.trim(),
      valor_alvo: Number(this.novaMeta.valor),
      data_fim: this.novaMeta.dataFim || undefined,
      favorita: false,
      concluida: false,
      valor_atual: 0,
      progresso: 0,
      status: 'ativa',
    };

    this.metas = [...this.metas, nova];
    this.novaMeta = { nome: '', valor: null, dataFim: '' };
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseService.client
        .from('meta')
        .insert({
          id_usuario: userId,
          nome: nova.nome,
          valor_alvo: nova.valor_alvo,
          data_fim: nova.data_fim || null,
          favorita: false,
          concluida: false,
          valor_atual: 0,
          progresso: 0,
          status: 'ativa',
        })
        .select()
        .single();

      if (!error && data) {
        nova.id_meta = data.id_meta;
      }
    } catch {}

    await this.salvarMetas(userId);
    this.cdr.detectChanges();
  }

  async solicitarAporte(meta: Meta) {
    if (!meta.id_meta) return;

    const alert = await this.alertCtrl.create({
      header: 'Guardar Dinheiro',
      subHeader: meta.nome,
      message: `Meta alvo: R$ ${this.formatarMoeda(meta.valor_alvo)} | Já guardado: R$ ${this.formatarMoeda(meta.valor_atual || 0)}`,
      inputs: [
        {
          name: 'valor',
          type: 'number',
          placeholder: 'Quanto deseja guardar? (R$)',
          min: 1,
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Confirmar',
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

    const novoValorAtual = Number(meta.valor_atual || 0) + Number(valorAporte);
    const progresso = Math.min(100, Math.round((novoValorAtual / meta.valor_alvo) * 100));
    const alcancada = novoValorAtual >= meta.valor_alvo;

    meta.valor_atual = novoValorAtual;
    meta.progresso = progresso;
    if (alcancada) {
      meta.concluida = true;
      meta.status = 'concluida';
    }

    this.metas = [...this.metas];
    this.cdr.detectChanges();

    try {
      await this.supabaseService.client
        .from('meta')
        .update({
          valor_atual: novoValorAtual,
          progresso: progresso,
          concluida: alcancada || meta.concluida,
          status: alcancada ? 'concluida' : (meta.status || 'ativa'),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id_meta', meta.id_meta);
    } catch {}

    await this.salvarMetas();
    this.cdr.detectChanges();
  }

  async favoritar(meta: Meta) {
    if (!meta.id_meta) return;

    meta.favorita = !meta.favorita;
    this.metas = [...this.metas];
    this.cdr.detectChanges();

    try {
      await this.supabaseService.client
        .from('meta')
        .update({ favorita: meta.favorita })
        .eq('id_meta', meta.id_meta);
    } catch {}

    await this.salvarMetas();
    this.cdr.detectChanges();
  }

  async marcarConcluida(meta: Meta) {
    if (!meta.id_meta) return;

    meta.concluida = !meta.concluida;
    meta.status = meta.concluida ? 'concluida' : 'ativa';
    this.metas = [...this.metas];
    this.cdr.detectChanges();

    try {
      await this.supabaseService.client
        .from('meta')
        .update({ 
          concluida: meta.concluida,
          status: meta.status 
        })
        .eq('id_meta', meta.id_meta);
    } catch {}

    await this.salvarMetas();
    this.cdr.detectChanges();
  }

  async excluirMeta(meta: Meta) {
    if (!meta.id_meta) return;

    this.metas = this.metas.filter((m) => m.id_meta !== meta.id_meta);
    this.cdr.detectChanges();

    try {
      await this.supabaseService.client
        .from('meta')
        .update({ deletado_em: new Date().toISOString() })
        .eq('id_meta', meta.id_meta);
    } catch {}

    await this.salvarMetas();
    this.cdr.detectChanges();
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
    try {
      const parts = dataString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dataString;
    } catch {
      return dataString;
    }
  }

  calcularDiasRestantes(dataString?: string): { texto: string; expirado: boolean } {
    if (!dataString) return { texto: '', expirado: false };

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const parts = dataString.split('-').map(Number);
      const dataAlvo = new Date(parts[0], parts[1] - 1, parts[2]);

      const diferencaTempo = dataAlvo.getTime() - hoje.getTime();
      const diferencaDias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

      if (diferencaDias < 0) {
        return { texto: `Atrasado ${Math.abs(diferencaDias)}d`, expirado: true };
      } else if (diferencaDias === 0) {
        return { texto: 'Vence hoje', expirado: false };
      } else {
        return { texto: `${diferencaDias} dias`, expirado: false };
      }
    } catch {
      return { texto: '', expirado: false };
    }
  }
}