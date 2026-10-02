import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  verSenha = false;
  carregando = false;
  erro = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  mostrarErro(campo: 'email' | 'senha'): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  async entrar() {
    this.erro = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando = true;
    try {
      const email = this.form.value.email || '';
      const password = this.form.value.senha || '';

      const { error } = await this.supabaseService.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    } catch (e: any) {
      this.erro = e?.message || 'Email ou senha incorretos. Confira e tente de novo.';
    } finally {
      this.carregando = false;
    }
  }

  async entrarComGoogle() {
    this.erro = '';
    this.carregando = true;
    try {
      const { error } = await this.supabaseService.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (e: any) {
      this.erro = e?.message || 'Não foi possível entrar com o Google. Tente novamente.';
    } finally {
      this.carregando = false;
    }
  }
}