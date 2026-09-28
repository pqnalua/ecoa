import { Component } from '@angular/core';
import { TransacaoService } from '../services/transacao';

@Component({
  selector: 'app-chateco',
  templateUrl: './chateco.page.html',
  styleUrls: ['./chateco.page.scss'],
})
export class ChatecoPage {

  carregando: boolean = false;

  constructor(private transacaoService: TransacaoService) {}

  // Função chamada quando a gravação de áudio for concluída (retornando o áudio em Base64)
  enviarAudioApi(audioBase64: string) {
    this.carregando = true;

    this.transacaoService.enviarAudio(audioBase64).subscribe({
      next: (resposta) => {
        this.carregando = false;
        console.log('Transação registada no Supabase:', resposta.transacao);
        alert(`Sucesso! Gasto: R$ ${resposta.transacao.valor} | Categoria: ${resposta.transacao.categoria} | Emoção: ${resposta.transacao.emocao}`);
      },
      error: (erro) => {
        this.carregando = false;
        console.error('Erro ao processar áudio:', erro);
        alert('Ocorreu um erro ao processar o áudio no servidor.');
      }
    });
  }
}