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
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;

      const { data: contas } = await this.supabaseService.client
        .from('conta_bancaria')
        .select('*')
        .eq('id_usuario', user.id)
        .is('deletado_em', null);

      if (contas && contas.length > 0) {
        const contasMap = new Map(contas.map((c: any) => [(c.banco || '').toLowerCase(), c]));
        this.bancos = this.bancos.map(b => {
          const conta: any = contasMap.get(b.nome.toLowerCase());
          if (conta) {
            return {
              ...b,
              conectado: true,
              saldo: Number(conta.saldo_atual) || 0,
              contaInfo: 'Conta Corrente',
              atualizadoEm: 'Hoje às ' + new Date(conta.atualizado_em || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return {
            ...b,
            conectado: false,
            saldo: undefined,
            contaInfo: undefined,
            atualizadoEm: undefined,
          };
        });
      } else {
        const salvos: Banco[] = user?.user_metadata?.['bancos_conectados'];
        if (salvos && Array.isArray(salvos) && salvos.length > 0) {
          const salvosMap = new Map(salvos.map(s => [s.id, s]));
          this.bancos = this.bancos.map(b => {
            const salvo = salvosMap.get(b.id);
            if (salvo && salvo.conectado) {
              return {
                ...b,
                conectado: true,
                saldo: salvo.saldo,
                contaInfo: salvo.contaInfo,
                atualizadoEm: salvo.atualizadoEm,
              };
            }
            return {
              ...b,
              conectado: false,
              saldo: undefined,
              contaInfo: undefined,
              atualizadoEm: undefined,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar contas:', e);
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

    const banco = this.bancoSelecionado;
    if (!banco) return;

    banco.conectado = true;
    banco.saldo = Number(this.inputSaldo) || 1500.0;
    banco.contaInfo = `Ag: 0001 • C/C: ${this.inputUsuario}`;
    banco.atualizadoEm = 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        const { data: existentes } = await this.supabaseService.client
          .from('conta_bancaria')
          .select('id_conta')
          .eq('id_usuario', userId)
          .eq('banco', banco.nome)
          .limit(1);

        if (existentes && existentes.length > 0) {
          await this.supabaseService.client
            .from('conta_bancaria')
            .update({
              saldo_atual: banco.saldo || 0,
              deletado_em: null,
              ativa: true,
              atualizado_em: new Date().toISOString()
            })
            .eq('id_conta', existentes[0].id_conta);
        } else {
          await this.supabaseService.client
            .from('conta_bancaria')
            .insert({
              id_usuario: userId,
              banco: banco.nome,
              tipo_conta: 'corrente',
              saldo_atual: banco.saldo || 0,
              saldo_inicial: banco.saldo || 0,
              cor: banco.cor,
              ativa: true
            });
        }

        this.supabaseService.client.auth.updateUser({
          data: {
            bancos_conectados: this.bancos.filter(b => b.conectado),
          },
        }).then();
      }
    } catch (e: any) {
      console.warn('Erro ao salvar conta:', e);
    } finally {
      this.carregando = false;
      this.fecharModal();
      this.filtrar();
    }
  }

  async desconectar(banco: Banco) {
    banco.conectado = false;
    banco.saldo = undefined;
    banco.contaInfo = undefined;
    banco.atualizadoEm = undefined;
    this.filtrar();
    this.cdr.detectChanges();

    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      await this.supabaseService.client
        .from('conta_bancaria')
        .update({
          deletado_em: new Date().toISOString(),
          ativa: false
        })
        .eq('id_usuario', userId)
        .eq('banco', banco.nome);

      this.supabaseService.client.auth.updateUser({
        data: {
          bancos_conectados: this.bancos.filter(b => b.conectado),
        },
      }).then();
    } catch (e) {
      console.warn('Erro ao desconectar conta:', e);
    }
  }

  async sincronizar(banco: Banco) {
    banco.atualizadoEm = 'Agora mesmo';
    this.filtrar();
    this.cdr.detectChanges();

    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      await this.supabaseService.client
        .from('conta_bancaria')
        .update({
          atualizado_em: new Date().toISOString()
        })
        .eq('id_usuario', userId)
        .eq('banco', banco.nome);

      this.supabaseService.client.auth.updateUser({
        data: {
          bancos_conectados: this.bancos.filter(b => b.conectado),
        },
      }).then();
    } catch (e) {
      console.warn('Erro ao sincronizar:', e);
    }
  }
}