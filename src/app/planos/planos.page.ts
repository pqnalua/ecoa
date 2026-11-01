import { Component } from '@angular/core';

@Component({
  selector: 'app-planos',
  templateUrl: './planos.page.html',
  styleUrls: ['./planos.page.scss'],
  standalone: false,
})
export class PlanosPage {
  categoriaSelecionada: 'premium' | 'vip' = 'premium';

  selecionarCategoria(categoria: 'premium' | 'vip') {
    this.categoriaSelecionada = categoria;
  }

  assinar(nomePlano: string) {
    alert(`Plano selecionado: ${nomePlano}. Redirecionando para o checkout...`);
  }
}