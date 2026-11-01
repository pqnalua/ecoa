import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Banco {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  conectado: boolean;
  saldo?: number;
  atualizadoEm?: string;
}

export interface TransacaoBancaria {
  id: string;
  bancoId: string;
  descricao: string;
  valor: number;
  tipo: 'fixos' | 'variaveis' | 'extras';
  categoria: string;
  data: string;
}

@Injectable({
  providedIn: 'root',
})
export class BancoService {
  private bancosPadrao: Banco[] = [
    { id: 'nubank', nome: 'Nubank', cor: '#820ad1', icone: 'card-outline', conectado: false },
    { id: 'inter', nome: 'Banco Inter', cor: '#ff7a00', icone: 'wallet-outline', conectado: false },
    { id: 'itau', nome: 'Itaú Unibanco', cor: '#ec7000', icone: 'business-outline', conectado: false },
    { id: 'bradesco', nome: 'Bradesco', cor: '#cc092f', icone: 'business-outline', conectado: false },
    { id: 'bb', nome: 'Banco do Brasil', cor: '#f8d117', icone: 'business-outline', conectado: false },
    { id: 'caixa', nome: 'Caixa Econômica', cor: '#005ca9', icone: 'business-outline', conectado: false },
    { id: 'c6', nome: 'C6 Bank', cor: '#242424', icone: 'card-outline', conectado: false },
  ];

  private saldosIniciais: { [key: string]: number } = {
    nubank: 1500.0,
    inter: 820.5,
    itau: 2340.0,
    bradesco: 1100.0,
    bb: 950.0,
    caixa: 600.0,
    c6: 1250.0,
  };

  constructor(private supabaseService: SupabaseService) {}

  async obterBancos(): Promise<Banco[]> {
    const user = await this.supabaseService.getCurrentUser();
    const salvos: Banco[] = user?.user_metadata?.['bancos_conectados'] || [];

    return this.bancosPadrao.map(banco => {
      const salvo = salvos.find(s => s.id === banco.id);
      if (salvo) {
        return { ...banco, ...salvo };
      }
      return { ...banco };
    });
  }

  async conectarBanco(bancoId: string): Promise<Banco> {
    const bancos = await this.obterBancos();
    const banco = bancos.find(b => b.id === bancoId);

    if (!banco) {
      throw new Error('Banco não encontrado.');
    }

    banco.conectado = true;
    banco.saldo = this.saldosIniciais[bancoId] || 1000.0;
    banco.atualizadoEm = 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    await this.salvarNoSupabase(bancos);
    return banco;
  }

  async desconectarBanco(bancoId: string): Promise<void> {
    const bancos = await this.obterBancos();
    const banco = bancos.find(b => b.id === bancoId);

    if (banco) {
      banco.conectado = false;
      banco.saldo = undefined;
      banco.atualizadoEm = undefined;
      await this.salvarNoSupabase(bancos);
    }
  }

  async sincronizarBanco(bancoId: string): Promise<Banco> {
    const bancos = await this.obterBancos();
    const banco = bancos.find(b => b.id === bancoId);

    if (!banco || !banco.conectado) {
      throw new Error('Banco não conectado.');
    }

    banco.atualizadoEm = 'Agora mesmo';
    await this.salvarNoSupabase(bancos);
    return banco;
  }

  async obterSaldoTotal(): Promise<number> {
    const bancos = await this.obterBancos();
    return bancos
      .filter(b => b.conectado && b.saldo)
      .reduce((total, b) => total + (b.saldo || 0), 0);
  }

  private async salvarNoSupabase(bancos: Banco[]): Promise<void> {
    const conectados = bancos.filter(b => b.conectado);
    await this.supabaseService.client.auth.updateUser({
      data: {
        bancos_conectados: conectados,
      },
    });
  }
}