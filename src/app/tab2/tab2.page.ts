import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.carregarPerfil();
  }

  async ionViewWillEnter() {
    await this.carregarPerfil();
  }

  async carregarPerfil() {
    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    let user: any = sessionData?.session?.user;

    if (!user) {
      user = await this.supabaseService.getCurrentUser();
    }

    if (user?.user_metadata) {
      const meta = user.user_metadata;
      if (meta['avatar_url'] || meta['picture']) {
        this.foto = meta['avatar_url'] || meta['picture'];
        this.cdr.detectChanges();
      }
    }
  }

  goTo(route: string) {
    if (route === 'editar-perfil' || route === 'editarperfil') {
      this.router.navigateByUrl('/editarperfil');
      return;
    }
    if (route === 'pagamentos' || route === 'integracao') {
      this.router.navigateByUrl('/integracao');
      return;
    }
    this.router.navigateByUrl(`/${route}`);
  }

  async logout() {
    await this.supabaseService.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}