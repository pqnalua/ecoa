import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NotificacaoItem {
  id_notificacao: string;
  id_usuario: string;
  titulo: string;
  mensagem: string;
  tipo: 'orcamento' | 'meta' | 'emocional' | 'sistema';
  lida: boolean;
  link?: string;
  criado_em: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificacaoService {
  private naoLidasSubject = new BehaviorSubject<number>(0);
  public naoLidas$: Observable<number> = this.naoLidasSubject.asObservable();

  constructor(private supabase: SupabaseService) {}

  async carregarNotificacoes(): Promise<NotificacaoItem[]> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) return [];

      const { data, error } = await this.supabase.client
        .from('notificacao')
        .select('*')
        .eq('id_usuario', user.id)
        .order('criado_em', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar notificações:', error.message);
        return [];
      }

      const lista = data || [];
      const naoLidas = lista.filter((n: NotificacaoItem) => !n.lida).length;
      this.naoLidasSubject.next(naoLidas);

      return lista;
    } catch (e) {
      console.warn('Erro inesperado ao buscar notificações:', e);
      return [];
    }
  }

  async contarNaoLidas(): Promise<number> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) return 0;

      const { count, error } = await this.supabase.client
        .from('notificacao')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', user.id)
        .eq('lida', false);

      const total = count || 0;
      this.naoLidasSubject.next(total);
      return total;
    } catch {
      return 0;
    }
  }

  async criarNotificacao(dados: {
    titulo: string;
    mensagem: string;
    tipo: 'orcamento' | 'meta' | 'emocional' | 'sistema';
    link?: string;
  }): Promise<boolean> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) return false;

      // Evita duplicar a mesma notificação recente (nas últimas 24h)
      const ontem = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: existente } = await this.supabase.client
        .from('notificacao')
        .select('id_notificacao')
        .eq('id_usuario', user.id)
        .eq('titulo', dados.titulo)
        .gte('criado_em', ontem)
        .maybeSingle();

      if (existente) {
        return false; // Já alertou recentemente
      }

      const { error } = await this.supabase.client.from('notificacao').insert({
        id_usuario: user.id,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        tipo: dados.tipo,
        link: dados.link || null,
        lida: false,
      });

      if (!error) {
        await this.contarNaoLidas();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async marcarComoLida(idNotificacao: string): Promise<void> {
    try {
      await this.supabase.client
        .from('notificacao')
        .update({ lida: true })
        .eq('id_notificacao', idNotificacao);

      await this.contarNaoLidas();
    } catch (e) {
      console.warn('Erro ao marcar notificação como lida:', e);
    }
  }

  async marcarTodasComoLidas(): Promise<void> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) return;

      await this.supabase.client
        .from('notificacao')
        .update({ lida: true })
        .eq('id_usuario', user.id)
        .eq('lida', false);

      this.naoLidasSubject.next(0);
    } catch (e) {
      console.warn('Erro ao marcar todas notificações:', e);
    }
  }

  async excluirNotificacao(idNotificacao: string): Promise<void> {
    try {
      await this.supabase.client
        .from('notificacao')
        .delete()
        .eq('id_notificacao', idNotificacao);

      await this.contarNaoLidas();
    } catch (e) {
      console.warn('Erro ao excluir notificação:', e);
    }
  }
}
