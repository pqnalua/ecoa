import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IntegracaoPage } from './integracao.page';

const routes: Routes = [
  {
    path: '',
    component: IntegracaoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IntegracaoPageRoutingModule {}
