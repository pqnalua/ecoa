import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { EditarperfilPageRoutingModule } from './editarperfil-routing.module';
import { EditarperfilPage } from './editarperfil.page';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    EditarperfilPageRoutingModule
  ],
  declarations: [EditarperfilPage]
})
export class EditarperfilPageModule {}