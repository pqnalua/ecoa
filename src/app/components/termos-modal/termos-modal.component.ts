import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular/lazy';

@Component({
  selector: 'app-termos-modal',
  templateUrl: './termos-modal.component.html',
  styleUrls: ['./termos-modal.component.scss'],
  standalone: false,
})
export class TermosModalComponent {
  constructor(private modalCtrl: ModalController) {}

  fechar() {
    this.modalCtrl.dismiss();
  }
}
