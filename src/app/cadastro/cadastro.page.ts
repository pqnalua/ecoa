import { Component } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

function senhasIguaisValidator(grupo: AbstractControl): ValidationErrors | null {
  const senha = grupo.get('senha')?.value;
  const confirmar = grupo.get('confirmarSenha')?.value;
  return senha && confirmar && senha !== confirmar ? { senhasDiferentes: true } : null;
}

function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const digitos = (control.value || '').replace(/\D/g, '');
  return digitos.length === 11 ? null : { cpfInvalido: true };
}

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  standalone: false,
})
export class CadastroPage {
  verSenha = false;
  carregando = false;
  erro = '';

  form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', [Validators.required, cpfValidator]],
      idade: ['', [Validators.required, Validators.min(13), Validators.max(120)]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', [Validators.required]],
    },
    { validators: senhasIguaisValidator }
  );

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  mostrarErro(campo: 'email' | 'cpf' | 'idade' | 'senha' | 'confirmarSenha'): boolean {
    const c = this.form.get(campo);
    if (!c || !(c.dirty || c.touched)) return false;

    if (campo === 'confirmarSenha') {
      return c.invalid || !!this.form.errors?.['senhasDiferentes'];
    }
    return c.invalid;
  }

  formatarCpf(evento: Event) {
    const input = evento.target as HTMLInputElement;
    let digitos = input.value.replace(/\D/g, '').slice(0, 11);

    let formatado = digitos;
    if (digitos.length > 9) {
      formatado = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
    } else if (digitos.length > 6) {
      formatado = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    } else if (digitos.length > 3) {
      formatado = `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    }

    this.form.get('cpf')?.setValue(formatado, { emitEvent: false });
  }

  async cadastrar() {
    this.erro = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando = true;
    try {
      const email = this.form.value.email || '';
      const senha = this.form.value.senha || '';
      const cpf = this.form.value.cpf || '';
      const idade = this.form.value.idade || '';

      const { error } = await this.supabaseService.client.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            cpf,
            idade,
          },
        },
      });

      if (error) {
        throw error;
      }

      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (e: any) {
      this.erro = e?.message || 'Não foi possível criar sua conta. Confira os dados e tente de novo.';
    } finally {
      this.carregando = false;
    }
  }
}