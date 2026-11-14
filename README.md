# Ops Control Center

**Central de gerenciamento e acompanhamento de rotinas operacionais**

O Ops Control Center é uma aplicação desenvolvida para centralizar rotinas operacionais, acompanhar verificações periódicas e registrar o tempo dedicado a cada atividade.

O objetivo é facilitar o controle das atividades diárias, oferecendo uma visão organizada das rotinas, acompanhamento de execuções em andamento, histórico das atividades realizadas e indicadores gerenciais de desempenho.

O projeto possui duas opções de implementação:

- **Aplicação local:** desenvolvida em Python, com FastAPI, HTML, CSS e JavaScript, utilizando arquivos locais para armazenar configurações e registros.
- **Aplicação Google:** desenvolvida com Google Apps Script, HTML, CSS e JavaScript, utilizando o Google Drive como fonte de dados para disponibilizar o painel pela infraestrutura do Google.

A implementação Google é opcional e permite utilizar o painel sem precisar executar localmente o servidor FastAPI.

---

## 1. Funcionalidades

### Dashboard operacional

- Visualização das categorias e rotinas cadastradas.
- Indicadores de rotinas cadastradas.
- Quantidade de atividades concluídas no dia.
- Tempo total monitorado no dia.
- Identificação de tarefas em andamento.

### Dashboard gerencial

- Visão consolidada do histórico de execuções.
- Indicadores de volume e conclusão das atividades.
- Filtros por período, categoria, rotina e status.
- Comparação entre períodos equivalentes.
- Análise da evolução das execuções ao longo do tempo.
- Acompanhamento do desempenho por categoria e rotina.

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
- Registro da data e horário previstos.
- Visualização das últimas execuções no dashboard.
- Compatibilidade com Excel para análise dos registros.

### Atualização automática

- Atualização dos dados do painel a cada 30 segundos.
- Atualização do cronômetro a cada segundo na aplicação local.
- Persistência dos registros no backend, independentemente de atualização ou fechamento da página.

---

## 2. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Python | Linguagem principal da aplicação local |
| FastAPI | Backend e disponibilização da API local |
| Uvicorn | Servidor da aplicação local |
| HTML5 | Estrutura das interfaces |
| CSS3 | Estilização e layout |
| JavaScript | Interatividade e atualização dinâmica |
| JSON | Configuração das categorias e rotinas |
| CSV | Armazenamento do histórico de execuções |
| Google Apps Script | Backend da implementação Google |
| Google Drive | Armazenamento do histórico na implementação Google |

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
├── templates/
│   └── index.html
│
└── google_apps_script/
    ├── Code.gs
    └── Index.html
```

*Observação: a pasta `google_apps_script` representa a organização sugerida para os arquivos da implementação Google. Os arquivos podem ser mantidos na estrutura utilizada no projeto.*

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

- Estilos visuais do dashboard local.
- Layout, cores, componentes, cartões e tabelas.

**`static/js/dashboard.js`**

- Atualização dinâmica da interface.
- Controle do cronômetro.
- Comunicação com a API.
- Renderização das categorias, rotinas e histórico.

**`templates/index.html`**

- Estrutura HTML principal da aplicação local.

**`google_apps_script/Code.gs`**

- Backend da implementação Google.
- Leitura do arquivo CSV armazenado no Google Drive.
- Processamento dos registros de execução.
- Disponibilização dos dados para os dashboards operacional e gerencial.
- Aplicação dos filtros e cálculos dos indicadores históricos.

**`google_apps_script/Index.html`**

- Interface da implementação Google.
- Exibição dos indicadores e gráficos.
- Navegação entre as áreas do painel.
- Filtros e visualizações do histórico de execuções.

---

## 4. Requisitos

### Aplicação local

- Python 3.10 ou superior.
- Acesso ao terminal na pasta do projeto.
- Navegador atualizado (Google Chrome recomendado).
- Permissão de leitura e escrita na pasta do projeto.

### Aplicação Google

- Conta Google com acesso ao Google Drive.
- Permissão para criar projetos no Google Apps Script.
- Permissão para acessar a pasta do Drive onde está armazenado o histórico.

---

## 5. Instalação da aplicação local

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

## 6. Executar a aplicação local

Com o ambiente virtual ativado, execute:

```bash
uvicorn app:app --reload
```

A aplicação ficará disponível em:

[http://127.0.0.1:8000](http://127.0.0.1:8000)

Para encerrar o servidor, utilize `CTRL + C` no terminal.

### Execução pelo Windows

O projeto também possui o arquivo:

`iniciar_ops_control_center.bat`

Ele pode ser utilizado para facilitar a inicialização da aplicação no Windows, conforme as configurações definidas no próprio script.

---

## 7. Implementação opcional com Google Apps Script

Além da aplicação local, o projeto disponibiliza uma implementação utilizando Google Apps Script.

Essa alternativa permite publicar o Ops Control Center como um aplicativo Web, utilizando os serviços do Google para disponibilizar a interface e acessar o histórico armazenado no Google Drive.

A implementação pode ser utilizada por quem prefere não instalar Python, criar um ambiente virtual ou manter um servidor FastAPI em execução.

### 7.1. Arquivos necessários

Os arquivos da implementação são:

- `Code.gs`: código responsável pelo processamento dos dados e comunicação com o Google Drive.
- `Index.html`: interface visual do aplicativo.

### 7.2. Criar o projeto no Google Apps Script

1. Acesse [Google Apps Script](https://script.google.com/).
2. Crie um novo projeto.
3. Copie o conteúdo do arquivo `Code.gs` para o editor de scripts.
4. Crie um arquivo HTML chamado `Index`.
5. Copie o conteúdo do arquivo `Index.html` para esse arquivo.

### 7.3. Configurar o Google Drive

A implementação Google utiliza o arquivo `execucoes.csv` armazenado em uma pasta do Google Drive.

No arquivo `Code.gs`, localize as configurações do aplicativo:

```javascript
const CONFIG = {
  NOME: 'Routine Control',
  TIMEZONE: 'America/Sao_Paulo',

  DRIVE_FOLDER_ID: 'ID_DA_PASTA_NO_GOOGLE_DRIVE',
  CSV_FILE_NAME: 'execucoes.csv',

  LIMITE_HISTORICO: 100
};
```

Configure os parâmetros:

| Parâmetro | Descrição |
|---|---|
| `NOME` | Nome da aplicação |
| `TIMEZONE` | Fuso horário utilizado pelo painel |
| `DRIVE_FOLDER_ID` | Identificador da pasta do Google Drive |
| `CSV_FILE_NAME` | Nome do arquivo de histórico |
| `LIMITE_HISTORICO` | Quantidade máxima de registros exibidos na consulta de histórico |

O identificador da pasta pode ser obtido diretamente pelo endereço da pasta no Google Drive.

Exemplo:

```text
https://drive.google.com/drive/folders/ID_DA_PASTA
```

Nesse exemplo, utilize o trecho `ID_DA_PASTA` no parâmetro `DRIVE_FOLDER_ID`.

O arquivo `execucoes.csv` deve estar dentro da pasta configurada.

### 7.4. Autorizar o acesso

Na primeira execução, o Google poderá solicitar autorização para que o script acesse os arquivos do Drive.

Utilize uma conta que possua permissão de leitura sobre a pasta e o arquivo de histórico.

### 7.5. Publicar como aplicativo Web

No editor do Google Apps Script:

1. Clique em **Implantar**.
2. Selecione **Nova implantação**.
3. Escolha o tipo **App da Web**.
4. Configure quem poderá acessar a aplicação, conforme a política de acesso desejada.
5. Defina a conta que executará o aplicativo.
6. Clique em **Implantar**.
7. Copie o endereço disponibilizado pelo Google.

O endereço gerado será utilizado para acessar o Ops Control Center pela Web.

**Atenção:** as opções de acesso e execução devem ser configuradas de acordo com as regras de segurança da organização. Evite disponibilizar o aplicativo publicamente quando o histórico contiver informações operacionais restritas.

### 7.6. Atualizar uma implantação existente

Quando houver alterações nos arquivos `Code.gs` ou `Index.html`:

1. Salve as alterações no editor.
2. Acesse **Implantar → Gerenciar implantações**.
3. Edite a implantação existente.
4. Selecione uma nova versão.
5. Confirme a atualização.

---

## 8. Configuração das rotinas

Na aplicação local, o cadastro das categorias e atividades é realizado pelo arquivo:

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

## 9. Histórico de execuções

O histórico da aplicação local é armazenado em:

`data/execucoes.csv`

Na implementação Google, o arquivo CSV deve estar armazenado na pasta do Drive configurada no `Code.gs`.

O arquivo utiliza codificação UTF-8 com BOM (`UTF-8-SIG`), facilitando sua abertura no Microsoft Excel.

### Estrutura do histórico

| Campo | Descrição |
|---|---|
| `id` | Identificador único da execução |
| `rotina_id` | Identificador da rotina |
| `rotina_nome` | Nome da rotina executada |
| `categoria_id` | Identificador da categoria |
| `categoria_nome` | Nome da categoria |
| `data_prevista` | Data programada para a execução |
| `horario_previsto` | Horário programado para a execução |
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

A versão local utiliza CSV como formato principal de armazenamento.

Caso exista um arquivo `execucoes.json` da versão anterior e ainda não exista `execucoes.csv`, a aplicação realiza a migração automática dos registros para CSV.

O arquivo JSON original é preservado.

### Cuidados

- Não edite o CSV enquanto a aplicação estiver em uso.
- Realize cópias de segurança periódicas da pasta `data`.
- Evite excluir o arquivo de histórico sem antes realizar um backup.
- Na implementação Google, mantenha o arquivo CSV na pasta configurada no script.

---

## 10. Regras de funcionamento

1. Apenas uma atividade pode permanecer em execução por vez.
2. Ao iniciar uma rotina, o backend registra automaticamente a data e hora.
3. O cronômetro começa a contar após a confirmação do início.
4. Ao finalizar, o sistema registra o horário final e calcula a duração em segundos.
5. A finalização atualiza o registro original da execução, sem criar uma segunda linha.
6. Atualizar ou fechar o navegador não apaga uma execução que já foi iniciada.
7. Ao carregar o painel novamente, a aplicação recupera o estado da execução ativa.
8. O dashboard local atualiza os dados automaticamente a cada 30 segundos.
9. O cronômetro local é atualizado a cada segundo.
10. O histórico é persistido em arquivo CSV.

Os horários cadastrados são utilizados como referência para a organização das atividades. A configuração de horários, por si só, não garante a execução automática das rotinas.

---

## 11. API da aplicação local

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

## 12. Armazenamento e limitações

### Aplicação local

A versão local foi projetada para utilização individual.

- Não possui autenticação de usuários.
- Não possui controle de permissões.
- Não possui banco de dados centralizado.
- O histórico depende da disponibilidade dos arquivos locais.
- Não foi projetada para múltiplos usuários executarem atividades simultaneamente.
- A aplicação precisa estar em execução para disponibilizar o painel.

### Aplicação Google

A implementação Google utiliza o Google Drive para disponibilizar o histórico ao Apps Script.

- Depende da disponibilidade dos serviços Google.
- Requer autorização para acessar os arquivos do Drive.
- O acesso ao aplicativo depende das permissões configuradas na implantação.
- O histórico depende da disponibilidade e integridade do arquivo CSV.
- O CSV representa as execuções registradas, não todas as ocorrências previstas na programação.

**Importante:** a implementação Google disponibiliza uma alternativa de publicação e consulta do painel. Ela não deve ser considerada automaticamente uma versão multiusuário com controle de concorrência ou autenticação individual.

Para utilização compartilhada em escala, recomenda-se migrar o armazenamento para um banco de dados, como PostgreSQL ou Supabase, e implementar controle de concorrência e autenticação.

---

## 13. Próximas melhorias

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

## 14. Backup e manutenção

Recomenda-se manter cópias de segurança dos seguintes arquivos:

- `config/rotinas.json`
- `data/execucoes.csv`
- `app.py`
- `requirements.txt`
- `google_apps_script/Code.gs`
- `google_apps_script/Index.html`

A pasta `data` contém o histórico operacional e deve receber atenção especial durante backups e atualizações.

Para a implementação Google, mantenha também uma cópia do arquivo CSV armazenado no Drive.

Antes de modificar a estrutura do projeto, faça uma cópia da versão funcional.

---

## 15. Licença e utilização

Projeto desenvolvido para organização e acompanhamento de rotinas operacionais de BI e processos internos.

**Ops Control Center — MVP**

*Centralize suas rotinas. Acompanhe suas atividades. Controle seu tempo.*