import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';

interface Mensagem {
  texto: string;
  remetente: 'usuario' | 'ia';
  data: Date;
}

@Component({
  selector: 'app-iaecoa',
  templateUrl: './iaecoa.page.html',
  styleUrls: ['./iaecoa.page.scss'],
  standalone: false
})
export class IaecoaPage implements OnInit {
  @ViewChild('content', { static: false }) content!: IonContent;

  novaMensagem: string = '';
  carregando: boolean = false;

  mensagens: Mensagem[] = [
    {
      texto: 'Olá! Sou a sua IA financeira do ECOA. Como posso te ajudar hoje?',
      remetente: 'ia',
      data: new Date()
    }
  ];

  sugestoes: string[] = [
    'Como economizar no mercado?',
    'Dicas para organizar gastos fixos',
    'Como montar uma reserva de emergência?'
  ];

  constructor() {}

  ngOnInit() {}

  enviarMensagem() {
    if (!this.novaMensagem.trim()) return;

    const textoUsuario = this.novaMensagem;
    
    // Adiciona mensagem do usuário
    this.mensagens.push({
      texto: textoUsuario,
      remetente: 'usuario',
      data: new Date()
    });

    this.novaMensagem = '';
    this.rolarParaFim();
    this.carregando = true;

    // Simulação da resposta da IA (substituir pela tua API/Backend)
    setTimeout(() => {
      this.gerarRespostaIA(textoUsuario);
      this.carregando = false;
      this.rolarParaFim();
    }, 1200);
  }

  enviarSugestao(texto: string) {
    this.novaMensagem = texto;
    this.enviarMensagem();
  }

  private gerarRespostaIA(pergunta: string) {
    let resposta = 'Para essa dúvida, recomendo categorizar seus gastos no aplicativo para identificar onde é possível cortar exageros!';

    const p = pergunta.toLowerCase();
    if (p.includes('mercado')) {
      resposta = 'Dica para o mercado: faça sempre uma lista antes de sair de casa e nunca vá às compras com fome!';
    } else if (p.includes('fixo') || p.includes('resumo')) {
      resposta = 'Seus gastos fixos não devem ultrapassar 50% da sua renda total. Revise assinaturas e serviços que pouco utiliza.';
    } else if (p.includes('reserva')) {
      resposta = 'Uma boa reserva de emergência deve cobrir de 3 a 6 meses do seu custo de vida básico.';
    }

    this.mensagens.push({
      texto: resposta,
      remetente: 'ia',
      data: new Date()
    });
  }

  private rolarParaFim() {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }
}