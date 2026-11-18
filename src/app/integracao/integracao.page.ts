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
  private carregandoDados = false;

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
    if (this.carregandoDados) return;
    this.carregandoDados = true;

    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) return;

      const { data: contas } = await this.supabaseService.client
        .from('conta_bancaria')
        .select('*')
        .eq('id_usuario', user.id)
        .is('deletado_em', null);

      if (contas && contas.length > 0) {
        const mapaContas = new Map(contas.map((c: any) => [c.banco.toLowerCase(), c]));
        this.bancos = this.bancos.map(b => {
          const conta: any = mapaContas.get(b.nome.toLowerCase());
          if (conta) {
            return {
              ...b,
              conectado: true,
              saldo: Number(conta.saldo_atual) || 0,
              contaInfo: 'Conta Corrente',
              atualizadoEm: 'Hoje às ' + new Date(conta.atualizado_em || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return b;
        });
      } else {
        const salvos: Banco[] = user?.user_metadata?.['bancos_conectados'];
        if (salvos && Array.isArray(salvos) && salvos.length > 0) {
          const mapaSalvos = new Map(salvos.map(s => [s.id, s]));
          this.bancos = this.bancos.map(b => {
            const salvo = mapaSalvos.get(b.id);
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
      }
    } catch (e) {
      console.warn('Erro ao carregar estado de contas:', e);
    } finally {
      this.carregandoDados = false;
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

    try {
      if (this.bancoSelecionado) {
        this.bancoSelecionado.conectado = true;
        this.bancoSelecionado.saldo = Number(this.inputSaldo) || 1500.0;
        this.bancoSelecionado.contaInfo = `Ag: 0001 • C/C: ${this.inputUsuario}`;
        this.bancoSelecionado.atualizadoEm = 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        await this.salvarNoSupabase(this.bancoSelecionado);
      }
    } finally {
      this.carregando = false;
      this.fecharModal();
      this.filtrar();
    }
  }

  async desconectar(banco: Banco) {
    this.carregando = true;
    this.cdr.detectChanges();

    try {
      banco.conectado = false;
      banco.saldo = undefined;
      banco.contaInfo = undefined;
      banco.atualizadoEm = undefined;

      await this.salvarNoSupabase(banco);
    } finally {
      this.carregando = false;
      this.filtrar();
    }
  }

  async sincronizar(banco: Banco) {
    this.carregando = true;
    this.cdr.detectChanges();

    try {
      banco.atualizadoEm = 'Agora mesmo';
      await this.salvarNoSupabase(banco);
    } finally {
      this.carregando = false;
      this.filtrar();
    }
  }

  private async salvarNoSupabase(bancoAlvo?: Banco) {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) return;

      const conectados = this.bancos.filter(b => b.conectado);

      const authPromise = this.supabaseService.client.auth.updateUser({
        data: {
          bancos_conectados: conectados,
        },
      });

      const bancosParaProcessar = bancoAlvo ? [bancoAlvo] : this.bancos;

      const { data: contasExistentes } = await this.supabaseService.client
        .from('conta_bancaria')
        .select('id_conta, banco')
        .eq('id_usuario', user.id);

      const mapaExistentes = new Map(
        (contasExistentes || []).map((c: any) => [c.banco.toLowerCase(), c.id_conta])
      );

      const operacoesBanco = bancosParaProcessar.map(b => {
        const idExistente = mapaExistentes.get(b.nome.toLowerCase());

        if (b.conectado) {
          if (idExistente) {
            return this.supabaseService.client
              .from('conta_bancaria')
              .update({
                saldo_atual: b.saldo || 0,
                deletado_em: null,
                ativa: true,
                atualizado_em: new Date().toISOString()
              })
              .eq('id_conta', idExistente);
          } else {
            return this.supabaseService.client
              .from('conta_bancaria')
              .insert({
                id_usuario: user.id,
                banco: b.nome,
                tipo_conta: 'corrente',
                saldo_atual: b.saldo || 0,
                saldo_inicial: b.saldo || 0,
                cor: b.cor,
                ativa: true
              });
          }
        } else if (idExistente) {
          return this.supabaseService.client
            .from('conta_bancaria')
            .update({
              deletado_em: new Date().toISOString(),
              ativa: false
            })
            .eq('id_conta', idExistente);
        }

        return Promise.resolve();
      });

      await Promise.all([authPromise, ...operacoesBanco]);
    } catch (e) {
      console.warn('Erro ao sincronizar conta_bancaria:', e);
    }
  }
}