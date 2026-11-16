import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AlertController } from '@ionic/angular/lazy';
import { PlanoService, Assinatura } from '../services/plano.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-planos',
  templateUrl: './planos.page.html',
  styleUrls: ['./planos.page.scss'],
  standalone: false,
})
export class PlanosPage implements OnInit, OnDestroy {
  categoriaSelecionada: 'premium' | 'vip' = 'premium';
  planoAtivo: Assinatura | null = null;
  private sub: Subscription | null = null;

  constructor(
    private planoService: PlanoService,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.sub = this.planoService.planoAtivo$.subscribe((plano) => {
      this.planoAtivo = plano;
      this.cdr.detectChanges();
    });
  }

  async ionViewWillEnter() {
    await this.planoService.carregarPlanoAtivo();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  selecionarCategoria(categoria: 'premium' | 'vip') {
    this.categoriaSelecionada = categoria;
  }

  isPlanoAtual(nomePlano: string, categoria: 'premium' | 'vip'): boolean {
    if (!this.planoAtivo) return false;
    return this.planoAtivo.nome_plano === nomePlano && this.planoAtivo.categoria === categoria;
  }

  async assinar(nomePlano: string, categoria: 'premium' | 'vip') {
    if (nomePlano === 'Plano Corporativo') {
      const alert = await this.alertCtrl.create({
        header: 'Plano Corporativo',
        message: 'O Plano Corporativo é exclusivo sob contrato para empresas parceiras. Entre em contato com a equipe comercial ECOA.',
        buttons: ['Entendido'],
      });
      await alert.present();
      return;
    }

    const sucesso = await this.planoService.assinar(nomePlano, categoria);
    if (sucesso) {
      const alert = await this.alertCtrl.create({
        header: 'Plano Ativado!',
        message: `O ${nomePlano} (${categoria.toUpperCase()}) foi ativado com sucesso! As ferramentas correspondentes já foram desbloqueadas.`,
        buttons: ['Continuar'],
      });
      await alert.present();
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Falha na Ativação',
        message: 'Não foi possível ativar o plano no momento. Tente novamente.',
        buttons: ['Ok'],
      });
      await alert.present();
    }
  }

  async cancelarAssinatura() {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar Assinatura',
      message: 'Tem certeza de que deseja cancelar sua assinatura ativa? As funções exclusivas serão bloqueadas.',
      buttons: [
        {
          text: 'Voltar',
          role: 'cancel',
        },
        {
          text: 'Confirmar Cancelamento',
          role: 'destructive',
          handler: async () => {
            await this.planoService.cancelarAssinatura();
            const alertConfirma = await this.alertCtrl.create({
              header: 'Assinatura Cancelada',
              message: 'Sua assinatura foi desativada com sucesso.',
              buttons: ['Ok'],
            });
            await alertConfirma.present();
          },
        },
      ],
    });
    await alert.present();
  }
}