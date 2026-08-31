import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonAvatar,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonAvatar,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
  ],
})
export class Tab2Page implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {}

  goTo(route: string) {
    this.router.navigate([`/${route}`]);
  }

  logout() {
    console.log('Usuário deslogado');
    this.router.navigate(['/login']);
  }

}