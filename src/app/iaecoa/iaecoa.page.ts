import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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

  private readonly OPENROUTER_API_KEY = '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';

  mensagens: Mensagem[] = [
    {
      texto: 'Olá! Sou a sua IA especialista em finanças pessoais do ECOA. Como posso te ajudar a organizar seu dinheiro hoje?',
      remetente: 'ia',
      data: new Date()
    }
  ];

  sugestoes: string[] = [
    'Como economizar no mercado?',
    'Dicas para organizar gastos fixos',
    'Como montar uma reserva de emergência?'
  ];

  // Injetamos o ChangeDetectorRef para corrigir o problema de clique na tela
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {}

  async enviarMensagem() {
    if (!this.novaMensagem.trim() || this.carregando) return;

    const textoUsuario = this.novaMensagem;

    this.mensagens.push({
      texto: textoUsuario,
      remetente: 'usuario',
      data: new Date()
    });

    this.novaMensagem = '';
    this.cdr.detectChanges(); // Atualiza a tela imediatamente
    this.rolarParaFim();
    this.carregando = true;

    try {
      const respostaIA = await this.chamarOpenRouter();
      
      this.mensagens.push({
        texto: respostaIA,
        remetente: 'ia',
        data: new Date()
      });
    } catch (error) {
      console.error('Erro na API:', error);
      this.mensagens.push({
        texto: 'Desculpe, tive um problema ao processar sua dúvida. Tente novamente em alguns instantes.',
        remetente: 'ia',
        data: new Date()
      });
    } finally {
      this.carregando = false;
      this.cdr.detectChanges(); // Garante que o indicador de carregamento soma e a resposta apareça sem clicar na tela
      this.rolarParaFim();
    }
  }

  enviarSugestao(texto: string) {
    this.novaMensagem = texto;
    this.enviarMensagem();
  }

  private async chamarOpenRouter(): Promise<string> {
    const history = this.mensagens.map(msg => ({
      role: msg.remetente === 'usuario' ? 'user' : 'assistant',
      content: msg.texto
    }));

    const systemMessage = {
      role: 'system',
      content: `Você é o assistente virtual do aplicativo ECOA IA, um especialista em finanças pessoais. Responda de forma curta, amigável, prática e sem termos excessivamente técnicos.`
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ecoa.app',
        'X-Title': 'ECOA IA'
      },
      body: JSON.stringify({
        // 'openrouter/free' escolhe automaticamente um modelo 100% gratuito disponível no momento
        model: 'openrouter/free', 
        messages: [systemMessage, ...history]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Detalhes do erro do OpenRouter:', errData);
      throw new Error(errData.error?.message || 'Falha ao comunicar com a API');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Não consegui gerar uma resposta.';
  }

  private rolarParaFim() {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }
}