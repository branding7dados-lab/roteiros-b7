# Brand System — Roteiros B7

Onde cada arquivo oficial da marca é usado dentro do sistema. Se um dia alguém
precisar trocar uma peça, siga esta tabela para não quebrar a consistência.

**Nenhuma logo foi redesenhada, recriada em SVG/CSS ou alterada.** Os arquivos
enviados são a fonte oficial; o que existe no projeto são apenas recortes na
área visível e redimensionamentos para web. Os originais, sem nenhuma alteração,
estão em `assets/brand/originais/`.

---

## Arquivos

```
assets/brand/
├── logo-color.png        lockup completo colorido  (símbolo + "Branding7")
├── logo-white.png        lockup completo branco
├── symbol-color.png      símbolo colorido isolado (a lâmpada)
├── symbol-white.png      símbolo branco isolado
└── originais/            os quatro arquivos exatamente como recebidos
```

## Onde cada versão é aplicada

| Lugar | Arquivo | Por quê |
|---|---|---|
| Sidebar (fundo escuro) | `logo-white.png` | fundo `#0B0A1E`; a versão colorida perderia o "Branding7", que é azul-marinho |
| Sidebar recolhida | `symbol-white.png` | espaço de 74px: só o símbolo, ainda legível |
| Hero "Central de Produção" | `symbol-color.png` | elemento gráfico sobre o painel escuro, com o gradiente da marca à mostra |
| Card institucional | `logo-white.png` | mesmo fundo escuro do hero |
| Tela de configuração | `logo-color.png` | fundo claro |
| Ficha A4 — cabeçalho | `symbol-color.png` | impresso sobre branco; o símbolo colorido reproduz bem e ocupa pouco |
| Ficha A4 — página de abertura | `logo-white.png` | a abertura é preta; lockup completo porque há espaço |
| Favicon | `assets/icons/favicon.png` | símbolo colorido com fundo transparente, lê bem em aba clara ou escura |
| PWA (192 e 512) | `assets/icons/icon-*.png` | símbolo colorido centralizado sobre `#0B0A1E` |

Nenhuma logo recebe sombra, glow, distorção ou recorte. Sobre fundo escuro entra
a versão branca; sobre fundo claro, a colorida. Sem exceções.

## Logos de clientes

Não confundir com a marca B7. As logos dos clientes ficam no Supabase Storage
(bucket `client-logos`, caminho `client_id/timestamp-nome.ext`) e aparecem no
lugar do avatar de iniciais no dashboard, na lista de clientes, nas gravações, na
busca, na paleta e na ficha A4.

Regras de aplicação: `object-fit: contain` sempre, superfície branca neutra com
borda leve e padding interno, sem corte, sem distorção, sem filtro, sem
recoloração e sem gradiente B7 por cima. Na ficha A4 a logo do cliente entra
pequena ao lado do nome — a identidade do documento continua sendo a B7, no
cabeçalho e no rodapé. Cliente sem logo cai nas iniciais, e nenhuma tela fica
com espaço vazio ou imagem quebrada.

## Cores

Extraídas dos próprios arquivos da marca:

| Token | Valor | Uso |
|---|---|---|
| `--marinho` | `#001559` | cor do "Branding7" e dos pontos do símbolo |
| `--violeta` | `#3A1E86` | início do gradiente |
| `--roxo` | `#7C1E85` | meio do gradiente, ícones e links |
| `--magenta` | `#C21C83` | ação principal, destaques, numeração |
| `--grad-curto` | `120deg, #3A1E86 → #7C1E85 → #C21C83` | botão principal, avatares, barras de destaque |
| `--grad` | `118deg, #001559 → #3A1E86 → #7C1E85 → #C21C83` | faixa da folha A4 e blocos de gancho |

Neutros: fundo `#F6F5FA`, cards `#FFFFFF`, bordas `#EAE7F2`, texto `#15122B`,
secundário `#3B3557`, terciário `#6F688C`.

Status: rascunho neutro/violeta, pronto âmbar, gravado verde — todos em versão
dessaturada, para não competir com a marca.

**Proporção:** a cor da marca aparece em pontos de ação (botão principal, avatar,
ícone ativo, destaques), nunca como fundo de tela inteira. O sistema é
majoritariamente neutro; o roxo/magenta é o acento.

## Tipografia

Os arquivos enviados não trazem fontes, então seguimos as do projeto:

- **Archivo** (700/800/900) — títulos, números, etiquetas, gancho e CTA da ficha
- **Inter** (400/500/600/700) — interface e corpo de texto

Ambas embutidas em `assets/fonts/`, sem depender de CDN.

## Iconografia

Ícones desenhados em SVG inline, todos lineares, `stroke-width: 1.8`, cantos
arredondados. Não há emoji na interface. Ao adicionar um ícone novo, mantenha a
mesma espessura e o mesmo estilo de traço.
