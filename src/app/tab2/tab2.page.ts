import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular/lazy';
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
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
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
    if (route === 'sobre') {
      this.router.navigateByUrl('/sobre');
      return;
    }
    if (route === 'preferencias' || route === 'metas') {
      this.router.navigateByUrl('/tabs/tab4');
      return;
    }
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
      subHeader: 'Direito à Eliminação de Dados (LGPD Art. 18)',
      message: 'Tem certeza de que deseja excluir permanentemente sua conta? Todas as suas movimentações, metas, dados de humor e perfil financeiro serão apagados. Esta ação não poderá ser desfeita.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Excluir definitivamente',
          role: 'destructive',
          handler: () => {
            this.excluirConta();
          },
        },
      ],
    });

    await alert.present();
  }

  async excluirConta() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user?.id) {
        // Eliminação dos dados vinculados ao usuário
        await Promise.allSettled([
          this.supabaseService.client.from('humor_financeiro').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('movimentacao').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('meta').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('orcamento').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('notificacao').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('conta_bancaria').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('perfil_financeiro').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('categoria').delete().eq('id_usuario', user.id),
          this.supabaseService.client.from('usuario').delete().eq('id_usuario', user.id),
        ]);
      }

      await this.supabaseService.signOut();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (e) {
      console.error('Erro ao excluir conta:', e);
      await this.supabaseService.signOut();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  async logout() {
    await this.supabaseService.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
