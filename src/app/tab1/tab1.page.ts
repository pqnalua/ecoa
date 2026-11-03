import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

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

  resumoMes: ResumoMes = {
    fixos: 900,
    variaveis: 350,
    extras: 120,
    receitas: 2500,
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
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.carregarDados();
  }

  async ionViewWillEnter() {
    await this.carregarDados();
  }

  async carregarDados() {
    await Promise.all([
      this.carregarUsuario(),
      this.carregarSaldoBancario(),
    ]);
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
      this.temQuestionario = true;
    } else if (metadata['perfil_diagnostico']) {
      this.tipoConsumidor = metadata['perfil_diagnostico'];
      this.perfilDiagnostico = metadata['perfil_diagnostico'];
      this.temQuestionario = true;
    }

    this.cdr.detectChanges();
  }

  async carregarSaldoBancario() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      const bancos = user?.user_metadata?.['bancos_conectados'] || [];

      if (bancos.length > 0) {
        this.saldo = bancos.reduce((acc: number, b: any) => acc + (Number(b.saldo) || 0), 0);
      } else {
        this.saldo = 0.0;
      }
      this.atualizadoEm = new Date();
      this.cdr.detectChanges();
    } catch {}
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

  registrarPorVoz() {
    console.log('Comando por voz ainda não implementado');
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