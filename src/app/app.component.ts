import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    // Garante que qualquer resquício do modo escuro seja limpo
    document.body.classList.remove('dark');
    document.documentElement.classList.remove('ion-palette-dark');
    localStorage.removeItem('ecoa-theme');
  }
}
