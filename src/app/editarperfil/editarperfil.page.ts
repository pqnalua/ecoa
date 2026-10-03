import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

function senhasIguaisValidator(grupo: AbstractControl): ValidationErrors | null {
  const novaSenha = grupo.get('novaSenha')?.value;
  const confirmar = grupo.get('confirmarSenha')?.value;

  if (!novaSenha && !confirmar) {
    return null;
  }

  return novaSenha !== confirmar ? { senhasDiferentes: true } : null;
}

function cpfOpcionalValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  const digitos = control.value.replace(/\D/g, '');
  return digitos.length === 11 ? null : { cpfInvalido: true };
}

@Component({
  selector: 'app-editarperfil',
  templateUrl: './editarperfil.page.html',
  styleUrls: ['./editarperfil.page.scss'],
  standalone: false,
})
export class EditarperfilPage implements OnInit {
  verSenha = false;
  carregando = false;
  erro = '';
  sucesso = '';
  foto = '../../assets/icon/avatar.jpg';
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    this.form = this.fb.group(
      {
        nome: ['', [Validators.required, Validators.minLength(3)]],
        email: [''],
        cpf: ['', [cpfOpcionalValidator]],
        idade: ['', [Validators.min(13), Validators.max(120)]],
        novaSenha: ['', [Validators.minLength(6)]],
        confirmarSenha: [''],
      },
      { validators: senhasIguaisValidator }
    );
  }

  async ngOnInit() {
    await this.carregarDados();
  }

  async carregarDados() {
    const user = await this.supabaseService.getCurrentUser();
    if (!user) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    const metadata = user.user_metadata || {};
    const nome = metadata['full_name'] || metadata['name'] || (user.email ? user.email.split('@')[0] : '');

    this.form.patchValue({
      nome: nome,
      email: user.email || '',
      cpf: metadata['cpf'] || '',
      idade: metadata['idade'] || '',
    });

    if (metadata['avatar_url'] || metadata['picture']) {
      this.foto = metadata['avatar_url'] || metadata['picture'];
    }
  }

  mostrarErro(campo: string): boolean {
    const c = this.form.get(campo);
    if (!c || !(c.dirty || c.touched)) {
      return false;
    }

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

  onFotoSelecionada(evento: Event) {
    const input = evento.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const leitor = new FileReader();
      leitor.onload = (e: any) => {
        this.foto = e.target.result;
      };
      leitor.readAsDataURL(input.files[0]);
    }
  }

  async salvar() {
    this.erro = '';
    this.sucesso = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando = true;
    try {
      const { nome, cpf, idade, novaSenha } = this.form.value;

      const atualizacoes: any = {
        data: {
          full_name: nome,
          name: nome,
          cpf: cpf || '',
          idade: idade || '',
          avatar_url: this.foto,
        },
      };

      if (novaSenha && novaSenha.trim().length >= 6) {
        atualizacoes.password = novaSenha.trim();
      }

      const { error } = await this.supabaseService.client.auth.updateUser(atualizacoes);

      if (error) {
        throw error;
      }

      this.sucesso = 'Perfil atualizado com sucesso!';

      setTimeout(() => {
        this.router.navigateByUrl('/tabs/tab2');
      }, 1200);
    } catch (e: any) {
      this.erro = e?.message || 'Não foi possível atualizar o perfil. Tente novamente.';
    } finally {
      this.carregando = false;
    }
  }
}