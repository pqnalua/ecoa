import { Component, OnInit } from '@angular/core';
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
    private router: Router
  ) {}

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando = true;
    this.notificacoes = await this.notificacaoService.carregarNotificacoes();
    this.carregando = false;
  }

  async marcarComoLida(n: NotificacaoItem) {
    if (!n.lida) {
      n.lida = true;
      await this.notificacaoService.marcarComoLida(n.id_notificacao);
    }
  }

  async marcarTodasComoLidas() {
    this.notificacoes.forEach((n) => (n.lida = true));
    await this.notificacaoService.marcarTodasComoLidas();
  }

  async excluir(n: NotificacaoItem, evento: Event) {
    evento.stopPropagation();
    this.notificacoes = this.notificacoes.filter(
      (item) => item.id_notificacao !== n.id_notificacao
    );
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
