import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ModalController } from '@ionic/angular/lazy';
import { Router } from '@angular/router';
import { NotificacaoService, NotificacaoItem } from '../../services/notificacao.service';

@Component({
  selector: 'app-notificacoes-modal',
  templateUrl: './notificacoes-modal.component.html',
  styleUrls: ['./notificacoes-modal.component.scss'],
  standalone: false,
})
export class NotificacoesModalComponent implements OnInit {
  notificacoes: NotificacaoItem[] = [];
  carregando = true;

  constructor(
    private modalCtrl: ModalController,
    private notificacaoService: NotificacaoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando = true;
    this.cdr.detectChanges();

    // Trava de segurança para nunca travar na tela de carregamento
    const timer = setTimeout(() => {
      if (this.carregando) {
        this.carregando = false;
        this.cdr.detectChanges();
      }
    }, 4000);

    try {
      this.notificacoes = await this.notificacaoService.carregarNotificacoes();
    } catch (e) {
      console.warn('Erro ao carregar notificações no modal:', e);
      this.notificacoes = [];
    } finally {
      clearTimeout(timer);
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

  async marcarComoLida(n: NotificacaoItem) {
    if (!n.lida) {
      n.lida = true;
      this.cdr.detectChanges();
      await this.notificacaoService.marcarComoLida(n.id_notificacao);
    }
  }

  async marcarTodasComoLidas() {
    this.notificacoes.forEach((n) => (n.lida = true));
    this.cdr.detectChanges();
    await this.notificacaoService.marcarTodasComoLidas();
  }

  async excluir(n: NotificacaoItem, evento: Event) {
    evento.stopPropagation();
    this.notificacoes = this.notificacoes.filter(
      (item) => item.id_notificacao !== n.id_notificacao
    );
    this.cdr.detectChanges();
    await this.notificacaoService.excluirNotificacao(n.id_notificacao);
  }

  clicarNotificacao(n: NotificacaoItem) {
    this.marcarComoLida(n);
    if (n.link) {
      this.modalCtrl.dismiss();
      this.router.navigateByUrl(n.link);
    }
  }

  getIcone(tipo: string): string {
    switch (tipo) {
      case 'orcamento':
        return 'alert-circle';
      case 'meta':
        return 'trophy';
      case 'emocional':
        return 'heart';
      default:
        return 'notifications';
    }
  }

  formatarData(iso: string): string {
    if (!iso) return '';
    try {
      const data = new Date(iso);
      const hoje = new Date();
      const mesmoDia =
        data.getDate() === hoje.getDate() &&
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear();

      const hora = data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (mesmoDia) {
        return `Hoje às ${hora}`;
      }
      return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
    } catch {
      return '';
    }
  }

  fechar() {
    this.modalCtrl.dismiss();
  }
}
