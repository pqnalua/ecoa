import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { ComandoVozModalComponent } from './comando-voz-modal.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [ComandoVozModalComponent],
  exports: [ComandoVozModalComponent],
})
export class ComandoVozModalModule {}
