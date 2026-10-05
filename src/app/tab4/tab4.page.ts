import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export interface Meta {
  id_meta?: string;
  id_usuario?: string;
  nome: string;
  valor_alvo: number;
  valor_atual?: number;
  progresso?: number;
  data_fim?: string;
  concluida?: boolean;
  favorita?: boolean;
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
    private router: Router
  ) {}

  ngOnInit() {
    this.carregarMetas();
  }

  ionViewWillEnter() {
    this.carregarMetas();
  }

  private async getActiveUserId(): Promise<string | null> {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) {
        this.router.navigateByUrl('/login', { replaceUrl: true });
        return null;
      }
      return user.id;
    } catch {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return null;
    }
  }

  // Busca na tabela oficial 'meta'
  async carregarMetas() {
    this.carregando = true;
    const userId = await this.getActiveUserId();
    if (!userId) {
      this.carregando = false;
      return;
    }

    const { data, error } = await this.supabaseService.client
      .from('meta')
      .select('*')
      .eq('id_usuario', userId)
      .is('deletado_em', null);

    if (error) {
      console.error('Erro ao carregar metas:', error.message);
    } else {
      this.metas = data || [];
    }
    this.carregando = false;
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

    const { data, error } = await this.supabaseService.client
      .from('meta')
      .insert({
        id_usuario: userId,
        nome: this.novaMeta.nome.trim(),
        valor_alvo: Number(this.novaMeta.valor),
        data_fim: this.novaMeta.dataFim || null,
        favorita: false,
        concluida: false,
        valor_atual: 0,
        progresso: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar meta:', error.message);
    } else if (data) {
      this.metas.push(data);
      this.novaMeta = { nome: '', valor: null, dataFim: '' };
    }
  }

  async favoritar(meta: Meta) {
    if (!meta.id_meta) return;

    const novoStatus = !meta.favorita;
    const { error } = await this.supabaseService.client
      .from('meta')
      .update({ favorita: novoStatus })
      .eq('id_meta', meta.id_meta);

    if (error) {
      console.error('Erro ao favoritar meta:', error.message);
    } else {
      meta.favorita = novoStatus;
    }
  }

  async marcarConcluida(meta: Meta) {
    if (!meta.id_meta) return;

    const novoStatus = !meta.concluida;
    const { error } = await this.supabaseService.client
      .from('meta')
      .update({ 
        concluida: novoStatus,
        status: novoStatus ? 'concluida' : 'ativa' 
      })
      .eq('id_meta', meta.id_meta);

    if (error) {
      console.error('Erro ao atualizar meta:', error.message);
    } else {
      meta.concluida = novoStatus;
    }
  }

  async excluirMeta(meta: Meta) {
    if (!meta.id_meta) return;

    // Exclusão lógica com deletado_em
    const { error } = await this.supabaseService.client
      .from('meta')
      .update({ deletado_em: new Date().toISOString() })
      .eq('id_meta', meta.id_meta);

    if (error) {
      console.error('Erro ao apagar meta:', error.message);
    } else {
      this.metas = this.metas.filter((m) => m.id_meta !== meta.id_meta);
    }
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