import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SpeechService {
  private recognition: any = null;
  private isListening = false;

  constructor(private ngZone: NgZone) {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = false; // Parar após uma frase completa
      this.recognition.interimResults = true; // Mostrar transcrição em tempo real
      this.recognition.maxAlternatives = 1;
    }
  }

  isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  startListening(callbacks: {
    onInterim?: (text: string) => void;
    onFinal?: (text: string) => void;
    onError?: (err: any) => void;
    onEnd?: () => void;
  }): boolean {
    if (!this.isSupported()) {
      if (callbacks.onError) {
        callbacks.onError({
          error: 'not-supported',
          message: 'Seu navegador não suporta reconhecimento de voz.',
        });
      }
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    try {
      this.initSpeechRecognition();

      let finalTranscript = '';

      this.recognition.onstart = () => {
        this.ngZone.run(() => {
          this.isListening = true;
        });
      };

      this.recognition.onresult = (event: any) => {
        this.ngZone.run(() => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (interimTranscript && callbacks.onInterim) {
            callbacks.onInterim(interimTranscript);
          }

          if (finalTranscript && callbacks.onFinal) {
            callbacks.onFinal(finalTranscript);
          }
        });
      };

      this.recognition.onerror = (event: any) => {
        this.ngZone.run(() => {
          this.isListening = false;
          if (callbacks.onError) {
            callbacks.onError(event);
          }
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening = false;
          if (callbacks.onEnd) {
            callbacks.onEnd();
          }
        });
      };

      this.recognition.start();
      return true;
    } catch (e) {
      if (callbacks.onError) {
        callbacks.onError(e);
      }
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }
}
