import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { IntegracaoPageRoutingModule } from './integracao-routing.module';
import { IntegracaoPage } from './integracao.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IntegracaoPageRoutingModule
  ],
  declarations: [IntegracaoPage]
})
export class IntegracaoPageModule {}