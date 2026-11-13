
from datetime import datetime
from pathlib import Path
from threading import Lock
import csv
import json
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from fastapi.responses import HTMLResponse, FileResponse

BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "config" / "rotinas.json"

# O histórico agora é armazenado em CSV
HISTORY_FILE = BASE_DIR / "data" / "execucoes.csv"

# Arquivo antigo, utilizado para migração automática
OLD_HISTORY_FILE = BASE_DIR / "data" / "execucoes.json"

LOCK = Lock()

CSV_FIELDS = [
    "id",
    "rotina_id",
    "rotina_nome",
    "categoria_id",
    "categoria_nome",
    "inicio",
    "fim",
    "duracao_segundos",
    "status",
    "observacao",
]


app = FastAPI(title="Ops Control Center")

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(
        BASE_DIR / "static" / "favicon.svg",
        media_type="image/svg+xml"
    )

templates = Jinja2Templates(directory=BASE_DIR / "templates")


def read_json(path: Path, default):
    if not path.exists():
        return default

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Arquivo JSON inválido: {path.name}"
        )


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)

    temp = path.with_suffix(path.suffix + ".tmp")

    temp.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    temp.replace(path)


def get_config():
    return read_json(CONFIG_FILE, {"categorias": []})


def normalize_record(record):
    """Normaliza os dados lidos do CSV para manter os tipos esperados pela API."""

    normalized = dict(record)

    duration = normalized.get("duracao_segundos")

    if duration in (None, ""):
        normalized["duracao_segundos"] = None
    else:
        try:
            normalized["duracao_segundos"] = int(float(duration))
        except (ValueError, TypeError):
            normalized["duracao_segundos"] = None

    for field in CSV_FIELDS:
        normalized.setdefault(field, None)

    return normalized


def write_history(records):
    """Grava todo o histórico no CSV de forma segura."""

    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)

    temp = HISTORY_FILE.with_suffix(".csv.tmp")

    with temp.open(
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=CSV_FIELDS,
            extrasaction="ignore"
        )

        writer.writeheader()

        for record in records:
            row = {
                field: record.get(field)
                for field in CSV_FIELDS
            }

            writer.writerow(row)

    temp.replace(HISTORY_FILE)


def get_history():
    """
    Recupera o histórico do CSV.

    Se o CSV ainda não existir, tenta importar automaticamente
    os registros do antigo execucoes.json.
    """

    if not HISTORY_FILE.exists():

        if OLD_HISTORY_FILE.exists():
            old_history = read_json(
                OLD_HISTORY_FILE,
                {"execucoes": []}
            )

            records = old_history.get("execucoes", [])

            write_history(records)

        else:
            write_history([])

    records = []

    try:
        with HISTORY_FILE.open(
            "r",
            newline="",
            encoding="utf-8-sig"
        ) as file:

            reader = csv.DictReader(file)

            for row in reader:
                records.append(normalize_record(row))

    except (csv.Error, UnicodeDecodeError):
        raise HTTPException(
            status_code=500,
            detail="Não foi possível ler o arquivo de histórico CSV."
        )

    return {"execucoes": records}


def update_execution(execution_id, updates):
    """Atualiza um registro existente no CSV pelo seu ID."""

    history = get_history()
    records = history.get("execucoes", [])

    found = False

    for record in records:
        if record.get("id") == execution_id:
            record.update(updates)
            found = True
            break

    if not found:
        raise HTTPException(
            status_code=404,
            detail="Registro de execução não encontrado."
        )

    write_history(records)

    return next(
        record for record in records
        if record.get("id") == execution_id
    )


def find_routine(routine_id):
    config = get_config()

    for category in config.get("categorias", []):
        for routine in category.get("rotinas", []):
            if routine.get("id") == routine_id:
                return category, routine

    return None, None


def active_execution(history):
    active = [
        item
        for item in history.get("execucoes", [])
        if item.get("status") == "em_andamento"
    ]

    if len(active) > 1:
        # Mantém a execução mais antiga e interrompe as demais.
        active.sort(key=lambda x: x.get("inicio") or "")

        for item in active[1:]:
            update_execution(
                item["id"],
                {
                    "status": "interrompida",
                    "observacao": (
                        "Registro recuperado: havia mais de "
                        "uma execução ativa."
                    )
                }
            )

        return active[0]

    return active[0] if active else None


class StartPayload(BaseModel):
    rotina_id: str


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )


@app.get("/api/state")
def state():
    with LOCK:
        config = get_config()
        history = get_history()
        active = active_execution(history)

        # Recarrega o histórico caso tenha ocorrido recuperação
        history = get_history()

        return {
            "config": config,
            "execucoes": history.get("execucoes", []),
            "ativa": active
        }


@app.post("/api/start")
def start(payload: StartPayload):
    with LOCK:
        category, routine = find_routine(payload.rotina_id)

        if not routine:
            raise HTTPException(
                status_code=404,
                detail="Rotina não encontrada."
            )

        history = get_history()
        active = active_execution(history)

        if active:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Já existe uma tarefa em andamento: "
                    f"{active.get('rotina_nome', active.get('rotina_id'))}."
                )
            )

        now = datetime.now().astimezone().isoformat(
            timespec="seconds"
        )

        record = {
            "id": str(uuid.uuid4()),
            "rotina_id": routine["id"],
            "rotina_nome": routine["nome"],
            "categoria_id": category.get("id"),
            "categoria_nome": category.get("nome"),
            "inicio": now,
            "fim": None,
            "duracao_segundos": None,
            "status": "em_andamento",
            "observacao": None
        }

        history.setdefault("execucoes", []).append(record)

        write_history(history["execucoes"])

        return {
            "ok": True,
            "execucao": record
        }


@app.post("/api/finish")
def finish():
    with LOCK:
        history = get_history()
        active = active_execution(history)

        if not active:
            raise HTTPException(
                status_code=409,
                detail="Não existe tarefa em andamento."
            )

        end = datetime.now().astimezone()
        start_dt = datetime.fromisoformat(active["inicio"])

        duration = max(
            0,
            int((end - start_dt).total_seconds())
        )

        updated = update_execution(
            active["id"],
            {
                "fim": end.isoformat(timespec="seconds"),
                "duracao_segundos": duration,
                "status": "concluida"
            }
        )

        return {
            "ok": True,
            "execucao": updated
        }


@app.get("/api/history")
def history(limit: int = 100):
    with LOCK:
        records = get_history().get("execucoes", [])

        records.sort(
            key=lambda x: x.get("inicio") or "",
            reverse=True
        )

        return {
            "execucoes": records[:max(1, min(limit, 500))]
        }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": "Ops Control Center"
    }
