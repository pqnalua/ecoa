import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular/lazy';
import { NotificacoesModalComponent } from './notificacoes-modal.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [NotificacoesModalComponent],
  exports: [NotificacoesModalComponent],
})
export class NotificacoesModalModule {}
