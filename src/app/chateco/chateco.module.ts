import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { HttpClientModule } from '@angular/common/http';

import { ChatecoPageRoutingModule } from './chateco-routing.module';
import { ChatecoPage } from './chateco.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HttpClientModule,
    ChatecoPageRoutingModule
  ],
  declarations: [ChatecoPage]
})
export class ChatecoPageModule {}