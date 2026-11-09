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
        const user = data?.session?.user;

        if (user) {
          // Verifica se já respondeu o questionário de perfil
          const { data: perfil } = await this.supabaseService.client
            .from('perfil_financeiro')
            .select('id_perfil')
            .eq('id_usuario', user.id)
            .maybeSingle();

          if (!perfil) {
            this.router.navigateByUrl('/questionario', { replaceUrl: true });
          } else {
            this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
          }
        } else {
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      } catch {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }
    }, 1800);
  }
}
