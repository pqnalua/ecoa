import { Component, OnInit } from '@angular/core';
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

  saldo = 1500.0;
  atualizadoEm = new Date();

  resumoMes: ResumoMes = {
    fixos: 900,
    variaveis: 350,
    extras: 120,
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
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    await this.carregarUsuario();
  }

  async ionViewWillEnter() {
    await this.carregarUsuario();
  }

  async carregarUsuario() {
    const user = await this.supabaseService.getCurrentUser();
    if (!user) {
      return;
    }

    const metadata = user.user_metadata || {};
    const nomeCompleto = metadata['full_name'] || metadata['name'] || '';

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
  }

  selecionarHumor(id: string) {
    this.humorSelecionado = id;
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