
const CONFIG = {
  NOME: 'Routine Control',
  TIMEZONE: 'America/Sao_Paulo',

  DRIVE_FOLDER_ID: '1obTCBgVYIhjmQjmzN_UkJWsMoBbctJOD',
  CSV_FILE_NAME: 'execucoes.csv',

  LIMITE_HISTORICO: 100
};

// ======================================================
// WEB APP
// ======================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(CONFIG.NOME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ======================================================
// LEITURA DO CSV
// ======================================================

function getArquivoCSV_() {
  const pasta = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const arquivos = pasta.getFilesByName(CONFIG.CSV_FILE_NAME);

  if (!arquivos.hasNext()) {
    throw new Error('Arquivo execucoes.csv não encontrado na pasta configurada.');
  }

  let arquivo = arquivos.next();

  while (arquivos.hasNext()) {
    const candidato = arquivos.next();

    if (candidato.getLastUpdated().getTime() > arquivo.getLastUpdated().getTime()) {
      arquivo = candidato;
    }
  }

  return arquivo;
}

function normalizarCabecalho_(valor) {
  return String(valor || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizarTexto_(valor) {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lerCSV_() {
  const arquivo = getArquivoCSV_();

  const conteudo = arquivo.getBlob()
    .getDataAsString('UTF-8')
    .replace(/^\uFEFF/, '');

  if (!conteudo.trim()) {
    throw new Error('O arquivo CSV está vazio.');
  }

  const primeiraLinha = conteudo.split(/\r?\n/)[0];

  const qtdVirgulas = (primeiraLinha.match(/,/g) || []).length;
  const qtdPontoVirgula = (primeiraLinha.match(/;/g) || []).length;
  const qtdTabs = (primeiraLinha.match(/\t/g) || []).length;

  const delimitador =
    qtdTabs > qtdVirgulas && qtdTabs > qtdPontoVirgula ? '\t' :
    qtdPontoVirgula > qtdVirgulas ? ';' : ',';

  const linhas = Utilities.parseCsv(conteudo, delimitador);

  if (linhas.length < 2) {
    return [];
  }

  const cabecalhos = linhas[0].map(normalizarCabecalho_);

  const colunasObrigatorias = [
    'id',
    'rotinaid',
    'rotinanome',
    'categoriaid',
    'categorianome',
    'dataprevista',
    'horarioprevisto',
    'inicio',
    'fim',
    'duracaosegundos',
    'status',
    'observacao'
  ];

  const ausentes = colunasObrigatorias.filter(
    coluna => !cabecalhos.includes(coluna)
  );

  if (ausentes.length) {
    throw new Error('Colunas ausentes no CSV: ' + ausentes.join(', '));
  }

  const indice = {};
  cabecalhos.forEach((nome, i) => indice[nome] = i);

  return linhas.slice(1)
    .filter(linha => linha.some(c => String(c ?? '').trim() !== ''))
    .map(linha => {
      const campo = nome => {
        const posicao = indice[nome];
        return posicao === undefined ? '' : String(linha[posicao] ?? '').trim();
      };

      return {
        id: campo('id'),
        rotina_id: campo('rotinaid'),
        rotina_nome: normalizarTexto_(campo('rotinanome')),
        categoria_id: campo('categoriaid'),
        categoria_nome: normalizarTexto_(campo('categorianome')),
        data_prevista: campo('dataprevista'),
        horario_previsto: normalizarHorario_(campo('horarioprevisto')),
        inicio: campo('inicio'),
        fim: campo('fim'),
        duracao_segundos: Number(campo('duracaosegundos')) || 0,
        status: normalizarStatus_(campo('status')),
        observacao: campo('observacao')
      };
    })
    .filter(r => r.id && r.rotina_id);
}

// ======================================================
// NORMALIZAÇÕES
// ======================================================

function normalizarStatus_(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarHorario_(valor) {
  const texto = String(valor || '').trim();
  const resultado = texto.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!resultado) return texto;

  return String(resultado[1]).padStart(2, '0') + ':' +
    String(resultado[2]).padStart(2, '0');
}

function formatarData_(valor) {
  const texto = String(valor || '').trim();
  const resultado = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!resultado) return texto;

  return resultado[3] + '/' + resultado[2] + '/' + resultado[1];
}

function formatarDataHora_(valor) {
  if (!valor) return '-';

  const data = new Date(valor);

  if (isNaN(data.getTime())) return valor;

  return Utilities.formatDate(
    data,
    CONFIG.TIMEZONE,
    'dd/MM/yyyy HH:mm:ss'
  );
}

function formatarDuracao_(segundos) {
  const total = Math.max(0, Number(segundos) || 0);

  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundosRestantes = total % 60;

  if (horas > 0) {
    return [
      String(horas).padStart(2, '0'),
      String(minutos).padStart(2, '0'),
      String(segundosRestantes).padStart(2, '0')
    ].join(':');
  }

  return [
    String(minutos).padStart(2, '0'),
    String(segundosRestantes).padStart(2, '0')
  ].join(':');
}

function obterHoje_() {
  return Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    'yyyy-MM-dd'
  );
}

function dataValida_(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
}

function adicionarDias_(dataTexto, quantidade) {
  const partes = dataTexto.split('-').map(Number);
  const data = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));

  data.setUTCDate(data.getUTCDate() + quantidade);

  return [
    data.getUTCFullYear(),
    String(data.getUTCMonth() + 1).padStart(2, '0'),
    String(data.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function diferencaDias_(inicio, fim) {
  const a = inicio.split('-').map(Number);
  const b = fim.split('-').map(Number);

  const dataA = Date.UTC(a[0], a[1] - 1, a[2]);
  const dataB = Date.UTC(b[0], b[1] - 1, b[2]);

  return Math.round((dataB - dataA) / 86400000) + 1;
}

// ======================================================
// DASHBOARD OPERACIONAL — MANTIDO
// ======================================================

function getDashboardData() {
  const registros = lerCSV_();
  const hoje = obterHoje_();

  const registrosHoje = registros.filter(
    r => r.data_prevista === hoje
  );

  const rotinas = {};

  registrosHoje.forEach(r => {
    if (!rotinas[r.rotina_id]) {
      rotinas[r.rotina_id] = {
        id: r.rotina_id,
        nome: r.rotina_nome,
        categoria: r.categoria_id,
        categoriaNome: r.categoria_nome,
        tarefas: []
      };
    }

    rotinas[r.rotina_id].tarefas.push({
      horario: r.horario_previsto,
      status: r.status === 'concluida' ? 'CONCLUIDA' : r.status.toUpperCase(),
      inicio: formatarDataHora_(r.inicio),
      fim: formatarDataHora_(r.fim),
      duracao: formatarDuracao_(r.duracao_segundos),
      observacao: r.observacao
    });
  });

  const listaRotinas = Object.values(rotinas);

  const concluidas = registrosHoje.filter(
    r => r.status === 'concluida'
  ).length;

  const atrasadas = registrosHoje.filter(
    r => r.status === 'atrasada'
  ).length;

  const pendentes = registrosHoje.filter(
    r => r.status === 'pendente'
  ).length;

  const total = registrosHoje.length;
  const categorias = {};

  listaRotinas.forEach(r => {
    categorias[r.categoria] = {
      id: r.categoria,
      nome: r.categoriaNome
    };
  });

  return {
    data: hoje,
    hora: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'HH:mm'),
    rotinas: listaRotinas,
    categorias: Object.values(categorias),
    indicadores: {
      totalRotinas: listaRotinas.length,
      totalExecucoes: total,
      concluidas: concluidas,
      atrasadas: atrasadas,
      pendentes: pendentes,
      percentual: total ? Math.round(concluidas / total * 100) : 0
    }
  };
}

// ======================================================
// DASHBOARD GERENCIAL — FILTROS
// ======================================================

function getOpcoesAnaliseHistorica() {
  const registros = lerCSV_();

  const categorias = {};
  const rotinas = {};
  const status = {};

  registros.forEach(r => {
    categorias[r.categoria_id] = {
      id: r.categoria_id,
      nome: r.categoria_nome
    };

    rotinas[r.rotina_id] = {
      id: r.rotina_id,
      nome: r.rotina_nome,
      categoriaId: r.categoria_id,
      categoriaNome: r.categoria_nome
    };

    if (r.status) status[r.status] = r.status;
  });

  return {
    dataMinima: registros.length
      ? registros.map(r => r.data_prevista).filter(dataValida_).sort()[0]
      : obterHoje_(),

    dataMaxima: registros.length
      ? registros.map(r => r.data_prevista).filter(dataValida_).sort().pop()
      : obterHoje_(),

    categorias: Object.values(categorias).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    ),

    rotinas: Object.values(rotinas).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    ),

    status: Object.keys(status).sort()
  };
}

// ======================================================
// DASHBOARD GERENCIAL — CÁLCULOS
// ======================================================

function calcularIndicadoresHistoricos_(registros) {
  const total = registros.length;

  const concluidas = registros.filter(
    r => r.status === 'concluida'
  ).length;

  const outrosStatus = total - concluidas;

  const duracoesValidas = registros
    .filter(r => r.status === 'concluida' && r.duracao_segundos >= 0 &&
      (r.fim || r.inicio || r.duracao_segundos > 0))
    .map(r => r.duracao_segundos);

  const duracaoMedia = duracoesValidas.length
    ? duracoesValidas.reduce((soma, valor) => soma + valor, 0) / duracoesValidas.length
    : 0;

  const registrosPontualidade = registros.filter(r => {
    return r.inicio &&
      dataValida_(r.data_prevista) &&
      /^\d{2}:\d{2}$/.test(r.horario_previsto);
  });

  let pontuais = 0;

  registrosPontualidade.forEach(r => {
    const previsto = new Date(
      r.data_prevista + 'T' + r.horario_previsto + ':00-03:00'
    );

    const inicio = new Date(r.inicio);

    if (
      !isNaN(previsto.getTime()) &&
      !isNaN(inicio.getTime()) &&
      inicio.getTime() <= previsto.getTime()
    ) {
      pontuais++;
    }
  });

  return {
    total: total,
    concluidas: concluidas,
    outrosStatus: outrosStatus,

    taxaConclusao: total
      ? concluidas / total * 100
      : 0,

    duracaoMedia: duracaoMedia,

    taxaPontualidade: registrosPontualidade.length
      ? pontuais / registrosPontualidade.length * 100
      : 0,

    totalComHorarioComparavel: registrosPontualidade.length,
    totalComDuracao: duracoesValidas.length
  };
}

function filtrarRegistrosHistoricos_(registros, filtros) {
  return registros.filter(r => {
    if (
      filtros.dataInicio &&
      r.data_prevista < filtros.dataInicio
    ) return false;

    if (
      filtros.dataFim &&
      r.data_prevista > filtros.dataFim
    ) return false;

    if (
      filtros.categoria &&
      filtros.categoria !== 'todos' &&
      r.categoria_id !== filtros.categoria
    ) return false;

    if (
      filtros.rotina &&
      filtros.rotina !== 'todos' &&
      r.rotina_id !== filtros.rotina
    ) return false;

    if (
      filtros.status &&
      filtros.status !== 'todos' &&
      r.status !== filtros.status
    ) return false;

    return true;
  });
}

function obterAgrupamento_(inicio, fim, solicitado) {
  if (solicitado === 'dia' || solicitado === 'semana' || solicitado === 'mes') {
    return solicitado;
  }

  const dias = diferencaDias_(inicio, fim);

  if (dias <= 90) return 'dia';
  if (dias <= 365) return 'semana';

  return 'mes';
}

function obterChavePeriodo_(dataTexto, agrupamento) {
  if (agrupamento === 'mes') {
    return dataTexto.substring(0, 7);
  }

  if (agrupamento === 'semana') {
    const partes = dataTexto.split('-').map(Number);
    const data = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));

    const diaSemana = data.getUTCDay() || 7;
    data.setUTCDate(data.getUTCDate() - diaSemana + 1);

    return [
      data.getUTCFullYear(),
      String(data.getUTCMonth() + 1).padStart(2, '0'),
      String(data.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  return dataTexto;
}

function formatarLabelPeriodo_(chave, agrupamento) {
  if (agrupamento === 'mes') {
    const partes = chave.split('-');
    return partes[1] + '/' + partes[0];
  }

  if (agrupamento === 'semana') {
    return formatarData_(chave);
  }

  return chave.substring(8, 10) + '/' + chave.substring(5, 7);
}

function montarEvolucao_(registros, inicio, fim, agrupamento) {
  const mapa = {};

  registros.forEach(r => {
    if (!dataValida_(r.data_prevista)) return;

    const chave = obterChavePeriodo_(r.data_prevista, agrupamento);

    if (!mapa[chave]) mapa[chave] = [];

    mapa[chave].push(r);
  });

  const chaves = Object.keys(mapa).sort();

  return chaves.map(chave => {
    const indicadores = calcularIndicadoresHistoricos_(mapa[chave]);

    return {
      periodo: chave,
      label: formatarLabelPeriodo_(chave, agrupamento),
      total: indicadores.total,
      concluidas: indicadores.concluidas,
      taxaConclusao: Number(indicadores.taxaConclusao.toFixed(2)),
      duracaoMedia: Number(indicadores.duracaoMedia.toFixed(2)),
      pontualidade: Number(indicadores.taxaPontualidade.toFixed(2))
    };
  });
}

function montarRankingRotinas_(registros) {
  const grupos = {};

  registros.forEach(r => {
    if (!grupos[r.rotina_id]) {
      grupos[r.rotina_id] = {
        id: r.rotina_id,
        nome: r.rotina_nome,
        categoria: r.categoria_nome,
        registros: []
      };
    }

    grupos[r.rotina_id].registros.push(r);
  });

  return Object.values(grupos).map(grupo => {
    const indicadores = calcularIndicadoresHistoricos_(grupo.registros);

    return {
      id: grupo.id,
      nome: grupo.nome,
      categoria: grupo.categoria,
      total: indicadores.total,
      concluidas: indicadores.concluidas,
      taxaConclusao: Number(indicadores.taxaConclusao.toFixed(2)),
      duracaoMedia: Number(indicadores.duracaoMedia.toFixed(2)),
      pontualidade: Number(indicadores.taxaPontualidade.toFixed(2))
    };
  }).sort((a, b) => {
    if (b.taxaConclusao !== a.taxaConclusao) {
      return b.taxaConclusao - a.taxaConclusao;
    }

    return b.total - a.total;
  });
}

function montarResumoCategorias_(registros) {
  const grupos = {};

  registros.forEach(r => {
    if (!grupos[r.categoria_id]) {
      grupos[r.categoria_id] = {
        id: r.categoria_id,
        nome: r.categoria_nome,
        registros: []
      };
    }

    grupos[r.categoria_id].registros.push(r);
  });

  return Object.values(grupos).map(grupo => {
    const indicadores = calcularIndicadoresHistoricos_(grupo.registros);

    return {
      id: grupo.id,
      nome: grupo.nome,
      total: indicadores.total,
      concluidas: indicadores.concluidas,
      taxaConclusao: Number(indicadores.taxaConclusao.toFixed(2)),
      duracaoMedia: Number(indicadores.duracaoMedia.toFixed(2)),
      pontualidade: Number(indicadores.taxaPontualidade.toFixed(2))
    };
  }).sort((a, b) => b.total - a.total);
}

function calcularVariacao_(atual, anterior, tipo) {
  if (tipo === 'percentual') {
    return Number((atual - anterior).toFixed(2));
  }

  if (!anterior) {
    return atual ? null : 0;
  }

  return Number(((atual - anterior) / Math.abs(anterior) * 100).toFixed(2));
}

// ======================================================
// DASHBOARD GERENCIAL — API PRINCIPAL
// ======================================================

function getAnaliseHistorica(filtros) {
  filtros = filtros || {};

  const todosRegistros = lerCSV_();
  const hoje = obterHoje_();

  let dataFim = dataValida_(filtros.dataFim)
    ? filtros.dataFim
    : hoje;

  let dataInicio = dataValida_(filtros.dataInicio)
    ? filtros.dataInicio
    : adicionarDias_(dataFim, -29);

  if (dataInicio > dataFim) {
    const temporaria = dataInicio;
    dataInicio = dataFim;
    dataFim = temporaria;
  }

  const filtrosAplicados = {
    dataInicio: dataInicio,
    dataFim: dataFim,
    categoria: filtros.categoria || 'todos',
    rotina: filtros.rotina || 'todos',
    status: filtros.status || 'todos'
  };

  const registrosPeriodo = filtrarRegistrosHistoricos_(
    todosRegistros,
    filtrosAplicados
  );

  const quantidadeDias = diferencaDias_(dataInicio, dataFim);
  const periodoAnteriorFim = adicionarDias_(dataInicio, -1);
  const periodoAnteriorInicio = adicionarDias_(
    periodoAnteriorFim,
    -(quantidadeDias - 1)
  );

  const filtrosAnteriores = {
    dataInicio: periodoAnteriorInicio,
    dataFim: periodoAnteriorFim,
    categoria: filtrosAplicados.categoria,
    rotina: filtrosAplicados.rotina,
    status: filtrosAplicados.status
  };

  const registrosAnteriores = filtrarRegistrosHistoricos_(
    todosRegistros,
    filtrosAnteriores
  );

  const atual = calcularIndicadoresHistoricos_(registrosPeriodo);
  const anterior = calcularIndicadoresHistoricos_(registrosAnteriores);

  const agrupamento = obterAgrupamento_(
    dataInicio,
    dataFim,
    filtros.agrupamento
  );

  return {
    filtros: {
      dataInicio: dataInicio,
      dataFim: dataFim,
      periodoAnteriorInicio: periodoAnteriorInicio,
      periodoAnteriorFim: periodoAnteriorFim,
      agrupamento: agrupamento
    },

    indicadores: {
      totalExecucoes: atual.total,
      concluidas: atual.concluidas,
      outrosStatus: atual.outrosStatus,
      taxaConclusao: Number(atual.taxaConclusao.toFixed(2)),
      duracaoMedia: Number(atual.duracaoMedia.toFixed(2)),
      taxaPontualidade: Number(atual.taxaPontualidade.toFixed(2)),
      totalComHorarioComparavel: atual.totalComHorarioComparavel,

      variacaoTotal: calcularVariacao_(
        atual.total, anterior.total, 'relativo'
      ),

      variacaoConclusao: calcularVariacao_(
        atual.taxaConclusao, anterior.taxaConclusao, 'percentual'
      ),

      variacaoDuracao: calcularVariacao_(
        atual.duracaoMedia, anterior.duracaoMedia, 'relativo'
      ),

      variacaoPontualidade: calcularVariacao_(
        atual.taxaPontualidade, anterior.taxaPontualidade, 'percentual'
      ),

      periodoAnterior: {
        totalExecucoes: anterior.total,
        concluidas: anterior.concluidas,
        taxaConclusao: Number(anterior.taxaConclusao.toFixed(2)),
        duracaoMedia: Number(anterior.duracaoMedia.toFixed(2)),
        taxaPontualidade: Number(anterior.taxaPontualidade.toFixed(2))
      }
    },

    evolucao: montarEvolucao_(
      registrosPeriodo,
      dataInicio,
      dataFim,
      agrupamento
    ),

    rankingRotinas: montarRankingRotinas_(registrosPeriodo),

    categorias: montarResumoCategorias_(registrosPeriodo),

    quantidadeRegistros: registrosPeriodo.length
  };
}

// ======================================================
// HISTÓRICO DETALHADO — MANTIDO E COM FILTROS OPCIONAIS
// ======================================================

function getHistorico(filtros) {
  const registros = lerCSV_();

  let filtrados = registros;

  if (filtros && Object.keys(filtros).length) {
    filtrados = filtrarRegistrosHistoricos_(registros, {
      dataInicio: filtros.dataInicio || '',
      dataFim: filtros.dataFim || '',
      categoria: filtros.categoria || 'todos',
      rotina: filtros.rotina || 'todos',
      status: filtros.status || 'todos'
    });
  }

  filtrados.sort((a, b) => {
    const dataA = a.inicio || a.data_prevista + 'T' + a.horario_previsto;
    const dataB = b.inicio || b.data_prevista + 'T' + b.horario_previsto;

    return dataB.localeCompare(dataA);
  });

  const limite = filtros && filtros.semLimite
    ? filtrados.length
    : CONFIG.LIMITE_HISTORICO;

  return filtrados
    .slice(0, limite)
    .map(r => ({
      id: r.id,
      rotina: r.rotina_nome,
      rotinaId: r.rotina_id,
      categoria: r.categoria_nome,
      categoriaId: r.categoria_id,
      data: r.data_prevista,
      horarioPrevisto: r.horario_previsto,
      inicio: formatarDataHora_(r.inicio),
      fim: formatarDataHora_(r.fim),
      horarioExecucao: r.inicio ? formatarDataHora_(r.inicio) : '-',
      duracao: formatarDuracao_(r.duracao_segundos),
      duracaoSegundos: r.duracao_segundos,
      responsavel: '-',
      status: r.status,
      observacao: r.observacao
    }));
}

// ======================================================
// DIAGNÓSTICO
// ======================================================

function testarLeituraCSV() {
  const registros = lerCSV_();

  Logger.log('Registros encontrados: ' + registros.length);
  Logger.log(JSON.stringify(registros.slice(0, 5), null, 2));

  return {
    quantidade: registros.length,
    amostra: registros.slice(0, 5),
    mensagem: 'Leitura do CSV realizada com sucesso.'
  };
}

function diagnosticarCSV() {
  const arquivo = getArquivoCSV_();
  const registros = lerCSV_();

  Logger.log('========== DIAGNÓSTICO CSV ==========');
  Logger.log('Arquivo: ' + arquivo.getName());
  Logger.log('Última atualização: ' + arquivo.getLastUpdated());
  Logger.log('Tamanho: ' + arquivo.getSize() + ' bytes');
  Logger.log('Registros: ' + registros.length);
  Logger.log(JSON.stringify(registros.slice(0, 5), null, 2));
  Logger.log('========== FIM DO DIAGNÓSTICO ==========');

  return {
    arquivo: arquivo.getName(),
    ultimaAtualizacao: arquivo.getLastUpdated(),
    quantidade: registros.length
  };
}
