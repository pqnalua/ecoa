import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface Humor {
  id: string;
  label: string;
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
  // TODO: trocar pelos dados reais do usuário logado (ex.: Supabase)
  usuario = {
    nome: 'usuário',
    foto: '',
  };

  // TODO: trocar pelo saldo vindo da integração com o banco (Pluggy)
  saldo = 1500.0;
  atualizadoEm = new Date();

  // TODO: trocar pelos gastos reais do mês atual
  resumoMes: ResumoMes = {
    fixos: 900,
    variaveis: 350,
    extras: 120,
  };

humores = [
  { id: 'alegria', imagem: 'assets/alegria.png' },
  { id: 'tristeza', imagem: 'assets/tristeza.png' },
  { id: 'ansiedade', imagem: 'assets/ansiedade.png' },
  { id: 'tedio', imagem: 'assets/tedio.png' },
  { id: 'raiva', imagem: 'assets/raiva.png' },
];

  humorSelecionado: string | null = null;

  constructor(private router: Router) {}

  ngOnInit() {
    //carregar humor já registrado hoje e preencher humorSelecionado
  }

  selecionarHumor(id: string) {
    this.humorSelecionado = id;
    //salvar o humor no banco, na data de hoje
  }

irParaGastos() {
  this.router.navigateByUrl('/tabs/tab3');
}

registrarPorVoz() {
  // TODO: iniciar o reconhecimento de voz e registrar a compra ditada
  console.log('Comando por voz ainda não implementado');
}

irParaGraficos() {
  // gráficos ficam dentro de Gastos
  this.router.navigateByUrl('/tabs/tab3');
}

irParaChat() {
  this.router.navigateByUrl('/iaecoa');
}
  

irParaQuestionario() {
    this.router.navigateByUrl('/questionario');
  }
}