import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  foto = '../../assets/icon/avatar.jpg';

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    await this.carregarPerfil();
  }

  async ionViewWillEnter() {
    await this.carregarPerfil();
  }

  async carregarPerfil() {
    const user = await this.supabaseService.getCurrentUser();
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      if (meta['avatar_url'] || meta['picture']) {
        this.foto = meta['avatar_url'] || meta['picture'];
      }
    }
  }

  goTo(route: string) {
    this.router.navigate([`/${route}`]);
  }

  async logout() {
    await this.supabaseService.signOut();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }
}