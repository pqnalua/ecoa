import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  verSenha = false;
  carregando = false;
  erro = '';
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private supabaseService: SupabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    this.supabaseService.client.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        await this.abrirModalNovaSenha();
      }
    });
  }

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

      const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const userId = data?.user?.id;
      if (userId) {
        const { data: perfil } = await this.supabaseService.client
          .from('perfil_financeiro')
          .select('id_perfil')
          .eq('id_usuario', userId)
          .maybeSingle();

        if (!perfil) {
          this.ngZone.run(() => {
            this.router.navigateByUrl('/questionario', { replaceUrl: true });
          });
          return;
        }
      }

      this.ngZone.run(() => {
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
      });
    } catch (e: any) {
      this.erro = e?.message || 'Email ou senha incorretos. Confira e tente de novo.';
    } finally {
      this.ngZone.run(() => {
        this.carregando = false;
        this.cdr.detectChanges();
      });
    }
  }

  async entrarComGoogle() {
    this.erro = '';
    this.carregando = true;
    try {
      const { error } = await this.supabaseService.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/tabs/tab1`,
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

  async esqueciSenha() {
    const alert = await this.alertCtrl.create({
      header: 'Recuperar senha',
      message: 'Digite o e-mail cadastrado para receber o link de redefinição:',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'voce@email.com',
          value: this.form.get('email')?.value || '',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Enviar link',
          handler: async (dados) => {
            const email = (dados.email || '').trim();
            if (!email) {
              await this.mostrarToast('Por favor, informe seu e-mail.', 'warning');
              return false;
            }
            await this.enviarRecuperacao(email);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async enviarRecuperacao(email: string) {
    try {
      const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      await this.mostrarToast('E-mail de recuperação enviado com sucesso!', 'success');
    } catch (e: any) {
      await this.mostrarToast(e?.message || 'Erro ao enviar e-mail de recuperação.', 'danger');
    }
  }

  async abrirModalNovaSenha() {
    const alert = await this.alertCtrl.create({
      header: 'Nova Senha',
      message: 'Digite sua nova senha (mínimo de 6 caracteres):',
      backdropDismiss: false,
      inputs: [
        {
          name: 'novaSenha',
          type: 'password',
          placeholder: 'Nova senha',
        },
      ],
      buttons: [
        {
          text: 'Salvar nova senha',
          handler: async (dados) => {
            const novaSenha = (dados.novaSenha || '').trim();
            if (novaSenha.length < 6) {
              await this.mostrarToast('A senha precisa ter no mínimo 6 caracteres.', 'warning');
              return false;
            }
            try {
              const { error } = await this.supabaseService.client.auth.updateUser({
                password: novaSenha,
              });
              if (error) throw error;
              await this.mostrarToast('Senha atualizada com sucesso! Você já pode entrar.', 'success');
              return true;
            } catch (e: any) {
              await this.mostrarToast(e?.message || 'Erro ao redefinir senha.', 'danger');
              return false;
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async mostrarToast(mensagem: string, cor: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message: mensagem,
      duration: 3500,
      position: 'top',
      color: cor,
    });
    await toast.present();
  }
}