import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(private fb: FormBuilder, private router: Router) {}

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
      const { email, senha } = this.form.value;
      // TODO: trocar pelo login real (ex.: Supabase Auth)
      // const { error } = await this.auth.signInWithPassword({ email, password: senha });
      // if (error) throw error;
      await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    } catch {
      this.erro = 'Email ou senha incorretos. Confira e tente de novo.';
    } finally {
      this.carregando = false;
    }
  }

  async entrarComGoogle() {
    this.erro = '';
    this.carregando = true;
    try {
      // TODO: login com Google (ex.: Supabase Auth com provider 'google')
      await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    } catch {
      this.erro = 'Não foi possível entrar com o Google. Tente novamente.';
    } finally {
      this.carregando = false;
    }
  }
}