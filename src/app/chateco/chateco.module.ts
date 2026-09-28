import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { ChatecoPageRoutingModule } from './chateco-routing.module';

import { ChatecoPage } from './chateco.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatecoPageRoutingModule
  ],
  declarations: [ChatecoPage]
})
export class ChatecoPageModule {}
