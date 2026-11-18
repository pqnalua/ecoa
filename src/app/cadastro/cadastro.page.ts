import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
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
    private modalCtrl: ModalController,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
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
    this.cdr.detectChanges();

    try {
      const email = (this.form.value.email || '').trim().toLowerCase();
      const senha = this.form.value.senha || '';
      const cpfLimpo = (this.form.value.cpf || '').replace(/\D/g, '');
      const idadeNum = Number(this.form.value.idade);

      const { data, error } = await this.supabaseService.client.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            cpf: cpfLimpo,
            idade: idadeNum,
            aceitou_termos_em: new Date().toISOString(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        this.supabaseService.client.from('usuario').upsert({
          id_usuario: data.user.id,
          nome: email.split('@')[0],
          email: email,
          cpf: cpfLimpo,
          idade: idadeNum,
          atualizado_em: new Date().toISOString(),
        }).then();
      }

      const rotaDestino = data?.session ? '/questionario' : '/login';

      this.ngZone.run(() => {
        this.router.navigateByUrl(rotaDestino, { replaceUrl: true });
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        this.erro = e?.message || 'Não foi possível criar sua conta. Confira os dados e tente de novo.';
        this.carregando = false;
        this.cdr.detectChanges();
      });
    }
  }
}