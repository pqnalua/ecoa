import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import { SupabaseService } from '../services/supabase.service';
import { TermosModalComponent } from '../components/termos-modal/termos-modal.component';

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
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController
  ) {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        cpf: ['', [Validators.required, cpfValidator]],
        idade: ['', [Validators.required, Validators.min(18), Validators.max(120)]],
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', [Validators.required]],
        aceitouTermos: [false, [Validators.requiredTrue]],
      },
      { validators: senhasIguaisValidator }
    );
  }

  mostrarErro(campo: 'email' | 'cpf' | 'idade' | 'senha' | 'confirmarSenha' | 'aceitouTermos'): boolean {
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

  async abrirTermos(evento?: Event) {
    if (evento) {
      evento.preventDefault();
      evento.stopPropagation();
    }
    const modal = await this.modalCtrl.create({
      component: TermosModalComponent,
      breakpoints: [0, 0.7, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
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

      const { data, error } = await this.supabaseService.client.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            cpf,
            idade: Number(idade),
            aceitou_termos_em: new Date().toISOString(),
          },
        },
      });

      if (error) {
        throw error;
      }

      // Sincroniza também na tabela public.usuario se o usuário foi retornado
      if (data?.user) {
        try {
          await this.supabaseService.client.from('usuario').upsert({
            id_usuario: data.user.id,
            nome: email.split('@')[0],
            email: email,
            cpf: cpf.replace(/\D/g, ''),
            idade: Number(idade),
            atualizado_em: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('Registro na tabela usuario será concluído posteriormente:', dbErr);
        }
      }

      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (e: any) {
      this.erro = e?.message || 'Não foi possível criar sua conta. Confira os dados e tente de novo.';
    } finally {
      this.carregando = false;
    }
  }
}
