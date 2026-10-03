import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

interface Banco {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  conectado: boolean;
  saldo?: number;
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
  filtroBancos: Banco[] = [];

  bancos: Banco[] = [
    { id: 'nubank', nome: 'Nubank', cor: '#820ad1', icone: 'card-outline', conectado: true, saldo: 1500.0, atualizadoEm: 'Hoje às 09:33' },
    { id: 'inter', nome: 'Banco Inter', cor: '#ff7a00', icone: 'wallet-outline', conectado: false },
    { id: 'itau', nome: 'Itaú Unibanco', cor: '#ec7000', icone: 'business-outline', conectado: false },
    { id: 'bradesco', nome: 'Bradesco', cor: '#cc092f', icone: 'business-outline', conectado: false },
    { id: 'bb', nome: 'Banco do Brasil', cor: '#f8d117', icone: 'business-outline', conectado: false },
    { id: 'caixa', nome: 'Caixa Econômica', cor: '#005ca9', icone: 'business-outline', conectado: false },
    { id: 'c6', nome: 'C6 Bank', cor: '#242424', icone: 'card-outline', conectado: false },
  ];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.filtrar();
  }

  filtrar() {
    if (!this.busca.trim()) {
      this.filtroBancos = [...this.bancos];
    } else {
      const termo = this.busca.toLowerCase();
      this.filtroBancos = this.bancos.filter(b => b.nome.toLowerCase().includes(termo));
    }
    this.cdr.detectChanges();
  }

  get bancosConectados(): Banco[] {
    return this.bancos.filter(b => b.conectado);
  }

  conectar(banco: Banco) {
    if (banco.conectado) {
      return;
    }

    this.carregando = true;
    setTimeout(() => {
      banco.conectado = true;
      banco.saldo = 780.50;
      banco.atualizadoEm = 'Agora mesmo';
      this.carregando = false;
      this.filtrar();
      this.cdr.detectChanges();
    }, 1400);
  }

  desconectar(banco: Banco) {
    banco.conectado = false;
    banco.saldo = undefined;
    this.filtrar();
    this.cdr.detectChanges();
  }

  sincronizar(banco: Banco) {
    this.carregando = true;
    setTimeout(() => {
      banco.atualizadoEm = 'Agora mesmo';
      this.carregando = false;
      this.cdr.detectChanges();
    }, 900);
  }
}