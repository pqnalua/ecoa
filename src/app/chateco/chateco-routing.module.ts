import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChatecoPage } from './chateco.page';

const routes: Routes = [
  {
    path: '',
    component: ChatecoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatecoPageRoutingModule {}
