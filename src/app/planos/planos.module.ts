import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { PlanosPageRoutingModule } from './planos-routing.module';

import { PlanosPage } from './planos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PlanosPageRoutingModule
  ],
  declarations: [PlanosPage]
})
export class PlanosPageModule {}
