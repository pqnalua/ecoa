import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false,
})
export class SplashPage implements OnInit {
  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    setTimeout(async () => {
      try {
        const { data } = await this.supabaseService.client.auth.getSession();
        if (data?.session?.user) {
          // Usuário já está logado -> vai direto para a Home
          this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
        } else {
          // Não está logado -> vai para a tela de Login
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      } catch {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }
    }, 1800);
  }
}