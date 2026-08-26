export type Playbook = {
  id: string
  label: string
  prompt: string
}

/** Briefings prontos — 1 clique no MissionComposer */
export const PLAYBOOKS: Playbook[] = [
  {
    id: "ad-soda",
    label: "Anúncio refrigerante",
    prompt:
      "Crie um design de publicidade de refrigerante laranja estilo verão: garrafa em destaque, pessoa sorridente em traje esportivo vermelho e azul (herói original, sem marcas protegidas), fundo vibrante, texto curto de campanha.",
  },
  {
    id: "landing-saas",
    label: "Landing SaaS",
    prompt:
      "Escreva a estrutura e o copy de uma landing page para um SaaS B2B de produtividade: headline, subheadline, 3 benefícios, prova social curta, CTA e FAQ com 4 perguntas.",
  },
  {
    id: "social-post",
    label: "Post redes",
    prompt:
      "Crie 3 opções de post para Instagram/LinkedIn promovendo um app de finanças pessoais: gancho na primeira linha, corpo curto, hashtags e sugestão de visual (sem gerar imagem ainda).",
  },
  {
    id: "code-review",
    label: "Code review",
    prompt:
      "Faça um code review do seguinte pedido: revise um endpoint de autenticação JWT em TypeScript/Next.js — checklist de segurança, edge cases, e 5 melhorias concretas com prioridade.",
  },
  {
    id: "visual-brief",
    label: "Brief visual",
    prompt:
      "Monte um brief de design para um banner de e-commerce de fones bluetooth: público, mensagem, composição, paleta, restrições (sem logos de marcas famosas) e prompt pronto para gerar a imagem.",
  },
]
