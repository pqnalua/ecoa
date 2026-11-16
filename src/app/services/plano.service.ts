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
  private readonly STORAGE_KEY = 'ecoa_assinatura_ativa';
  private planoAtivoSubject = new BehaviorSubject<Assinatura | null>(null);
  public planoAtivo$: Observable<Assinatura | null> = this.planoAtivoSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    this.inicializarPlano();
  }

  private inicializarPlano() {
    const salvoLocal = localStorage.getItem(this.STORAGE_KEY);
    if (salvoLocal) {
      try {
        const parsed = JSON.parse(salvoLocal);
        this.planoAtivoSubject.next(parsed);
      } catch {}
    }
    this.carregarPlanoAtivo();
  }

  async carregarPlanoAtivo(): Promise<Assinatura | null> {
    try {
      const salvoLocal = localStorage.getItem(this.STORAGE_KEY);
      if (salvoLocal) {
        const parsed = JSON.parse(salvoLocal);
        this.planoAtivoSubject.next(parsed);
      }

      const { data: sessionData } = await this.supabase.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabase.getCurrentUser();
      }

      if (!user) {
        return this.planoAtivoSubject.value;
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
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        this.planoAtivoSubject.next(data);
        return data;
      }

      return this.planoAtivoSubject.value;
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

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(novaAssinatura));
    this.planoAtivoSubject.next(novaAssinatura);

    try {
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabase.getCurrentUser();
      }

      if (user) {
        novaAssinatura.user_id = user.id;

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
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
          this.planoAtivoSubject.next(data);
        }
      }
    } catch {}

    return true;
  }

  async cancelarAssinatura(): Promise<boolean> {
    localStorage.removeItem(this.STORAGE_KEY);
    this.planoAtivoSubject.next(null);

    try {
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      let user: any = sessionData?.session?.user;
      if (!user) {
        user = await this.supabase.getCurrentUser();
      }

      if (user) {
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
    if (plano && plano.ativo) {
      return !plano.nome_plano.toLowerCase().includes('comum');
    }
    return true;
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