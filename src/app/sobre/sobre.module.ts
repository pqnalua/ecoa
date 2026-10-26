import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';

import { SobrePageRoutingModule } from './sobre-routing.module';
import { SobrePage } from './sobre.page';
import { TermosModalModule } from '../components/termos-modal/termos-modal.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SobrePageRoutingModule,
    TermosModalModule
  ],
  declarations: [SobrePage]
})
export class SobrePageModule {}
