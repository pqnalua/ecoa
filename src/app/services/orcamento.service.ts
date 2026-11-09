import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificacaoService } from './notificacao.service';

export interface OrcamentoMensal {
  id_orcamento?: string;
  id_usuario?: string;
  id_categoria?: string | null;
  mes: number;
  ano: number;
  valor_planejado: number;
  valor_gasto: number;
  alerta_percentual: number;
  percentualConsumido: number;
  statusAlerta: 'normal' | 'atencao' | 'estourado';
}

@Injectable({
  providedIn: 'root',
})
export class OrcamentoService {
  constructor(
    private supabase: SupabaseService,
    private notificacaoService: NotificacaoService
  ) {}

  async carregarOrcamentoMes(mes: number, ano: number): Promise<OrcamentoMensal | null> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) return null;

      // 1. Busca se existe orçamento cadastrado para o mês/ano geral (id_categoria null ou primeiro)
      const { data, error } = await this.supabase.client
        .from('orcamento')
        .select('*')
        .eq('id_usuario', user.id)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Erro ao carregar orçamento:', error.message);
      }

      // 2. Calcula os gastos reais da tabela movimentacao deste mês
      const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const proxMes = mes === 12 ? 1 : mes + 1;
      const proxAno = mes === 12 ? ano + 1 : ano;
      const fim = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`;

      const { data: movimentacoes } = await this.supabase.client
        .from('movimentacao')
        .select('valor')
        .eq('id_usuario', user.id)
        .eq('tipo', 'despesa')
        .is('deletado_em', null)
        .gte('data_transacao', inicio)
        .lt('data_transacao', fim);

      const totalGastoReal = (movimentacoes || []).reduce(
        (acc: number, m: any) => acc + (Number(m.valor) || 0),
        0
      );

      if (!data) {
        // Não existe orçamento criado ainda para este mês
        return {
          mes,
          ano,
          valor_planejado: 0,
          valor_gasto: totalGastoReal,
          alerta_percentual: 80,
          percentualConsumido: 0,
          statusAlerta: 'normal',
        };
      }

      // Atualiza o valor_gasto no banco se tiver divergência
      if (Number(data.valor_gasto) !== totalGastoReal) {
        await this.supabase.client
          .from('orcamento')
          .update({
            valor_gasto: totalGastoReal,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id_orcamento', data.id_orcamento);
      }

      const planejado = Number(data.valor_planejado) || 0;
      const alertaPerc = Number(data.alerta_percentual) || 80;
      const percConsumido =
        planejado > 0 ? Math.round((totalGastoReal / planejado) * 100) : 0;

      let statusAlerta: 'normal' | 'atencao' | 'estourado' = 'normal';
      if (planejado > 0) {
        if (percConsumido >= 100) {
          statusAlerta = 'estourado';
          // Dispara notificação de estouro de orçamento
          await this.notificacaoService.criarNotificacao({
            titulo: 'Orçamento estourado! 🚨',
            mensagem: `Você atingiu ${percConsumido}% do orçamento estipulado para este mês (R$ ${totalGastoReal.toFixed(2)} de R$ ${planejado.toFixed(2)}).`,
            tipo: 'orcamento',
            link: '/tabs/tab3',
          });
        } else if (percConsumido >= alertaPerc) {
          statusAlerta = 'atencao';
          // Dispara notificação de alerta (80%)
          await this.notificacaoService.criarNotificacao({
            titulo: 'Alerta de Orçamento (80%) ⚠️',
            mensagem: `Você consumiu ${percConsumido}% do seu limite de gastos planejado para este mês. Fique atento aos impulsos!`,
            tipo: 'orcamento',
            link: '/tabs/tab3',
          });
        }
      }

      return {
        id_orcamento: data.id_orcamento,
        id_usuario: data.id_usuario,
        id_categoria: data.id_categoria,
        mes: data.mes,
        ano: data.ano,
        valor_planejado: planejado,
        valor_gasto: totalGastoReal,
        alerta_percentual: alertaPerc,
        percentualConsumido: percConsumido,
        statusAlerta,
      };
    } catch (e) {
      console.warn('Erro ao processar orçamento mensal:', e);
      return null;
    }
  }

  async salvarOrcamento(mes: number, ano: number, valorPlanejado: number, alertaPercentual: number = 80): Promise<boolean> {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) return false;

      // Busca se já existe para fazer update ou insert
      const { data: existente } = await this.supabase.client
        .from('orcamento')
        .select('id_orcamento')
        .eq('id_usuario', user.id)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();

      if (existente) {
        const { error } = await this.supabase.client
          .from('orcamento')
          .update({
            valor_planejado: valorPlanejado,
            alerta_percentual: alertaPercentual,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id_orcamento', existente.id_orcamento);

        return !error;
      } else {
        const { error } = await this.supabase.client.from('orcamento').insert({
          id_usuario: user.id,
          mes,
          ano,
          valor_planejado: valorPlanejado,
          valor_gasto: 0,
          alerta_percentual: alertaPercentual,
        });

        return !error;
      }
    } catch {
      return false;
    }
  }
}
