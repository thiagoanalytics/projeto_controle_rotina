
from datetime import datetime, date, time, timedelta
from pathlib import Path
from threading import Lock
from zoneinfo import ZoneInfo
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
HISTORY_FILE = BASE_DIR / "data" / "execucoes.csv"
OLD_HISTORY_FILE = BASE_DIR / "data" / "execucoes.json"

TIMEZONE = ZoneInfo("America/Sao_Paulo")
LOCK = Lock()

CSV_FIELDS = [
    "id",
    "rotina_id",
    "rotina_nome",
    "categoria_id",
    "categoria_nome",
    "data_prevista",
    "horario_previsto",
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

templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(
        BASE_DIR / "static" / "favicon.svg",
        media_type="image/svg+xml"
    )


# --------------------------------------------------
# DATA E CONFIGURAÇÃO
# --------------------------------------------------

def now_local():
    return datetime.now(TIMEZONE)


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


def parse_schedule_time(value):
    try:
        return datetime.strptime(value, "%H:%M").time()
    except (ValueError, TypeError):
        return None


# --------------------------------------------------
# HISTÓRICO CSV
# --------------------------------------------------

def normalize_record(record):
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
            writer.writerow({
                field: record.get(field)
                for field in CSV_FIELDS
            })

    temp.replace(HISTORY_FILE)


def get_history():
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
    records = get_history().get("execucoes", [])

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


# --------------------------------------------------
# ROTINAS
# --------------------------------------------------

def find_routine(routine_id):
    config = get_config()

    for category in config.get("categorias", []):
        for routine in category.get("rotinas", []):
            if routine.get("id") == routine_id:
                return category, routine

    return None, None


def get_active_routines(config):
    result = []

    for category in config.get("categorias", []):
        for routine in category.get("rotinas", []):
            if routine.get("ativo") is False:
                continue

            result.append({
                **routine,
                "categoria_id": category.get("id"),
                "categoria_nome": category.get("nome"),
            })

    return result


# --------------------------------------------------
# EXECUÇÃO ATIVA
# --------------------------------------------------

def active_execution(history):
    active = [
        item
        for item in history.get("execucoes", [])
        if item.get("status") == "em_andamento"
    ]

    if len(active) > 1:
        active.sort(key=lambda x: x.get("inicio") or "")

        for item in active[1:]:
            update_execution(
                item["id"],
                {
                    "status": "interrompida",
                    "observacao": (
                        "Recuperação automática: havia mais "
                        "de uma execução ativa."
                    )
                }
            )

        return active[0]

    return active[0] if active else None


# --------------------------------------------------
# OCORRÊNCIAS PROGRAMADAS
# --------------------------------------------------

def build_occurrences(config, records, reference=None):
    """
    Gera as ocorrências previstas para o dia atual.

    Não grava ocorrências futuras ou atrasadas no CSV.
    O status é calculado a partir da programação e do histórico.
    """

    reference = reference or now_local()
    today = reference.date()
    today_text = today.isoformat()

    occurrences = []

    for routine in get_active_routines(config):
        frequency = str(
            routine.get("frequencia", "diaria")
        ).lower()

        # Nesta versão, a frequência diária é suportada.
        # Outras frequências não são presumidas como diárias.
        if frequency not in ("diaria", "diário", "diario", "daily"):
            continue

        for scheduled_time in routine.get("horarios", []):
            parsed_time = parse_schedule_time(scheduled_time)

            if parsed_time is None:
                continue

            scheduled_at = datetime.combine(
                today,
                parsed_time,
                tzinfo=TIMEZONE
            )

            matching = [
                record for record in records
                if record.get("rotina_id") == routine.get("id")
                and record.get("data_prevista") == today_text
                and record.get("horario_previsto") == scheduled_time
            ]

            # Uma conclusão válida encerra a ocorrência.
            completed = next(
                (
                    item for item in reversed(matching)
                    if item.get("status") == "concluida"
                ),
                None
            )

            running = next(
                (
                    item for item in reversed(matching)
                    if item.get("status") == "em_andamento"
                ),
                None
            )

            if completed:
                status = "concluida"
                execution = completed
            elif running:
                status = "em_andamento"
                execution = running
            elif reference >= scheduled_at:
                status = "atrasada"
                execution = None
            else:
                status = "futura"
                execution = None

            occurrences.append({
                "key": (
                    f"{routine['id']}|{today_text}|{scheduled_time}"
                ),
                "rotina_id": routine.get("id"),
                "rotina_nome": routine.get("nome"),
                "categoria_id": routine.get("categoria_id"),
                "categoria_nome": routine.get("categoria_nome"),
                "data_prevista": today_text,
                "horario_previsto": scheduled_time,
                "horario_data": scheduled_at.isoformat(),
                "status": status,
                "execucao_id": (
                    execution.get("id") if execution else None
                ),
                "inicio": (
                    execution.get("inicio") if execution else None
                ),
            })

    occurrences.sort(
        key=lambda item: (
            item["horario_previsto"],
            item["rotina_nome"] or ""
        )
    )

    return occurrences


# --------------------------------------------------
# MODELOS DA API
# --------------------------------------------------

class StartPayload(BaseModel):
    rotina_id: str
    horario_previsto: str


# --------------------------------------------------
# PÁGINA
# --------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )


# --------------------------------------------------
# ESTADO GERAL
# --------------------------------------------------

@app.get("/api/state")
def state():
    with LOCK:
        config = get_config()
        history = get_history()
        active = active_execution(history)

        # Recarrega após eventual recuperação de registros.
        history = get_history()
        records = history.get("execucoes", [])

        occurrences = build_occurrences(
            config,
            records,
            now_local()
        )

        return {
            "config": config,
            "execucoes": records,
            "ativa": active,
            "ocorrencias": occurrences,
            "data_referencia": now_local().date().isoformat(),
            "agora": now_local().isoformat(),
        }


# --------------------------------------------------
# INICIAR EXECUÇÃO
# --------------------------------------------------

@app.post("/api/start")
def start(payload: StartPayload):
    with LOCK:
        category, routine = find_routine(payload.rotina_id)

        if not routine:
            raise HTTPException(
                status_code=404,
                detail="Rotina não encontrada."
            )

        if routine.get("ativo") is False:
            raise HTTPException(
                status_code=409,
                detail="Esta rotina está inativa."
            )

        if payload.horario_previsto not in routine.get("horarios", []):
            raise HTTPException(
                status_code=400,
                detail="Horário não cadastrado para esta rotina."
            )

        history = get_history()
        records = history.get("execucoes", [])
        active = active_execution(history)

        if active:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Já existe uma tarefa em andamento: "
                    f"{active.get('rotina_nome', active.get('rotina_id'))}."
                )
            )

        now = now_local()
        today_text = now.date().isoformat()

        # Impede iniciar novamente uma ocorrência já concluída.
        already_completed = any(
            item.get("rotina_id") == routine["id"]
            and item.get("data_prevista") == today_text
            and item.get("horario_previsto") == payload.horario_previsto
            and item.get("status") == "concluida"
            for item in records
        )

        if already_completed:
            raise HTTPException(
                status_code=409,
                detail="Esta ocorrência já foi concluída hoje."
            )

        # Impede duplicidade da mesma ocorrência em andamento.
        already_running = any(
            item.get("rotina_id") == routine["id"]
            and item.get("data_prevista") == today_text
            and item.get("horario_previsto") == payload.horario_previsto
            and item.get("status") == "em_andamento"
            for item in records
        )

        if already_running:
            raise HTTPException(
                status_code=409,
                detail="Esta ocorrência já está em andamento."
            )

        record = {
            "id": str(uuid.uuid4()),
            "rotina_id": routine["id"],
            "rotina_nome": routine["nome"],
            "categoria_id": category.get("id"),
            "categoria_nome": category.get("nome"),
            "data_prevista": today_text,
            "horario_previsto": payload.horario_previsto,
            "inicio": now.isoformat(timespec="seconds"),
            "fim": None,
            "duracao_segundos": None,
            "status": "em_andamento",
            "observacao": None,
        }

        records.append(record)
        write_history(records)

        return {
            "ok": True,
            "execucao": record
        }


# --------------------------------------------------
# FINALIZAR EXECUÇÃO
# --------------------------------------------------

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

        end = now_local()
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


# --------------------------------------------------
# HISTÓRICO
# --------------------------------------------------

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


# --------------------------------------------------
# SAÚDE DA API
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": "Ops Control Center",
        "timezone": "America/Sao_Paulo"
    }
