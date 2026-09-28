import { Component } from '@angular/core';
import { Router } from '@angular/router';

type TipoConsumidor = 'consumista' | 'endividado' | 'controlado';

interface OpcaoPasso {
  texto: string;
  valor: string; // nas perguntas de diagnóstico, é o TipoConsumidor
}

interface PassoBase {
  id: string;
  secao: 'Sobre você' | 'Diagnóstico';
  texto: string;
  dica?: string;
  pontua?: boolean; // true = conta para a classificação
  mostrarSe?: (respostas: Record<string, string>) => boolean;
}

interface PassoOpcoes extends PassoBase {
  tipo: 'opcoes';
  opcoes: OpcaoPasso[];
}

interface PassoDia extends PassoBase {
  tipo: 'dia';
}

type Passo = PassoOpcoes | PassoDia;

interface Resultado {
  tipo: TipoConsumidor;
  titulo: string;
  emoji: string;
  descricao: string;
}

const RESULTADOS: Record<TipoConsumidor, Resultado> = {
  consumista: {
    tipo: 'consumista',
    titulo: 'Consumista',
    emoji: '🛍️',
    descricao:
      'Você costuma comprar por impulso, principalmente quando está com pressa ou emoção forte. Vamos te ajudar a perceber esses momentos antes de gastar.',
  },
  endividado: {
    tipo: 'endividado',
    titulo: 'Endividado',
    emoji: '📉',
    descricao:
      'Suas contas costumam pesar mais do que o orçamento permite. Vamos priorizar um panorama claro das suas dívidas para você recuperar o controle aos poucos.',
  },
  controlado: {
    tipo: 'controlado',
    titulo: 'Controlado',
    emoji: '🌱',
    descricao:
      'Você já tem boas noções sobre seus gastos e costuma planejar antes de comprar. Vamos te ajudar a manter esse equilíbrio e alcançar suas metas mais rápido.',
  },
};

@Component({
  selector: 'app-questionario',
  templateUrl: './questionario.page.html',
  styleUrls: ['./questionario.page.scss'],
  standalone: false,
})
export class QuestionarioPage {
  private todosPassos: Passo[] = [
    // ---------- Sobre você (não classificam) ----------
    {
      id: 'diaPagamento',
      secao: 'Sobre você',
      tipo: 'dia',
      texto: 'Que dia do mês você costuma receber?',
      dica: 'Usamos isso para organizar o seu ciclo financeiro.',
    },
    {
      id: 'renda',
      secao: 'Sobre você',
      tipo: 'opcoes',
      texto: 'Qual é, aproximadamente, a sua renda mensal?',
      opcoes: [
        { texto: 'Até R$ 1.500', valor: 'ate-1500' },
        { texto: 'De R$ 1.500 a R$ 3.000', valor: '1500-3000' },
        { texto: 'De R$ 3.000 a R$ 6.000', valor: '3000-6000' },
        { texto: 'Acima de R$ 6.000', valor: 'acima-6000' },
        { texto: 'Prefiro não informar', valor: 'nao-informado' },
      ],
    },
    {
      id: 'sustentaAlguem',
      secao: 'Sobre você',
      tipo: 'opcoes',
      texto: 'Você sustenta alguém da família?',
      opcoes: [
        { texto: 'Sim', valor: 'sim' },
        { texto: 'Não', valor: 'nao' },
      ],
    },
    {
      id: 'qtdDependentes',
      secao: 'Sobre você',
      tipo: 'opcoes',
      texto: 'Quantas pessoas dependem de você?',
      mostrarSe: (r) => r['sustentaAlguem'] === 'sim',
      opcoes: [
        { texto: '1 pessoa', valor: '1' },
        { texto: '2 pessoas', valor: '2' },
        { texto: '3 ou mais', valor: '3+' },
      ],
    },
    {
      id: 'moradia',
      secao: 'Sobre você',
      tipo: 'opcoes',
      texto: 'Como é a sua moradia hoje?',
      opcoes: [
        { texto: 'Pago aluguel', valor: 'aluguel' },
        { texto: 'Pago financiamento', valor: 'financiamento' },
        { texto: 'Casa própria quitada', valor: 'propria' },
        { texto: 'Moro com familiares', valor: 'familiares' },
      ],
    },
    {
      id: 'objetivo',
      secao: 'Sobre você',
      tipo: 'opcoes',
      texto: 'Qual é o seu principal objetivo com o ECOA?',
      opcoes: [
        { texto: 'Sair das dívidas', valor: 'sair-dividas' },
        { texto: 'Guardar dinheiro', valor: 'guardar' },
        { texto: 'Controlar gastos por impulso', valor: 'controlar-impulso' },
        { texto: 'Realizar um sonho (viagem, carro...)', valor: 'sonho' },
      ],
    },

    // ---------- Diagnóstico (classificam) ----------
    {
      id: 'd1',
      secao: 'Diagnóstico',
      tipo: 'opcoes',
      pontua: true,
      texto: 'Quando você vê algo que gosta em uma loja ou rede social, o que costuma fazer?',
      opcoes: [
        { texto: 'Compro na hora, sem pensar muito', valor: 'consumista' },
        { texto: 'Fico com vontade, mas às vezes não tenho como pagar', valor: 'endividado' },
        { texto: 'Penso se cabe no orçamento antes de decidir', valor: 'controlado' },
      ],
    },
    {
      id: 'd2',
      secao: 'Diagnóstico',
      tipo: 'opcoes',
      pontua: true,
      texto: 'Como está a situação das suas contas e cartões hoje?',
      opcoes: [
        { texto: 'Em dia, sem parcelas pendentes', valor: 'controlado' },
        { texto: 'Tenho algumas dívidas ou parcelas em aberto', valor: 'endividado' },
        { texto: 'Não costumo acompanhar de perto', valor: 'consumista' },
      ],
    },
    {
      id: 'd3',
      secao: 'Diagnóstico',
      tipo: 'opcoes',
      pontua: true,
      texto: 'Com que frequência você faz compras que não estavam planejadas?',
      opcoes: [
        { texto: 'Quase todo dia ou toda semana', valor: 'consumista' },
        { texto: 'De vez em quando, mas me preocupo depois', valor: 'endividado' },
        { texto: 'Raramente, costumo planejar antes', valor: 'controlado' },
      ],
    },
    {
      id: 'd4',
      secao: 'Diagnóstico',
      tipo: 'opcoes',
      pontua: true,
      texto: 'Você sabe, com certa precisão, quanto gastou este mês?',
      opcoes: [
        { texto: 'Tenho uma ideia bem clara', valor: 'controlado' },
        { texto: 'Tenho uma ideia, mas os números sempre me surpreendem', valor: 'endividado' },
        { texto: 'Não costumo acompanhar', valor: 'consumista' },
      ],
    },
    {
      id: 'd5',
      secao: 'Diagnóstico',
      tipo: 'opcoes',
      pontua: true,
      texto: 'Como você se sente em relação ao seu dinheiro no fim do mês?',
      opcoes: [
        { texto: 'Ansioso, geralmente falta antes de acabar o mês', valor: 'endividado' },
        { texto: 'Tranquilo, costuma sobrar ou fechar como planejado', valor: 'controlado' },
        { texto: 'Surpreso, não sei bem para onde foi', valor: 'consumista' },
      ],
    },
  ];

  respostas: Record<string, string> = {};
  indiceAtual = 0;
  resultado: Resultado | null = null;
  diaDigitado: number | null = null;

  constructor(private router: Router) {}

  // Só os passos que devem aparecer (respeita mostrarSe)
  get passos(): Passo[] {
    return this.todosPassos.filter((p) => !p.mostrarSe || p.mostrarSe(this.respostas));
  }

  get passoAtual(): Passo {
    return this.passos[this.indiceAtual];
  }

  get progresso(): number {
    return (this.indiceAtual / this.passos.length) * 100;
  }

  get diaValido(): boolean {
    const d = this.diaDigitado;
    return d !== null && Number.isInteger(d) && d >= 1 && d <= 31;
  }

  responderOpcao(valor: string) {
    this.respostas[this.passoAtual.id] = valor;
    this.avancar();
  }

  confirmarDia() {
    if (!this.diaValido) return;
    this.respostas[this.passoAtual.id] = String(this.diaDigitado);
    this.avancar();
  }

  semDiaFixo() {
    this.respostas[this.passoAtual.id] = 'variavel';
    this.avancar();
  }

  voltarPergunta() {
    if (this.indiceAtual > 0) {
      this.indiceAtual--;
      this.prepararPasso();
    }
  }

  private avancar() {
    if (this.indiceAtual < this.passos.length - 1) {
      this.indiceAtual++;
      this.prepararPasso();
    } else {
      this.finalizar();
    }
  }

  // Preenche o campo de dia se a pessoa voltar para essa pergunta
  private prepararPasso() {
    const resposta = this.respostas[this.passoAtual.id];
    this.diaDigitado =
      this.passoAtual.tipo === 'dia' && resposta && resposta !== 'variavel' ? Number(resposta) : null;
  }

  private finalizar() {
    // Classificação: conta só as perguntas de diagnóstico
    const contagem: Record<TipoConsumidor, number> = {
      consumista: 0,
      endividado: 0,
      controlado: 0,
    };

    for (const passo of this.passos.filter((p) => p.pontua)) {
      const tipo = this.respostas[passo.id] as TipoConsumidor;
      if (tipo in contagem) contagem[tipo]++;
    }

    const vencedor = (Object.keys(contagem) as TipoConsumidor[]).reduce((a, b) =>
      contagem[a] >= contagem[b] ? a : b
    );
    this.resultado = RESULTADOS[vencedor];

    // Perfil básico: só as perguntas "Sobre você" que realmente apareceram
    const perfilBasico: Record<string, string> = {};
    for (const passo of this.passos.filter((p) => p.secao === 'Sobre você')) {
      perfilBasico[passo.id] = this.respostas[passo.id];
    }

    // TODO: salvar no perfil do usuário (ex.: Supabase)
    // - this.resultado.tipo  -> tipo de consumidor
    // - perfilBasico         -> diaPagamento, renda, sustentaAlguem, qtdDependentes, moradia, objetivo
  }

  refazer() {
    this.respostas = {};
    this.indiceAtual = 0;
    this.resultado = null;
    this.diaDigitado = null;
  }

  concluir() {
    this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
  }
}