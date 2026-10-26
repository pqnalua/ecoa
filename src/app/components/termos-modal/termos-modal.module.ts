import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular/lazy';
import { TermosModalComponent } from './termos-modal.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [TermosModalComponent],
  exports: [TermosModalComponent],
})
export class TermosModalModule {}
