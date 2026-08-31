import { Component, OnInit } from '@angular/core';

interface Meta {
  nome: string;
  valorMeta: number;
  valorAtual: number;
  favorita?: boolean;
}

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit {

  novaMeta: { nome: string; valor: number | null } = {
    nome: '',
    valor: null
  };

  metas: Meta[] = [
    { nome: 'Viagem', valorMeta: 3500, valorAtual: 1400 },
    { nome: 'Carro', valorMeta: 73000, valorAtual: 2100 },
    { nome: 'Perfume', valorMeta: 475, valorAtual: 475 }
  ];

  constructor() { }

  ngOnInit() {
  }

  adicionarMeta() {
    if (!this.novaMeta.nome || !this.novaMeta.valor) {
      return;
    }

    this.metas.push({
      nome: this.novaMeta.nome,
      valorMeta: this.novaMeta.valor,
      valorAtual: 0
    });

    this.novaMeta = { nome: '', valor: null };
  }

  excluirMeta(meta: Meta) {
    this.metas = this.metas.filter(m => m !== meta);
  }

  favoritar(meta: Meta) {
    meta.favorita = !meta.favorita;
  }

  marcarConcluida(meta: Meta) {
    meta.valorAtual = meta.valorMeta;
  }
}