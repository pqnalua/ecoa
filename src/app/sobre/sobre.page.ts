import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import { TermosModalComponent } from '../components/termos-modal/termos-modal.component';

@Component({
  selector: 'app-sobre',
  templateUrl: './sobre.page.html',
  styleUrls: ['./sobre.page.scss'],
  standalone: false,
})
export class SobrePage {
  // Espaço dedicado para o nome das desenvolvedoras e orientadores
  readonly autoras = [
    { nome: 'Sophia Silverio Vilemor', papel: 'Desenvolvedora & Pesquisadora' },
    { nome: 'Maria Laura Alves Ribeiro', papel: 'Desenvolvedora & Pesquisadora' },
    { nome: 'Luiza Carla dos Santos', papel: 'Desenvolvedora & Pesquisadora' },
  ];

  readonly versao = '1.0.0';

  constructor(
    private router: Router,
    private modalCtrl: ModalController
  ) {}

  voltar() {
    this.router.navigateByUrl('/tabs/tab2');
  }

  async abrirTermos() {
    const modal = await this.modalCtrl.create({
      component: TermosModalComponent,
      breakpoints: [0, 0.7, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
  }
}
