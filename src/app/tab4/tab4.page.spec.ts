import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tab4Page, Meta } from './tab4.page';
import { SupabaseService } from '../services/supabase.service';
import { NotificacaoService } from '../services/notificacao.service';

// Data local no formato yyyy-mm-dd, a N dias de hoje
function emDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

describe('Tab4Page', () => {
  let component: Tab4Page;
  let fixture: ComponentFixture<Tab4Page>;

  const supabaseMock = {
    client: {
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
    getCurrentUser: () => Promise.resolve(null),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Tab4Page],
      imports: [FormsModule],
      providers: [
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: NotificacaoService, useValue: { criarNotificacao: () => {} } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab4Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve separar as metas em categorias corretamente', () => {
    component.metas = [
      { nome: 'Meta 1', valor_alvo: 1000, data_fim: '2026-12-31', concluida: false, favorita: false },
      { nome: 'Meta 2', valor_alvo: 500, data_fim: '2026-06-01', concluida: false, favorita: true },
      { nome: 'Meta 3', valor_alvo: 200, data_fim: '2026-01-01', concluida: true, favorita: false },
    ];

    expect(component.metasFavoritas.length).toBe(1);
    expect(component.metasOutras.length).toBe(1);
    expect(component.metasConcluidas.length).toBe(1);
  });

  describe('calcularDiasRestantes', () => {
    it('data futura não está expirada', () => {
      const r = component.calcularDiasRestantes(emDias(5));
      expect(r.texto).toBe('5 dias');
      expect(r.expirado).toBe(false);
    });

    it('hoje vence hoje', () => {
      expect(component.calcularDiasRestantes(emDias(0)).texto).toBe('Vence hoje');
    });

    it('data passada fica atrasada', () => {
      const r = component.calcularDiasRestantes(emDias(-3));
      expect(r.texto).toBe('Atrasado 3d');
      expect(r.expirado).toBe(true);
    });

    it('sem data devolve vazio', () => {
      expect(component.calcularDiasRestantes(undefined)).toEqual({ texto: '', expirado: false });
    });
  });

  describe('statusMeta', () => {
    it('atrasada é late, perto do prazo é warn, longe é ok', () => {
      expect(component.statusMeta({ nome: 'a', data_fim: emDias(-1) })).toBe('late');
      expect(component.statusMeta({ nome: 'b', data_fim: emDias(3) })).toBe('warn');
      expect(component.statusMeta({ nome: 'c', data_fim: emDias(60) })).toBe('ok');
      expect(component.statusMeta({ nome: 'd' })).toBe('ok');
    });
  });

  describe('sugestaoMensal', () => {
    it('divide o que falta pelos meses restantes', () => {
      const meta: Meta = { nome: 'Viagem', valor_alvo: 1200, valor_atual: 0, data_fim: emDias(60) };
      const texto = component.sugestaoMensal(meta) || '';
      expect(texto).toContain('600,00');
      expect(texto).toContain('por mês');
    });

    it('não sugere nada sem data, concluída ou já alcançada', () => {
      expect(component.sugestaoMensal({ nome: 'a', valor_alvo: 100 })).toBeNull();
      expect(
        component.sugestaoMensal({ nome: 'b', valor_alvo: 100, data_fim: emDias(60), concluida: true })
      ).toBeNull();
      expect(
        component.sugestaoMensal({ nome: 'c', valor_alvo: 100, valor_atual: 100, data_fim: emDias(60) })
      ).toBeNull();
    });

    it('avisa quando o prazo já passou', () => {
      const texto =
        component.sugestaoMensal({ nome: 'd', valor_alvo: 100, valor_atual: 40, data_fim: emDias(-2) }) || '';
      expect(texto).toContain('60,00');
      expect(texto).toContain('prazo já passou');
    });
  });

  describe('resumo', () => {
    it('soma o guardado e conta ativas, atrasadas e concluídas', () => {
      component.metas = [
        { nome: 'A', valor_alvo: 1000, valor_atual: 250, progresso: 25, data_fim: emDias(-5) },
        { nome: 'B', valor_alvo: 500, valor_atual: 100, progresso: 20, data_fim: emDias(30) },
        { nome: 'C', valor_alvo: 200, valor_atual: 200, progresso: 100, concluida: true },
      ];

      expect(component.resumo.totalGuardado).toBe(550);
      expect(component.resumo.ativas).toBe(2);
      expect(component.resumo.atrasadas).toBe(1);
      expect(component.resumo.concluidas).toBe(1);
    });
  });

  describe('insightGastos', () => {
    it('compara o gasto emocional com o que falta na meta', () => {
      (component as any).gastosEmocionais = { total: 100, humor: 'ansiedade', valorHumor: 80 };
      component.metas = [{ nome: 'Viagem', valor_alvo: 1000, valor_atual: 0, favorita: true }];

      expect(component.insightGastos).not.toBeNull();
      expect(component.insightGastos!.total).toBe(100);
      expect(component.insightGastos!.texto).toContain('10%');
      expect(component.insightGastos!.texto).toContain('ansiedade');
    });

    it('não mostra nada sem metas ativas', () => {
      (component as any).gastosEmocionais = { total: 100, humor: null, valorHumor: 0 };
      component.metas = [];
      expect(component.insightGastos).toBeNull();
    });
  });

  describe('marco', () => {
    it('devolve o texto de cada faixa de progresso', () => {
      expect(component.marco({ nome: 'a', progresso: 10 })).toBe('');
      expect(component.marco({ nome: 'a', progresso: 30 })).toBe('Bom começo');
      expect(component.marco({ nome: 'a', progresso: 60 })).toBe('Metade do caminho');
      expect(component.marco({ nome: 'a', progresso: 90 })).toBe('Quase lá!');
    });
  });

  describe('formatação', () => {
    it('formata data yyyy-mm-dd para dd/mm/yyyy', () => {
      expect(component.formatarData('2026-12-31')).toBe('31/12/2026');
    });

    it('formata moeda em pt-BR', () => {
      expect(component.formatarMoeda(1234.5)).toBe('1.234,50');
      expect(component.formatarMoeda(undefined)).toBe('0,00');
    });
  });
});