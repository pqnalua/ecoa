import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export interface Meta {
  id?: string;
  user_id?: string;
  nome: string;
  valor_meta: number;
  data_alvo?: string;
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

  private readonly DEFAULT_USER_ID = 'c1ecc597-13c5-4739-963e-15f85adb16ab';

  novaMeta = {
    nome: '',
    valor: null as number | null,
    dataAlvo: ''
  };

  metas: Meta[] = [];
  carregando = false;

  constructor(private supabaseService: SupabaseService) { }

  ngOnInit() {
    this.carregarMetas();
  }

  ionViewWillEnter() {
    this.carregarMetas();
  }

  private async getActiveUserId(): Promise<string> {
    try {
      const user = await this.supabaseService.getCurrentUser();
      return user?.id || this.DEFAULT_USER_ID;
    } catch {
      return this.DEFAULT_USER_ID;
    }
  }

  // Busca na tabela 'metas'
  async carregarMetas() {
    this.carregando = true;
    const userId = await this.getActiveUserId();

    const { data, error } = await this.supabaseService.client
      .from('metas')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao carregar metas:', error.message);
    } else {
      console.log('Metas carregadas com sucesso:', data);
      this.metas = data || [];
    }
    this.carregando = false;
  }

  private ordenarPorData(a: Meta, b: Meta): number {
    if (a.data_alvo && b.data_alvo) {
      return new Date(a.data_alvo).getTime() - new Date(b.data_alvo).getTime();
    }
    if (a.data_alvo) return -1;
    if (b.data_alvo) return 1;
    return 0;
  }

  get metasFavoritas(): Meta[] {
    return this.metas
      .filter(m => !m.concluida && m.favorita)
      .sort(this.ordenarPorData);
  }

  get metasOutras(): Meta[] {
    return this.metas
      .filter(m => !m.concluida && !m.favorita)
      .sort(this.ordenarPorData);
  }

  get metasConcluidas(): Meta[] {
    return this.metas.filter(m => m.concluida);
  }

  async adicionarMeta() {
    if (!this.novaMeta.nome || !this.novaMeta.valor) return;

    const userId = await this.getActiveUserId();

    const { data, error } = await this.supabaseService.client
      .from('metas')
      .insert({
        user_id: userId,
        nome: this.novaMeta.nome,
        valor_meta: this.novaMeta.valor,
        data_alvo: this.novaMeta.dataAlvo || null,
        favorita: false,
        concluida: false
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar meta:', error.message);
    } else if (data) {
      this.metas.push(data);
      this.novaMeta = { nome: '', valor: null, dataAlvo: '' };
    }
  }

  async favoritar(meta: Meta) {
    if (!meta.id) return;

    const novoStatus = !meta.favorita;
    const { error } = await this.supabaseService.client
      .from('metas')
      .update({ favorita: novoStatus })
      .eq('id', meta.id);

    if (error) {
      console.error('Erro ao favoritar meta:', error.message);
    } else {
      meta.favorita = novoStatus;
    }
  }

  async marcarConcluida(meta: Meta) {
    if (!meta.id) return;

    const novoStatus = !meta.concluida;
    const { error } = await this.supabaseService.client
      .from('metas')
      .update({ concluida: novoStatus })
      .eq('id', meta.id);

    if (error) {
      console.error('Erro ao atualizar meta:', error.message);
    } else {
      meta.concluida = novoStatus;
    }
  }

  async excluirMeta(meta: Meta) {
    if (!meta.id) return;

    const { error } = await this.supabaseService.client
      .from('metas')
      .delete()
      .eq('id', meta.id);

    if (error) {
      console.error('Erro ao apagar meta:', error.message);
    } else {
      this.metas = this.metas.filter(m => m.id !== meta.id);
    }
  }

  formatarMoeda(valor: number): string {
    if (valor === null || valor === undefined) return '0,00';
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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