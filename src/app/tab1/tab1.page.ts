import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import { SupabaseService } from '../services/supabase.service';
import { ComandoVozModalComponent } from '../components/comando-voz-modal/comando-voz-modal.component';
import { NotificacaoService } from '../services/notificacao.service';
import { NotificacoesModalComponent } from '../components/notificacoes-modal/notificacoes-modal.component';
import { OrcamentoService, OrcamentoMensal } from '../services/orcamento.service';

interface Humor {
  id: string;
  imagem: string;
}

interface ResumoMes {
  fixos: number;
  variaveis: number;
  extras: number;
  receitas: number;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  usuario = {
    nome: 'usuário',
    foto: '../../assets/icon/avatar.jpg',
  };

  saldo = 0.0;
  atualizadoEm = new Date();
  temQuestionario = false;
  tipoConsumidor = 'Organizador';
  perfilDiagnostico = 'Organizador';

  notificacoesNaoLidas = 0;
  orcamentoMes: OrcamentoMensal | null = null;
  mesNomeAtual = '';

  readonly mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  resumoMes: ResumoMes = {
    fixos: 0,
    variaveis: 0,
    extras: 0,
    receitas: 0,
  };

  humores: Humor[] = [
    { id: 'alegria', imagem: 'assets/alegria.png' },
    { id: 'tristeza', imagem: 'assets/tristeza.png' },
    { id: 'ansiedade', imagem: 'assets/ansiedade.png' },
    { id: 'tedio', imagem: 'assets/tedio.png' },
    { id: 'raiva', imagem: 'assets/raiva.png' },
  ];

  humorSelecionado: string | null = null;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef,
    private modalCtrl: ModalController,
    private notificacaoService: NotificacaoService,
    private orcamentoService: OrcamentoService
  ) {
    const hoje = new Date();
    this.mesNomeAtual = this.mesesNomes[hoje.getMonth()];
  }

  async ngOnInit() {
    this.notificacaoService.naoLidas$.subscribe((total) => {
      this.notificacoesNaoLidas = total;
      this.cdr.detectChanges();
    });

    await this.carregarDados();
  }

  async ionViewWillEnter() {
    await this.carregarDados();
    await this.notificacaoService.contarNaoLidas();
  }

  async carregarDados() {
    await Promise.all([
      this.carregarUsuario(),
      this.carregarSaldoBancario(),
      this.carregarResumoMes(),
      this.carregarOrcamento(),
      this.notificacaoService.contarNaoLidas(),
    ]);
  }

  async carregarOrcamento() {
    try {
      const hoje = new Date();
      const mes = hoje.getMonth() + 1;
      const ano = hoje.getFullYear();
      this.orcamentoMes = await this.orcamentoService.carregarOrcamentoMes(mes, ano);
      this.cdr.detectChanges();
    } catch (e) {
      console.warn('Erro ao carregar orçamento:', e);
    }
  }

  async abrirNotificacoes() {
    const modal = await this.modalCtrl.create({
      component: NotificacoesModalComponent,
      breakpoints: [0, 0.7, 1],
      initialBreakpoint: 1,
    });

    await modal.present();
    await modal.onWillDismiss();
    await this.notificacaoService.contarNaoLidas();
  }

  async carregarUsuario() {
    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    let user: any = sessionData?.session?.user;

    if (!user) {
      user = await this.supabaseService.getCurrentUser();
    }

    if (!user) {
      return;
    }

    const metadata = user.user_metadata || {};
    const nomeCompleto = metadata['full_name'] || metadata['name'] || metadata['nome'] || '';

    let primeiroNome = '';
    if (nomeCompleto) {
      primeiroNome = nomeCompleto.trim().split(' ')[0];
    } else if (user.email) {
      const parteEmail = user.email.split('@')[0];
      primeiroNome = parteEmail.split('.')[0];
    }

    if (primeiroNome) {
      this.usuario.nome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();
    }

    if (metadata['avatar_url'] || metadata['picture']) {
      this.usuario.foto = metadata['avatar_url'] || metadata['picture'];
    }

    if (metadata['humor']) {
      this.humorSelecionado = metadata['humor'];
    } else if (user.id) {
      const humorLocal = localStorage.getItem(`humor_${user.id}`);
      if (humorLocal) {
        this.humorSelecionado = humorLocal;
      }
    }

    if (metadata['tipo_consumidor']) {
      this.tipoConsumidor = metadata['tipo_consumidor'];
      this.perfilDiagnostico = metadata['tipo_consumidor'];
    } else if (metadata['perfil_diagnostico']) {
      this.tipoConsumidor = metadata['perfil_diagnostico'];
      this.perfilDiagnostico = metadata['perfil_diagnostico'];
    }

    // Consulta direta no banco se o usuário já preencheu o questionário de perfil financeiro
    try {
      const { data: perfil } = await this.supabaseService.client
        .from('perfil_financeiro')
        .select('id_perfil')
        .eq('id_usuario', user.id)
        .maybeSingle();

      this.temQuestionario = !!perfil || !!metadata['tipo_consumidor'] || !!metadata['perfil_diagnostico'];
    } catch {
      this.temQuestionario = !!metadata['tipo_consumidor'] || !!metadata['perfil_diagnostico'];
    }

    this.cdr.detectChanges();
  }

  async carregarSaldoBancario() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) return;

      const { data: contas } = await this.supabaseService.client
        .from('conta_bancaria')
        .select('saldo_atual')
        .eq('id_usuario', user.id)
        .is('deletado_em', null);

      if (contas && contas.length > 0) {
        this.saldo = contas.reduce((acc: number, c: any) => acc + (Number(c.saldo_atual) || 0), 0);
      } else {
        const bancos = user?.user_metadata?.['bancos_conectados'] || [];
        if (bancos.length > 0) {
          this.saldo = bancos.reduce((acc: number, b: any) => acc + (Number(b.saldo) || 0), 0);
        } else {
          this.saldo = 0.0;
        }
      }
      this.atualizadoEm = new Date();
      this.cdr.detectChanges();
    } catch {}
  }

  async carregarResumoMes() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) return;

      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const inicio = `${ano}-${mes}-01`;
      const seguinte = new Date(ano, agora.getMonth() + 1, 1);
      const anoSeg = seguinte.getFullYear();
      const mesSeg = String(seguinte.getMonth() + 1).padStart(2, '0');
      const fim = `${anoSeg}-${mesSeg}-01`;

      const { data, error } = await this.supabaseService.client
        .from('movimentacao')
        .select('valor, tipo, natureza')
        .eq('id_usuario', user.id)
        .is('deletado_em', null)
        .gte('data_transacao', inicio)
        .lt('data_transacao', fim);

      if (!error && data) {
        let fixos = 0;
        let variaveis = 0;
        let extras = 0;
        let receitas = 0;

        for (const m of data) {
          const v = Number(m.valor) || 0;
          if (m.tipo === 'receita') {
            receitas += v;
          } else {
            if (m.natureza === 'fixo') fixos += v;
            else if (m.natureza === 'extra') extras += v;
            else variaveis += v;
          }
        }

        this.resumoMes = { fixos, variaveis, extras, receitas };
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.warn('Erro ao carregar resumo do mês:', e);
    }
  }

  getTituloPerfil(tipo?: any): string {
    if (typeof tipo === 'string' && tipo.trim().length > 0) {
      return tipo;
    }
    return this.tipoConsumidor || this.perfilDiagnostico || 'Perfil Financeiro';
  }

  async selecionarHumor(id: string) {
    this.humorSelecionado = id;
    this.cdr.detectChanges();

    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      let user: any = sessionData?.session?.user;

      if (!user) {
        user = await this.supabaseService.getCurrentUser();
      }

      if (user?.id) {
        localStorage.setItem(`humor_${user.id}`, id);
      }

      await this.supabaseService.client.auth.updateUser({
        data: { humor: id }
      });
    } catch {}
  }

  irParaGastos() {
    this.router.navigateByUrl('/tabs/tab3');
  }

  async registrarPorVoz() {
    const modal = await this.modalCtrl.create({
      component: ComandoVozModalComponent,
      backdropDismiss: false,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.registrado) {
      await this.carregarDados();
    }
  }

  irParaGraficos() {
    this.router.navigateByUrl('/tabs/tab3');
  }

  irParaChat() {
    this.router.navigateByUrl('/iaecoa');
  }

  irParaQuestionario() {
    this.router.navigateByUrl('/questionario');
  }
}
