import type { SimulationMode, ConsultingConfig, SocialConfig, ResearchConfig, FashionConfig } from '@/types'

export interface SimTemplate {
  id: string
  mode: SimulationMode
  label: string
  desc: string
  emoji: string
  consultingConfig?: Partial<ConsultingConfig>
  socialConfig?: Partial<SocialConfig>
  researchConfig?: Partial<ResearchConfig>
  fashionConfig?: Partial<FashionConfig>
}

export const TEMPLATES: SimTemplate[] = [
  // ─── Consulting ──────────────────────────────────────────────────────────────
  {
    id: 'c-expand-market',
    mode: 'consulting',
    label: 'Expansão para novo mercado',
    desc: 'Devemos entrar num novo país ou região agora?',
    emoji: '🌍',
    consultingConfig: {
      goal: 'decide',
      industry: 'E-commerce',
      problem: 'Nossa startup atingiu R$10M de ARR no mercado doméstico e está avaliando expansão internacional. O time é de 45 pessoas e temos 18 meses de runway.',
      optionA: 'Expansão para o mercado latino-americano (México e Colombia) nos próximos 6 meses',
      optionB: 'Consolidar posição no Brasil por mais 12 meses antes de qualquer expansão',
      optionC: 'Adquirir um player regional já estabelecido em vez de crescer organicamente',
      constraints: 'Budget máximo de R$3M para expansão. Regulação financeira varia por país.',
    },
  },
  {
    id: 'c-ai-adoption',
    mode: 'consulting',
    label: 'Adoção de IA na empresa',
    desc: 'Como e onde implementar IA nos processos internos',
    emoji: '🤖',
    consultingConfig: {
      goal: 'debate',
      industry: 'Tecnologia',
      problem: 'Nossa empresa de 200 pessoas está sob pressão para adotar IA generativa nos processos. Alguns departamentos já usam ferramentas não-homologadas. Precisamos de uma estratégia clara: onde implementar, como governar, e como equilibrar produtividade com riscos de compliance e segurança de dados.',
      constraints: 'Setor financeiro, regulação LGPD e BACEN, dados sensíveis de clientes.',
    },
  },
  {
    id: 'c-pricing',
    mode: 'consulting',
    label: 'Revisão de pricing',
    desc: 'Aumentar preços sem perder clientes',
    emoji: '💰',
    consultingConfig: {
      goal: 'debate',
      industry: 'SaaS',
      problem: 'Nosso SaaS não reajusta preços há 3 anos. Com inflação acumulada de 25% e custos de infraestrutura subindo, a margem está comprimida. Queremos reajustar preços em 30–40% para novos contratos e comunicar aumento progressivo para base atual. Temos NPS de 72 e churn mensal de 1.8%.',
    },
  },

  // ─── Social ──────────────────────────────────────────────────────────────────
  {
    id: 's-ai-feature',
    mode: 'social',
    label: 'Lançamento de feature de IA',
    desc: 'Nova funcionalidade de IA — como o público vai reagir?',
    emoji: '✨',
    socialConfig: {
      goal: 'launch',
      platform: 'LinkedIn',
      content: 'Lançamos hoje o SmartReply: nossa IA que analisa o contexto do seu email e sugere respostas completas com um clique. Opt-in, grátis para todos os planos. Treinada apenas em dados anônimos. Disponível agora no app.',
      targetDemo: 'Profissionais de tecnologia e marketing, 25-45 anos',
      campaignObjective: 'awareness',
    },
  },
  {
    id: 's-price-increase',
    mode: 'social',
    label: 'Comunicação de aumento de preço',
    desc: 'Como o público reage a reajuste de preços?',
    emoji: '📢',
    socialConfig: {
      goal: 'launch',
      platform: 'Twitter/X',
      content: 'A partir de 1º de março, nossos planos terão um reajuste de 35% para cobrir os investimentos em infraestrutura e novos recursos lançados este ano. Clientes atuais têm 60 dias para fazer lock-in no preço atual.',
      targetDemo: 'Usuários atuais do produto, PMEs',
      campaignObjective: 'engagement',
    },
  },
  {
    id: 's-crisis-data',
    mode: 'social',
    label: 'Crise: vazamento de dados',
    desc: 'Simule a reação pública e estratégia de resposta',
    emoji: '🚨',
    socialConfig: {
      goal: 'crisis',
      platform: 'Twitter/X',
      content: 'Identificamos acesso não autorizado a dados de 150.000 usuários. E-mails e nomes foram expostos. Senhas e dados financeiros NÃO foram afetados. Já corrigimos a vulnerabilidade e notificamos os afetados por email. Vamos publicar relatório completo em 72h.',
      targetDemo: 'Usuários da plataforma, imprensa tech, reguladores',
      campaignObjective: 'awareness',
    },
  },

  // ─── Research ─────────────────────────────────────────────────────────────────
  {
    id: 'r-churn',
    mode: 'research',
    label: 'Análise de churn',
    desc: 'Por que usuários estão cancelando?',
    emoji: '📉',
    researchConfig: {
      goal: 'synthesize',
      question: 'Quais são os principais drivers de churn nos primeiros 90 dias?',
      domain: 'Marketing',
      audience: 'executive',
      dataContext: 'Analisamos 1.800 cancelamentos do último trimestre. 62% ocorreram antes do dia 30. As respostas da pesquisa de saída apontam: 38% "não entendeu como usar", 29% "preço não justificado", 18% "falta de integração com outras ferramentas", 15% "outros". O tutorial tem 9 etapas e taxa de conclusão de 28%. Suporte recebeu 340 tickets de onboarding.',
    },
  },
  {
    id: 'r-remote-work',
    mode: 'research',
    label: 'Hipótese: trabalho remoto reduz produtividade',
    desc: 'Valide ou refute esta afirmação com os agentes',
    emoji: '🏠',
    researchConfig: {
      goal: 'validate',
      question: 'Trabalho 100% remoto reduz a produtividade de times de produto em comparação com modelo híbrido',
      domain: 'RH',
      audience: 'executive',
      dataContext: 'Nossa pesquisa interna com 180 funcionários mostrou: times remotos entregam 12% mais story points/sprint, mas relatam 23% mais dificuldade em decisões que exigem alinhamento. Times híbridos têm NPS interno 15pts maior. Turnover: remoto 18%/ano vs híbrido 11%/ano. 3 estudos externos revisados: 2 indicam neutralidade, 1 indica queda de 15% em trabalho criativo.',
    },
  },

  // ─── Fashion ─────────────────────────────────────────────────────────────────
  {
    id: 'f-marvel-renner',
    mode: 'fashion',
    label: 'Marvel × Renner',
    desc: 'Avalie uma coleção licenciada Marvel para Renner',
    emoji: '🦸',
    fashionConfig: {
      goal: 'evaluate',
      collectionType: 'licensed',
      licensedBrand: 'Marvel (Vingadores)',
      collectionName: 'Coleção Herois Renner Verão 26',
      retailer: 'Renner',
      targetAge: '8–16 anos',
      targetGender: 'Masculino',
      season: 'Verão 2026',
      priceRange: 'Acessível (R$80–150)',
      styleNotes: 'Camisetas estampadas com personagens Homem-Aranha, Capitão América e Hulk. Paleta primária (vermelho, azul, verde). Tecido 100% algodão. Proposta: linha casual/streetwear juvenil com 24 SKUs.',
    },
  },
  {
    id: 'f-stitch-declining',
    mode: 'fashion',
    label: '🧵 Stitch perdendo força — qual substituto?',
    desc: 'Estampa do Stitch caindo nas vendas — descubra o próximo licenciado',
    emoji: '👽',
    fashionConfig: {
      goal: 'discover_license',
      retailer: 'Renner',
      targetAge: '12–25 anos',
      targetGender: 'Feminino',
      season: 'Verão 2026',
      priceRange: 'Acessível (R$80–150)',
      decliningItem: 'Stitch (Disney)',
      decliningReason: 'Sell-through caiu de 78% para 38% nos últimos 2 ciclos. Estoque acumulado de aproximadamente 6.000 peças. O personagem teve pico de relevância entre 2022–2023 impulsionado por TikTok, mas o hype caiu. Consumidora de 15–22 anos migrou para novos trends. Preço médio da peça: R$89. Concorrente já está com preço 15% abaixo no mesmo IP.',
      styleNotes: 'Preciso de um licenciado com forte apelo feminino jovem (12–25 anos). Não posso usar IPs Marvel/Star Wars (contrato exclusivo com concorrente). Prefiro algo que tenha virabilidade no TikTok e Instagram. Budget de licença: até R$250k/ano. Não quero personagens infantis (abaixo de 10 anos).',
    },
  },
  {
    id: 'f-sonic-declining',
    mode: 'fashion',
    label: 'Sonic está perdendo força',
    desc: 'Descubra qual licenciado substituir Sonic',
    emoji: '🎮',
    fashionConfig: {
      goal: 'discover_license',
      retailer: 'Riachuelo',
      targetAge: '6–12 anos',
      targetGender: 'Masculino',
      season: 'Inverno 2026',
      priceRange: 'Acessível (R$80–150)',
      decliningItem: 'Sonic the Hedgehog',
      decliningReason: 'Sell-through caiu de 82% para 41% nos últimos 2 ciclos. Estoque acumulado de 8.000 peças. Pesquisa aponta que o personagem está perdendo relevância para a faixa 8-12 anos. Concorrente já lançou Sonic com preço 20% menor.',
      styleNotes: 'Preciso de IP com forte recall masculino infantil. Não posso usar IPs Disney (contrato com concorrente). Budget de licença: até R$200k/ano.',
    },
  },
]

export const TEMPLATES_BY_MODE: Record<SimulationMode, SimTemplate[]> = {
  consulting: TEMPLATES.filter((t) => t.mode === 'consulting'),
  social:     TEMPLATES.filter((t) => t.mode === 'social'),
  research:   TEMPLATES.filter((t) => t.mode === 'research'),
  fashion:    TEMPLATES.filter((t) => t.mode === 'fashion'),
}
