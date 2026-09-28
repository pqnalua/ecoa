import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { IaecoaPage } from './iaecoa.page';

const routes: Routes = [
  {
    path: '',
    component: IaecoaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IaecoaPageRoutingModule {}