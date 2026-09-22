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
    { nome: 'Viagem', valorMeta: 3500, valorAtual: 1400, favorita: false },
    { nome: 'Carro', valorMeta: 73000, valorAtual: 2100, favorita: false },
    { nome: 'Perfume', valorMeta: 475, valorAtual: 475, favorita: false }
  ];

  constructor() { }

  ngOnInit() {
  }

  get metasOrdenadas(): Meta[] {
    return [...this.metas].sort((a, b) => {
      if (a.favorita && !b.favorita) return -1;
      if (!a.favorita && b.favorita) return 1;
      return 0;
    });
  }

  // Função para formatar os valores no padrão brasileiro (ex: 3.500,00)
  formatarMoeda(valor: number): string {
    if (valor === null || valor === undefined) return '0,00';
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  adicionarMeta() {
    if (!this.novaMeta.nome || !this.novaMeta.valor) {
      return;
    }

    this.metas.push({
      nome: this.novaMeta.nome,
      valorMeta: this.novaMeta.valor,
      valorAtual: 0,
      favorita: false
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