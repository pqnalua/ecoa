import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export interface Banco {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  conectado: boolean;
  saldo?: number;
  contaInfo?: string;
  atualizadoEm?: string;
}

@Component({
  selector: 'app-integracao',
  templateUrl: './integracao.page.html',
  styleUrls: ['./integracao.page.scss'],
  standalone: false,
})
export class IntegracaoPage implements OnInit {
  carregando = false;
  busca = '';

  bancos: Banco[] = [
    { id: 'nubank', nome: 'Nubank', cor: '#820ad1', icone: 'card-outline', conectado: false },
    { id: 'inter', nome: 'Banco Inter', cor: '#ff7a00', icone: 'wallet-outline', conectado: false },
    { id: 'itau', nome: 'Itaú Unibanco', cor: '#ec7000', icone: 'business-outline', conectado: false },
    { id: 'bradesco', nome: 'Bradesco', cor: '#cc092f', icone: 'business-outline', conectado: false },
    { id: 'bb', nome: 'Banco do Brasil', cor: '#f8d117', icone: 'business-outline', conectado: false },
    { id: 'caixa', nome: 'Caixa Econômica', cor: '#005ca9', icone: 'business-outline', conectado: false },
    { id: 'c6', nome: 'C6 Bank', cor: '#242424', icone: 'card-outline', conectado: false },
  ];

  filtroBancos: Banco[] = [];

  bancoSelecionado: Banco | null = null;
  etapaModal = 1;
  inputUsuario = '';
  inputSenha = '';
  inputSaldo = 1500.0;
  erroConexao = '';

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    this.filtroBancos = [...this.bancos];
  }

  async ngOnInit() {
    await this.carregarEstadoSalvo();
  }

  async ionViewWillEnter() {
    await this.carregarEstadoSalvo();
  }

  async carregarEstadoSalvo() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      const salvos: Banco[] = user?.user_metadata?.['bancos_conectados'];

      if (salvos && Array.isArray(salvos) && salvos.length > 0) {
        this.bancos = this.bancos.map(b => {
          const salvo = salvos.find(s => s.id === b.id);
          if (salvo) {
            return {
              ...b,
              conectado: salvo.conectado,
              saldo: salvo.saldo,
              contaInfo: salvo.contaInfo,
              atualizadoEm: salvo.atualizadoEm,
            };
          }
          return b;
        });
      }
    } catch {
    } finally {
      this.filtrar();
    }
  }

  filtrar() {
    const termo = (this.busca || '').trim().toLowerCase();
    if (!termo) {
      this.filtroBancos = [...this.bancos];
    } else {
      this.filtroBancos = this.bancos.filter(b => b.nome.toLowerCase().includes(termo));
    }
    this.cdr.detectChanges();
  }

  get bancosConectados(): Banco[] {
    return this.bancos.filter(b => b.conectado);
  }

  iniciarConexao(banco: Banco) {
    if (banco.conectado) {
      return;
    }

    this.bancoSelecionado = banco;
    this.etapaModal = 1;
    this.inputUsuario = '';
    this.inputSenha = '';
    this.inputSaldo = 1500.0;
    this.erroConexao = '';
    this.cdr.detectChanges();
  }

  irParaEtapaCredenciais() {
    this.etapaModal = 2;
    this.cdr.detectChanges();
  }

  fecharModal() {
    this.bancoSelecionado = null;
    this.etapaModal = 1;
    this.erroConexao = '';
    this.cdr.detectChanges();
  }

  async conectarConta() {
    if (!this.inputUsuario || !this.inputSenha) {
      this.erroConexao = 'Informe o usuário/CPF e a senha para continuar.';
      return;
    }

    this.carregando = true;
    this.etapaModal = 3;
    this.erroConexao = '';
    this.cdr.detectChanges();

    setTimeout(async () => {
      if (this.bancoSelecionado) {
        this.bancoSelecionado.conectado = true;
        this.bancoSelecionado.saldo = Number(this.inputSaldo) || 1500.0;
        this.bancoSelecionado.contaInfo = `Ag: 0001 • C/C: ${this.inputUsuario}`;
        this.bancoSelecionado.atualizadoEm = 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        await this.salvarNoSupabase();
      }

      this.carregando = false;
      this.fecharModal();
      this.filtrar();
    }, 1800);
  }

  async desconectar(banco: Banco) {
    banco.conectado = false;
    banco.saldo = undefined;
    banco.contaInfo = undefined;
    banco.atualizadoEm = undefined;

    await this.salvarNoSupabase();
    this.filtrar();
  }

  async sincronizar(banco: Banco) {
    this.carregando = true;
    this.cdr.detectChanges();

    setTimeout(async () => {
      banco.atualizadoEm = 'Agora mesmo';
      await this.salvarNoSupabase();
      this.carregando = false;
      this.filtrar();
    }, 800);
  }

  private async salvarNoSupabase() {
    try {
      const conectados = this.bancos.filter(b => b.conectado);
      await this.supabaseService.client.auth.updateUser({
        data: {
          bancos_conectados: conectados,
        },
      });
    } catch {}
  }
}