🛡️ DisasterShield Dashboard
============================

Dashboard de monitoramento e visualização de dados e estatísticas relacionadas a desastres ambientais, como enchentes e incêndios. Mostra alertas em tempo real com gráficos, mapas interativos e análise de risco por região.

🔧 Requisitos
-------------

Para rodar esse projeto corretamente, é necessário ter a API backend rodando primeiro.

🔗 A API está disponível em:\
👉 <https://github.com/correialeo/SCED.API>

A API já possui um `README.md` explicando como configurar e rodá-la localmente.

> ⚠️ Importante: Garanta que a API esteja acessível via HTTP, e não HTTPS, (ex: `http://localhost:5046`) para evitar problemas com CORS ou HTTPS durante o desenvolvimento.

* * * * *

▶️ Como Rodar o Projeto
-----------------------

### 1\. Clonar o repositório

```bash
git clone https://github.com/correialeo/disaster-shield-dashboard.git
cd disaster-shield-dashboard
```

### 2\. Instalar as dependências

```bash
npm install
```

### 3\. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O dashboard ficará disponível em [http://localhost:3000](http://localhost:3000/)

* * * * *

📊 Funcionalidades Principais
-----------------------------

-   Dados em tempo real: Atualização automática dos alertas.
-   Filtros avançados: Data, localização e raio de busca.
-   Gráficos interativos: Barras, linhas e pizza com estatísticas de alertas e sensores.
-   Mapa dinâmico: Visualização de pontos de risco com marcadores coloridos.
-   Painel de estatísticas: Número total de alertas, dispositivos ativos, abrigos e recursos.

* * * * *

⚙️ Configurações de Tempo Real
------------------------------

Você pode controlar a atualização automática diretamente na interface:

-   Habilitar/desabilitar modo tempo real
-   Selecionar intervalo de atualização (10s, 30s, 1m, etc)
-   Visualizar data/hora da última atualização e contagem regressiva até a próxima
