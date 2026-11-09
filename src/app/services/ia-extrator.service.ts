import { Injectable } from '@angular/core';

export interface DadosTransacaoVoz {
  descricao: string;
  valor: number;
  tipo: 'despesa' | 'receita';
  categoria: string;
  humor: 'alegria' | 'tristeza' | 'ansiedade' | 'tedio' | 'raiva' | null;
  natureza: 'fixo' | 'variavel' | 'extra';
}

@Injectable({
  providedIn: 'root',
})
export class IaExtratorService {
  private readonly OPENROUTER_API_KEY =
    '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';

  readonly categoriasPermitidas = [
    'Alimentação',
    'Moradia',
    'Transporte',
    'Lazer',
    'Saúde',
    'Educação',
    'Compras',
    'Salário',
    'Freelance',
    'Investimentos',
    'Presente',
    'Vendas',
    'Outros',
  ];

  async interpretarFrase(frase: string): Promise<DadosTransacaoVoz> {
    try {
      const respostaIA = await this.chamarOpenRouter(frase);
      const parsed = this.extrairJson(respostaIA);
      if (parsed) {
        return this.normalizarDados(parsed, frase);
      }
    } catch (e) {
      console.warn('Falha na extração por IA, aplicando fallback local:', e);
    }

    return this.fallbackLocal(frase);
  }

  private async chamarOpenRouter(frase: string): Promise<string> {
    const systemPrompt = `Você é um extrator de transações financeiras para o aplicativo ECOA (focado em controle de gastos e regulação de impulsos emocionais).
O usuário vai falar uma frase sobre um gasto ou ganho. Sua missão é extrair os dados e responder APENAS um objeto JSON válido, sem blocos markdown (\`\`\`json), sem textos extras.

Estrutura JSON obrigatória:
{
  "descricao": string (nome curto do item ou serviço, ex: "Almoço", "Cinema", "Salário", "Remédio", "Combustível"),
  "valor": number (número decimal positivo. Se falar por extenso ex: 'vinte e cinco reais e cinquenta centavos', converta para 25.50),
  "tipo": "despesa" ou "receita",
  "categoria": string (escolha exatamente uma destas: ${this.categoriasPermitidas.join(', ')}),
  "humor": "alegria" | "tristeza" | "ansiedade" | "tedio" | "raiva" | null (identifique se a pessoa mencionou emoção ou sentimento, ex: "fiquei feliz" -> "alegria", "estava ansiosa" -> "ansiedade", "estressado" -> "raiva", "chateada" -> "tristeza", "sem nada pra fazer" -> "tedio". Se neutro ou não citou sentimento, use null),
  "natureza": "fixo" | "variavel" | "extra" (padrão é "variavel")
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ecoa.app',
        'X-Title': 'ECOA Voice Parser',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: frase },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API OpenRouter: status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private extrairJson(texto: string): any {
    try {
      // Remove possíveis marcadores ```json ... ```
      const limpo = texto
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(limpo);
    } catch {
      // Tenta achar substring entre primeira { e última }
      const match = texto.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      return null;
    }
  }

  private normalizarDados(d: any, fraseOriginal: string): DadosTransacaoVoz {
    const valorNum = Math.abs(Number(d.valor)) || 0;
    const tipoValido = d.tipo === 'receita' ? 'receita' : 'despesa';

    let categoriaValida = this.categoriasPermitidas.find(
      (c) => c.toLowerCase() === (d.categoria || '').toString().toLowerCase()
    );
    if (!categoriaValida) {
      categoriaValida = tipoValido === 'receita' ? 'Outros' : 'Outros';
    }

    const humoresPermitidos = ['alegria', 'tristeza', 'ansiedade', 'tedio', 'raiva'];
    const humorNormalizado = humoresPermitidos.includes((d.humor || '').toString().toLowerCase())
      ? (d.humor.toLowerCase() as any)
      : null;

    const naturezasPermitidas = ['fixo', 'variavel', 'extra'];
    const naturezaNormalizada = naturezasPermitidas.includes(
      (d.natureza || '').toString().toLowerCase()
    )
      ? (d.natureza.toLowerCase() as any)
      : 'variavel';

    return {
      descricao: (d.descricao || fraseOriginal.slice(0, 40)).toString().trim(),
      valor: valorNum,
      tipo: tipoValido,
      categoria: categoriaValida,
      humor: humorNormalizado,
      natureza: naturezaNormalizada,
    };
  }

  private fallbackLocal(frase: string): DadosTransacaoVoz {
    const fLower = frase.toLowerCase();

    // Tentar extrair valor numérico
    let valor = 0;
    const matchValor = fLower.match(/(?:r\$|reais)?\s*(\d+(?:[.,]\d{1,2})?)/);
    if (matchValor) {
      valor = parseFloat(matchValor[1].replace(',', '.'));
    }

    // Tipo
    const isReceita =
      fLower.includes('recebi') ||
      fLower.includes('ganhei') ||
      fLower.includes('salário') ||
      fLower.includes('pagamento');
    const tipo: 'despesa' | 'receita' = isReceita ? 'receita' : 'despesa';

    // Categoria
    let categoria = 'Outros';
    if (fLower.includes('almoço') || fLower.includes('jantar') || fLower.includes('lanche') || fLower.includes('comida') || fLower.includes('mercado')) {
      categoria = 'Alimentação';
    } else if (fLower.includes('uber') || fLower.includes('ônibus') || fLower.includes('combustível') || fLower.includes('gasolina')) {
      categoria = 'Transporte';
    } else if (fLower.includes('remédio') || fLower.includes('farmácia') || fLower.includes('médico')) {
      categoria = 'Saúde';
    } else if (fLower.includes('cinema') || fLower.includes('festa') || fLower.includes('passeio')) {
      categoria = 'Lazer';
    } else if (isReceita && fLower.includes('salário')) {
      categoria = 'Salário';
    }

    // Humor
    let humor: any = null;
    if (fLower.includes('feliz') || fLower.includes('alegre') || fLower.includes('animad')) {
      humor = 'alegria';
    } else if (fLower.includes('triste') || fLower.includes('chatead')) {
      humor = 'tristeza';
    } else if (fLower.includes('ansios') || fLower.includes('nervos') || fLower.includes('preocupad')) {
      humor = 'ansiedade';
    } else if (fLower.includes('tédio') || fLower.includes('tediad') || fLower.includes('desanimad')) {
      humor = 'tedio';
    } else if (fLower.includes('raiva') || fLower.includes('brav') || fLower.includes('estressad')) {
      humor = 'raiva';
    }

    return {
      descricao: frase.slice(0, 35) || (isReceita ? 'Receita por voz' : 'Despesa por voz'),
      valor,
      tipo,
      categoria,
      humor,
      natureza: 'variavel',
    };
  }
}
