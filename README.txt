# Galeria de Fotos por SKU — Conecta

Site estático pronto para deploy na Vercel/Netlify.

## Publicar na Vercel
1) Crie um repositório no GitHub (ex.: `conecta-galeria-sku`).
2) Envie estes arquivos: `index.html`, `app.js`, `items.js`, `items.json`, `README.txt`.
3) Na Vercel: **Add New → Project → Import Git Repository**.
4) Em Project Settings, use **Framework Preset = Other**, **Build Command = None**, **Output Directory = /**.
5) Deploy e pronto.

## Uso
- O site já carrega os SKUs de `items.json` (extraído da sua planilha atual).
- Você pode atualizar a base subindo uma nova planilha pelo próprio site.
- Anexe fotos por SKU, exporte backup (JSON) ou ZIP com fotos + manifest.
