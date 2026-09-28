import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { HttpClientModule } from '@angular/common/http';

import { IaecoaPageRoutingModule } from './iaecoa-routing.module';
import { IaecoaPage } from './iaecoa.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HttpClientModule,
    IaecoaPageRoutingModule
  ],
  declarations: [IaecoaPage]
})
export class IaecoaPageModule {}