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
  temQuestionario = false;
  tipoConsumidor: string | null = null;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.carregarDadosHome();
  }

  async ionViewWillEnter() {
    await this.carregarDadosHome();
  }

  async carregarDadosHome() {
    const user = await this.carregarUsuario();
    if (user?.id) {
      await Promise.all([
        this.carregarHumorHoje(user.id),
        this.carregarSaldo(user.id),
        this.carregarResumoMes(user.id),
        this.carregarPerfilUsuario(user.id),
      ]);
      this.cdr.detectChanges();
    }
  }

  async carregarUsuario() {
    const user = await this.supabaseService.getCurrentUser();
    if (!user) return null;

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

    return user;
  }

  async carregarPerfilUsuario(userId: string) {
    try {
      const { data: usuarioData } = await this.supabaseService.client
        .from('usuario')
        .select('tipo_consumidor')
        .eq('id_usuario', userId)
        .maybeSingle();

      const { data: perfilData } = await this.supabaseService.client
        .from('perfil_financeiro')
        .select('id_perfil, dia_pagamento, faixa_renda')
        .eq('id_usuario', userId)
        .maybeSingle();

      this.tipoConsumidor = usuarioData?.tipo_consumidor || null;
      this.temQuestionario = !!(this.tipoConsumidor || perfilData?.id_perfil);
    } catch (e) {
      console.warn('Erro ao carregar perfil do usuário:', e);
    }
  }

  getTituloPerfil(tipo: string | null): string {
    if (tipo === 'consumista') return 'Consumista 🛍️';
    if (tipo === 'endividado') return 'Endividado 📉';
    if (tipo === 'controlado') return 'Controlado 🌱';
    return 'Perfil Ativo ✨';
  }

  // Busca se já respondeu o humor hoje
  async carregarHumorHoje(userId: string) {
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await this.supabaseService.client
      .from('humor_financeiro')
      .select('humor')
      .eq('id_usuario', userId)
      .gte('data_registro', `${hoje}T00:00:00`)
      .order('data_registro', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      this.humorSelecionado = data[0].humor;
    }
  }

  // Salva o humor diário no banco
  async selecionarHumor(id: string) {
    this.humorSelecionado = id;
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        await this.supabaseService.client.from('humor_financeiro').insert({
          id_usuario: user.id,
          humor: id,
          data_registro: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Erro ao salvar humor diário:', e);
    }
  }

  // Calcula o saldo somando contas bancárias + receitas líquidas
  async carregarSaldo(userId: string) {
    const { data } = await this.supabaseService.client
      .from('conta_bancaria')
      .select('saldo_atual')
      .eq('id_usuario', userId)
      .is('deletado_em', null);

    let saldoContas = 0;
    if (data && data.length > 0) {
      saldoContas = data.reduce((total, c) => total + Number(c.saldo_atual || 0), 0);
    }

    this.saldo = saldoContas;
    this.atualizadoEm = new Date();
  }

  // Calcula despesas e receitas do mês
  async carregarResumoMes(userId: string) {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const inicioMes = `${ano}-${mes}-01`;

    const proxMes = new Date(ano, agora.getMonth() + 1, 1);
    const anoProx = proxMes.getFullYear();
    const mesProx = String(proxMes.getMonth() + 1).padStart(2, '0');
    const fimMes = `${anoProx}-${mesProx}-01`;

    const { data } = await this.supabaseService.client
      .from('movimentacao')
      .select('valor, natureza, tipo')
      .eq('id_usuario', userId)
      .is('deletado_em', null)
      .gte('data_transacao', inicioMes)
      .lt('data_transacao', fimMes);

    let fixos = 0;
    let variaveis = 0;
    let extras = 0;
    let receitas = 0;

    if (data) {
      for (const m of data) {
        const val = Number(m.valor) || 0;
        if (m.tipo === 'receita') {
          receitas += val;
        } else {
          if (m.natureza === 'fixo') fixos += val;
          else if (m.natureza === 'extra') extras += val;
          else variaveis += val;
        }
      }
    }

    this.resumoMes = { fixos, variaveis, extras, receitas };
  }

  irParaGastos() {
    this.router.navigateByUrl('/tabs/tab3');
  }

  registrarPorVoz() {
    console.log('Comando por voz ainda em desenvolvimento');
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
