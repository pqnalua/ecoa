import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransacaoService {

  // Endereço da API Backend
  private apiUrl = 'http://localhost:3000/api/processar-audio';

  constructor(private http: HttpClient) { }

  // Função para enviar o áudio em Base64 para o servidor
  enviarAudio(audioBase64: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { audioBase64 });
  }
}