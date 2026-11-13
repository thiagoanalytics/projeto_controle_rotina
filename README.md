# Ops Control Center — MVP

## Requisitos
- Python 3.10 ou superior
- Acesso ao terminal na pasta do projeto

## Instalação
```bash
python -m venv .venv
```

Windows:
```bat
.venv\Scripts\activate
```

Linux/macOS:
```bash
source .venv/bin/activate
```

Instale as dependências:
```bash
pip install -r requirements.txt
```

## Executar
```bash
uvicorn app:app --reload
```

Abra no navegador:
http://127.0.0.1:8000

## Cadastro de rotinas
Edite `config/rotinas.json`.

Cada rotina deve ter um `id` único, nome, descrição, URL, frequência, horários e ativo.
Use links reais no lugar dos endereços `https://exemplo.com/...`.

## Histórico
As execuções são gravadas em `data/execucoes.json`.
Não edite esse arquivo enquanto a aplicação estiver em uso.

## Regras desta versão
- Só pode existir uma execução em andamento por vez.
- Iniciar registra data/hora no backend.
- Finalizar registra data/hora final e duração em segundos.
- Atualizar ou fechar o navegador não apaga a execução ativa.
- O painel atualiza os dados automaticamente a cada 30 segundos.
- O projeto ainda não envia notificações de horário; nesta primeira entrega, os horários ficam exibidos na lista como referência.
- O histórico JSON é um armazenamento inicial. Para uso simultâneo por várias pessoas ou hospedagem compartilhada, migre para banco de dados (por exemplo, Supabase) antes de ampliar o acesso.

## Próximas melhorias sugeridas
1. Formulário de cadastro/edição dentro do painel.
2. Alertas/notificações nos horários definidos.
3. Calendário de dias úteis e recorrências.
4. Pausa e retomada de execução, se necessário.
5. Persistência no Supabase.