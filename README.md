# Ops Control Center

**Central de gerenciamento e acompanhamento de rotinas operacionais**

O Ops Control Center é uma aplicação web local desenvolvida em Python para centralizar rotinas operacionais, acompanhar verificações periódicas e registrar o tempo dedicado a cada atividade.

O objetivo é facilitar o controle das atividades diárias, oferecendo uma visão organizada das rotinas, acompanhamento de execuções em andamento e histórico das atividades realizadas.

A aplicação foi desenvolvida com FastAPI, HTML, CSS e JavaScript, utilizando arquivos locais para armazenar as configurações e os registros de execução.

---

## 1. Funcionalidades

### Dashboard operacional
- Visualização das categorias e rotinas cadastradas.
- Indicadores de rotinas cadastradas.
- Quantidade de atividades concluídas no dia.
- Tempo total monitorado no dia.
- Identificação de tarefas em andamento.

### Gerenciamento de rotinas
- Organização das atividades por categorias.
- Exibição da descrição de cada rotina.
- Exibição dos horários programados.
- Acesso direto aos sistemas e páginas relacionados às atividades.
- Inicialização de uma rotina diretamente pelo painel.

### Controle de execução
- Início e finalização de atividades.
- Cronômetro atualizado em tempo real.
- Registro automático do horário de início.
- Cálculo automático da duração da atividade.
- Identificação de execuções concluídas e em andamento.

### Histórico de atividades
- Armazenamento das execuções em arquivo CSV.
- Registro de início, término e duração.
- Identificação da rotina e categoria executadas.
- Visualização das últimas execuções no dashboard.
- Compatibilidade com Excel para análise dos registros.

### Atualização automática
- Atualização dos dados do painel a cada 30 segundos.
- Atualização do cronômetro a cada segundo.
- Persistência dos registros no backend, independentemente de atualização ou fechamento da página.

---

## 2. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Python | Linguagem principal |
| FastAPI | Backend e disponibilização da API |
| Uvicorn | Servidor da aplicação |
| HTML5 | Estrutura da interface |
| CSS3 | Estilização e layout |
| JavaScript | Interatividade e atualização dinâmica |
| JSON | Configuração das categorias e rotinas |
| CSV | Armazenamento do histórico de execuções |

---

## 3. Estrutura do projeto

```text
Ops Control Center/
│
├── app.py
├── requirements.txt
├── iniciar_ops_control_center.bat
│
├── config/
│   └── rotinas.json
│
├── data/
│   ├── execucoes.csv
│   └── execucoes.json
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       └── dashboard.js
│
└── templates/
    └── index.html
```

### Descrição dos arquivos

**`app.py`**
- Inicialização da aplicação FastAPI.
- Disponibilização das rotas da API.
- Leitura da configuração das rotinas.
- Controle de início e finalização das atividades.
- Gerenciamento do histórico de execuções.

**`config/rotinas.json`**
- Cadastro das categorias.
- Cadastro das rotinas.
- Definição dos horários e frequência.
- Configuração dos links externos.
- Ativação ou desativação das rotinas.

**`data/execucoes.csv`**
- Armazena o histórico das atividades realizadas.
- Mantém os registros de início e término.
- Armazena a duração calculada de cada execução.

**`data/execucoes.json`**
- Arquivo utilizado pela versão anterior do projeto.
- Pode ser utilizado como origem para a migração automática do histórico para CSV, caso o CSV ainda não exista.

**`static/css/style.css`**
- Estilos visuais do dashboard.
- Layout, cores, componentes, cartões e tabelas.

**`static/js/dashboard.js`**
- Atualização dinâmica da interface.
- Controle do cronômetro.
- Comunicação com a API.
- Renderização das categorias, rotinas e histórico.

**`templates/index.html`**
- Estrutura HTML principal da aplicação.

---

## 4. Requisitos

- Python 3.10 ou superior.
- Acesso ao terminal na pasta do projeto.
- Navegador atualizado (Google Chrome recomendado).
- Permissão de leitura e escrita na pasta do projeto.

---

## 5. Instalação

### 5.1. Criar ambiente virtual

Na pasta raiz do projeto, execute:

```bash
python -m venv .venv
```

### 5.2. Ativar o ambiente virtual

**Windows:**

```bat
.venv\Scripts\activate
```

**Linux/macOS:**

```bash
source .venv/bin/activate
```

### 5.3. Instalar dependências

```bash
pip install -r requirements.txt
```

---

## 6. Executar a aplicação

Com o ambiente virtual ativado, execute:

```bash
uvicorn app:app --reload
```

A aplicação ficará disponível em:

http://127.0.0.1:8000

Para encerrar o servidor, utilize `CTRL + C` no terminal.

### Execução pelo Windows

O projeto também possui o arquivo:

`iniciar_ops_control_center.bat`

Ele pode ser utilizado para facilitar a inicialização da aplicação no Windows, conforme as configurações definidas no próprio script.

---

## 7. Configuração das rotinas

O cadastro das categorias e atividades é realizado pelo arquivo:

`config/rotinas.json`

Cada categoria pode conter diversas rotinas.

### Exemplo de configuração

```json
{
  "categorias": [
    {
      "id": "controle",
      "nome": "Controle",
      "descricao": "Governança e acompanhamento dos processos.",
      "icone": "shield-check",
      "rotinas": [
        {
          "id": "data_quality",
          "nome": "Data Quality",
          "descricao": "Verificar alertas e atualizações das tabelas.",
          "url": "https://exemplo.com/data-quality",
          "frequencia": "diaria",
          "horarios": [
            "08:00",
            "10:00",
            "12:00"
          ],
          "ativo": true
        }
      ]
    }
  ]
}
```

### Campos disponíveis

| Campo | Descrição |
|---|---|
| `id` | Identificador único da categoria ou rotina |
| `nome` | Nome exibido no painel |
| `descricao` | Descrição da categoria ou atividade |
| `icone` | Identificador visual da categoria |
| `url` | Endereço do sistema relacionado à rotina |
| `frequencia` | Frequência programada da atividade |
| `horarios` | Lista de horários previstos |
| `ativo` | Define se a rotina será exibida no painel |

### Regras de configuração

- Cada rotina deve possuir um `id` único.
- Os horários devem utilizar o formato `HH:MM`.
- O campo `horarios` deve ser uma lista, mesmo quando existir apenas um horário.
- Utilize URLs válidas com protocolo `https://` ou `http://`.
- Rotinas com `ativo: false` não são exibidas na listagem principal.
- Para adicionar uma nova rotina, inclua o objeto dentro da lista `rotinas` da categoria desejada.

Após modificar o arquivo, atualize o painel para carregar a nova configuração.

---

## 8. Histórico de execuções

O histórico é armazenado localmente em:

`data/execucoes.csv`

O arquivo utiliza codificação UTF-8 com BOM (`UTF-8-SIG`), facilitando sua abertura no Microsoft Excel.

### Estrutura do histórico

| Campo | Descrição |
|---|---|
| `id` | Identificador único da execução |
| `rotina_id` | Identificador da rotina |
| `rotina_nome` | Nome da rotina executada |
| `categoria_id` | Identificador da categoria |
| `categoria_nome` | Nome da categoria |
| `inicio` | Data e hora de início |
| `fim` | Data e hora de finalização |
| `duracao_segundos` | Tempo total da execução em segundos |
| `status` | Situação da execução |
| `observacao` | Campo para observações |

### Status disponíveis

- `em_andamento`: atividade iniciada e ainda não finalizada.
- `concluida`: atividade finalizada normalmente.
- `interrompida`: execução identificada como interrompida.

### Migração do histórico antigo

A versão atual utiliza CSV como formato principal de armazenamento.

Caso exista um arquivo `execucoes.json` da versão anterior e ainda não exista `execucoes.csv`, a aplicação realiza a migração automática dos registros para CSV.

O arquivo JSON original é preservado.

### Cuidados

- Não edite o CSV enquanto a aplicação estiver em uso.
- Realize cópias de segurança periódicas da pasta `data`.
- Evite excluir o arquivo de histórico sem antes realizar um backup.

---

## 9. Regras de funcionamento

1. Apenas uma atividade pode permanecer em execução por vez.
2. Ao iniciar uma rotina, o backend registra automaticamente a data e hora.
3. O cronômetro começa a contar após a confirmação do início.
4. Ao finalizar, o sistema registra o horário final e calcula a duração em segundos.
5. A finalização atualiza o registro original da execução, sem criar uma segunda linha.
6. Atualizar ou fechar o navegador não apaga uma execução que já foi iniciada.
7. Ao carregar o painel novamente, a aplicação recupera o estado da execução ativa.
8. O dashboard atualiza os dados automaticamente a cada 30 segundos.
9. O cronômetro é atualizado a cada segundo.
10. O histórico é persistido em arquivo CSV local.

Os horários cadastrados são utilizados como referência para a organização das atividades. A configuração de horários, por si só, não garante a execução automática das rotinas.

---

## 10. API da aplicação

O backend disponibiliza os seguintes endpoints:

| Método | Endpoint | Finalidade |
|---|---|---|
| GET | `/` | Carrega o dashboard |
| GET | `/api/state` | Retorna configuração, histórico e execução ativa |
| POST | `/api/start` | Inicia uma rotina |
| POST | `/api/finish` | Finaliza a execução atual |
| GET | `/api/history` | Retorna o histórico de execuções |
| GET | `/health` | Verifica a disponibilidade da aplicação |

### Exemplo de inicialização

```http
POST /api/start
Content-Type: application/json
```

```json
{
  "rotina_id": "data_quality"
}
```

### Exemplo de finalização

```http
POST /api/finish
```

A API retorna os dados da execução finalizada, incluindo sua duração.

---

## 11. Armazenamento e limitações

A versão atual foi projetada para utilização local e individual.

O histórico é armazenado em CSV e as configurações são mantidas em JSON.

### Limitações atuais

- Não possui autenticação de usuários.
- Não possui controle de permissões.
- Não possui banco de dados centralizado.
- O histórico depende da disponibilidade dos arquivos locais.
- Não foi projetado para múltiplos usuários executarem atividades simultaneamente.
- A aplicação precisa estar em execução para disponibilizar o painel.

Para utilização compartilhada, hospedagem em servidor ou acesso simultâneo por várias pessoas, recomenda-se migrar o armazenamento para um banco de dados, como PostgreSQL ou Supabase, e implementar controle de concorrência e autenticação.

---

## 12. Próximas melhorias

Possíveis evoluções para as próximas versões:

1. **Sistema de notificações:** alertas de proximidade, horário programado e atraso das rotinas.
2. **Calendário operacional:** controle de dias úteis, feriados e recorrências.
3. **Cadastro pelo dashboard:** inclusão, edição e exclusão de categorias e rotinas sem editar diretamente o JSON.
4. **Pausa e retomada:** permitir interromper temporariamente uma execução sem perder o tempo acumulado.
5. **Relatórios analíticos:** indicadores de produtividade, tempo médio por rotina e histórico por período.
6. **Integração com Supabase:** centralização e persistência dos dados em banco de dados.
7. **Autenticação:** controle de acesso e identificação dos usuários.
8. **Monitoramento de execução:** acompanhamento de rotinas pendentes, atrasadas e concluídas.

---

## 13. Backup e manutenção

Recomenda-se manter cópias de segurança dos seguintes arquivos:

- `config/rotinas.json`
- `data/execucoes.csv`
- `app.py`
- `requirements.txt`

A pasta `data` contém o histórico operacional e deve receber atenção especial durante backups e atualizações.

Antes de modificar a estrutura do projeto, faça uma cópia da versão funcional.

---

## 14. Licença e utilização

Projeto desenvolvido para organização e acompanhamento de rotinas operacionais de BI e processos internos.

**Ops Control Center — MVP**

*Centralize suas rotinas. Acompanhe suas atividades. Controle seu tempo.*