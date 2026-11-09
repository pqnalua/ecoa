import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, AlertController } from '@ionic/angular/lazy';
import { SupabaseService } from '../services/supabase.service';
import { TermosModalComponent } from '../components/termos-modal/termos-modal.component';

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
    private cdr: ChangeDetectorRef,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
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
    if (route === 'atividades') {
      this.router.navigateByUrl('/tabs/tab3');
      return;
    }
    this.router.navigateByUrl(`/${route}`);
  }

  async abrirTermos() {
    const modal = await this.modalCtrl.create({
      component: TermosModalComponent,
      breakpoints: [0, 0.7, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
  }

  async confirmarExclusaoConta() {
    const alert = await this.alertCtrl.create({
      header: 'Excluir Conta',
      subHeader: 'Ação irreversível (Direito LGPD)',
      message:
        'Tem certeza que deseja excluir sua conta no ECOA? Seus dados serão anonimizados e encerrados em conformidade com as diretrizes da LGPD.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Sim, excluir',
          role: 'destructive',
          handler: async () => {
            await this.executarExclusaoConta();
          },
        },
      ],
    });

    await alert.present();
  }

  private async executarExclusaoConta() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user?.id) {
        const agora = new Date().toISOString();

        // 1. Marca usuário como deletado (soft delete)
        await this.supabaseService.client
          .from('usuario')
          .update({ deletado_em: agora })
          .eq('id_usuario', user.id);

        // 2. Marca contas bancárias e movimentações como deletadas
        await this.supabaseService.client
          .from('conta_bancaria')
          .update({ deletado_em: agora })
          .eq('id_usuario', user.id);

        await this.supabaseService.client
          .from('movimentacao')
          .update({ deletado_em: agora })
          .eq('id_usuario', user.id);

        await this.supabaseService.client
          .from('meta')
          .update({ deletado_em: agora })
          .eq('id_usuario', user.id);
      }

      await this.supabaseService.signOut();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (e: any) {
      console.error('Erro ao excluir conta:', e);
      alert('Erro ao excluir conta. Tente novamente mais tarde.');
    }
  }

  async logout() {
    await this.supabaseService.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
