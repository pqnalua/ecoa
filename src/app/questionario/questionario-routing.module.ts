import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { QuestionarioPage } from './questionario.page';

const routes: Routes = [
  {
    path: '',
    component: QuestionarioPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QuestionarioPageRoutingModule {}