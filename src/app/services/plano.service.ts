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
    this.carregarPlanoAtivo();
  }

  async carregarPlanoAtivo(): Promise<Assinatura | null> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) {
        this.planoAtivoSubject.next(null);
        return null;
      }

      const { data, error } = await this.supabase.client
        .from('assinatura')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        const local = localStorage.getItem(`plano_${user.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          this.planoAtivoSubject.next(parsed);
          return parsed;
        }
        this.planoAtivoSubject.next(null);
        return null;
      }

      localStorage.setItem(`plano_${user.id}`, JSON.stringify(data));
      this.planoAtivoSubject.next(data);
      return data;
    } catch {
      this.planoAtivoSubject.next(null);
      return null;
    }
  }

  async assinar(nomePlano: string, categoria: 'premium' | 'vip'): Promise<boolean> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) {
        return false;
      }

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

      const novaAssinatura: Assinatura = data || {
        user_id: user.id,
        nome_plano: nomePlano,
        categoria: categoria,
        ativo: true,
      };

      localStorage.setItem(`plano_${user.id}`, JSON.stringify(novaAssinatura));
      this.planoAtivoSubject.next(novaAssinatura);
      return true;
    } catch {
      return false;
    }
  }

  async cancelarAssinatura(): Promise<boolean> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) {
        return false;
      }

      await this.supabase.client
        .from('assinatura')
        .update({ ativo: false })
        .eq('user_id', user.id);

      localStorage.removeItem(`plano_${user.id}`);
      this.planoAtivoSubject.next(null);
      return true;
    } catch {
      return false;
    }
  }

  getPlanoAtual(): Assinatura | null {
    return this.planoAtivoSubject.value;
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

  temAcessoMetas(): boolean {
    const plano = this.planoAtivoSubject.value;
    if (!plano || !plano.ativo) return false;
    const nome = plano.nome_plano.toLowerCase();
    if (nome.includes('comum')) {
      return false;
    }
    return true;
  }
}