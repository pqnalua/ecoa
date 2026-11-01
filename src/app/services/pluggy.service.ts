import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PluggyService {
  private clientId = 'b8d1593b-63ca-4a21-bac2-bb04bbf82db0';
  private clientSecret = '0lY4B0-_1izJ2NC2gyio8VlIZG0cTuqV9GWpt1T2ctM';
  private baseUrl = 'https://api.pluggy.ai';

  async validarCredenciais(usuario: string, senha: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return usuario.trim().length > 0 && senha.trim().length > 0;
  }
}