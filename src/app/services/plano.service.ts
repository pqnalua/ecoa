import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Assinatura {
  id?: string;
  user_id?: string;
  nome_plano: string;
  categoria: 'premium' | 'vip';
  ativo: boolean;
  criado_em?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlanoService {
  private planoAtivoSubject = new BehaviorSubject<Assinatura | null>(null);
  public planoAtivo$: Observable<Assinatura | null> = this.planoAtivoSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    this.configurarAuthListener();
    this.carregarPlanoAtivo();
  }

  private configurarAuthListener() {
    this.supabase.client.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('ecoa_assinatura_ativa');
        this.emitirSeMudou(null);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        await this.carregarPlanoAtivo();
      }
    });
  }

  private emitirSeMudou(novo: Assinatura | null) {
    const atualStr = JSON.stringify(this.planoAtivoSubject.value);
    const novoStr = JSON.stringify(novo);
    if (atualStr !== novoStr) {
      this.planoAtivoSubject.next(novo);
    }
  }

  async carregarPlanoAtivo(): Promise<Assinatura | null> {
    try {
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabase.getCurrentUser();
      }

      if (!user) {
        localStorage.removeItem('ecoa_assinatura_ativa');
        this.emitirSeMudou(null);
        return null;
      }

      const userStorageKey = `ecoa_assinatura_ativa_${user.id}`;
      const salvoLocal = localStorage.getItem(userStorageKey);
      if (salvoLocal) {
        try {
          const parsed = JSON.parse(salvoLocal);
          this.emitirSeMudou(parsed);
        } catch {}
      }

      const { data, error } = await this.supabase.client
        .from('assinatura')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        localStorage.setItem(userStorageKey, JSON.stringify(data));
        this.emitirSeMudou(data);
        return data;
      }

      localStorage.removeItem(userStorageKey);
      localStorage.removeItem('ecoa_assinatura_ativa');
      this.emitirSeMudou(null);
      return null;
    } catch {
      return this.planoAtivoSubject.value;
    }
  }

  async assinar(nomePlano: string, categoria: 'premium' | 'vip'): Promise<boolean> {
    const novaAssinatura: Assinatura = {
      nome_plano: nomePlano,
      categoria: categoria,
      ativo: true,
      criado_em: new Date().toISOString(),
    };

    try {
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabase.getCurrentUser();
      }

      if (user) {
        novaAssinatura.user_id = user.id;
        const userStorageKey = `ecoa_assinatura_ativa_${user.id}`;
        localStorage.setItem(userStorageKey, JSON.stringify(novaAssinatura));
        this.emitirSeMudou(novaAssinatura);

        await this.supabase.client
          .from('assinatura')
          .update({ ativo: false })
          .eq('user_id', user.id);

        const { data, error } = await this.supabase.client
          .from('assinatura')
          .insert({
            user_id: user.id,
            nome_plano: nomePlano,
            categoria: categoria,
            ativo: true,
          })
          .select()
          .single();

        if (!error && data) {
          localStorage.setItem(userStorageKey, JSON.stringify(data));
          this.emitirSeMudou(data);
        }
      } else {
        localStorage.setItem('ecoa_assinatura_ativa', JSON.stringify(novaAssinatura));
        this.emitirSeMudou(novaAssinatura);
      }
    } catch {
      localStorage.setItem('ecoa_assinatura_ativa', JSON.stringify(novaAssinatura));
      this.emitirSeMudou(novaAssinatura);
    }

    return true;
  }

  async cancelarAssinatura(): Promise<boolean> {
    localStorage.removeItem('ecoa_assinatura_ativa');
    this.emitirSeMudou(null);

    try {
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabase.getCurrentUser();
      }

      if (user) {
        localStorage.removeItem(`ecoa_assinatura_ativa_${user.id}`);
        await this.supabase.client
          .from('assinatura')
          .update({ ativo: false })
          .eq('user_id', user.id);
      }
    } catch {}

    return true;
  }

  getPlanoAtual(): Assinatura | null {
    return this.planoAtivoSubject.value;
  }

  temAcessoMetas(): boolean {
    const plano = this.planoAtivoSubject.value;
    if (!plano || !plano.ativo) {
      return false;
    }
    return !plano.nome_plano.toLowerCase().includes('comum');
  }

  temAcessoChatbot(): boolean {
    const plano = this.planoAtivoSubject.value;
    if (!plano || !plano.ativo) return false;
    const nome = plano.nome_plano.toLowerCase();
    const cat = plano.categoria;
    if (cat === 'premium') {
      return nome.includes('comum') || nome.includes('família') || nome.includes('familia') || nome.includes('especial');
    }
    if (cat === 'vip') {
      return nome.includes('família') || nome.includes('familia');
    }
    return false;
  }

  temAcessoComandoVoz(): boolean {
    const plano = this.planoAtivoSubject.value;
    if (!plano || !plano.ativo) return false;
    const nome = plano.nome_plano.toLowerCase();
    const cat = plano.categoria;
    if (cat === 'premium') {
      return nome.includes('especial');
    }
    if (cat === 'vip') {
      return nome.includes('duo') || nome.includes('família') || nome.includes('familia');
    }
    return false;
  }

  temAcessoIaControle(): boolean {
    const plano = this.planoAtivoSubject.value;
    if (!plano || !plano.ativo) return false;
    const nome = plano.nome_plano.toLowerCase();
    const cat = plano.categoria;
    if (cat === 'premium') {
      return nome.includes('especial');
    }
    if (cat === 'vip') {
      return nome.includes('família') || nome.includes('familia');
    }
    return false;
  }
}