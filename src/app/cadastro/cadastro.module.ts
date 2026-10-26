import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';

import { CadastroPageRoutingModule } from './cadastro-routing.module';
import { CadastroPage } from './cadastro.page';
import { TermosModalModule } from '../components/termos-modal/termos-modal.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    CadastroPageRoutingModule,
    TermosModalModule
  ],
  declarations: [CadastroPage]
})
export class CadastroPageModule {}
