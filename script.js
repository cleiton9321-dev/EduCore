/* ================================================================
   EduCore — script.js
   Organização:
     DADOS · AUTENTICAÇÃO · TURMAS · ALUNOS · ATIVIDADES · NOTAS
     FREQUÊNCIA · ATESTADOS · DESEMPENHO · DASHBOARD · INTERFACE · EVENTOS
   ================================================================ */

/* ================================================================
   DADOS — modelo e persistência (localStorage)
   ================================================================ */

const SITUACAO_THRESHOLDS = { aprovado: 6, recuperacaoMin: 4 };
const FREQUENCIA_ALERTA_MIN = 80; // % abaixo disso vira alerta
const BIMESTRES = [1, 2, 3, 4];
const STORAGE_KEY = "educore_dados_v1";
const SESSION_KEY = "educore_sessao_v1";

function seedData() {
  return {
    nextIds: { turma: 3, aluno: 6, atividade: 4, frequencia: 1, atestado: 1, usuario: 2 },

    turmas: [
      {
        id: 1,
        nome: "2º Desenvolvimento de Sistemas A",
        codigo: 2,
        descricao: "Turma regular, período noturno.",
        nextSeq: 6,
      },
      {
        id: 2,
        nome: "2º Desenvolvimento de Sistemas B",
        codigo: 3,
        descricao: "",
        nextSeq: 1,
      },
    ],

    students: [
      { id: 1, name: "João Silva", turmaId: 1, matricula: "2001", email: "" },
      { id: 2, name: "Maria Santos", turmaId: 1, matricula: "2002", email: "" },
      { id: 3, name: "Carlos Oliveira", turmaId: 1, matricula: "2003", email: "" },
      { id: 4, name: "Ana Souza", turmaId: 1, matricula: "2004", email: "" },
      { id: 5, name: "Lucas Ferreira", turmaId: 1, matricula: "2005", email: "" },
    ],

    activities: [
      {
        id: 1,
        name: "Introdução ao JavaScript",
        description: "Exercícios de lógica e variáveis",
        maxValue: 10,
        bimestre: 1,
        dataEntrega: "2026-09-28",
      },
      {
        id: 2,
        name: "Estruturas Condicionais",
        description: "Exercícios utilizando if e else",
        maxValue: 10,
        bimestre: 1,
        dataEntrega: "2026-09-30",
      },
      {
        id: 3,
        name: "Projeto HTML e CSS",
        description: "Desenvolvimento de uma página web",
        maxValue: 10,
        bimestre: 2,
        dataEntrega: "2026-10-15",
      },
    ],

    grades: [
      { studentId: 1, activityId: 1, value: 8.5 },
      { studentId: 1, activityId: 2, value: 7.5 },
      { studentId: 1, activityId: 3, value: 9.0 },

      { studentId: 2, activityId: 1, value: 9.0 },
      { studentId: 2, activityId: 2, value: 8.0 },
      { studentId: 2, activityId: 3, value: 8.5 },

      { studentId: 3, activityId: 1, value: 5.5 },
      { studentId: 3, activityId: 2, value: 4.0 },
      { studentId: 3, activityId: 3, value: 6.0 },

      { studentId: 4, activityId: 1, value: 3.0 },
      { studentId: 4, activityId: 2, value: 4.5 },
      { studentId: 4, activityId: 3, value: 3.5 },

      { studentId: 5, activityId: 1, value: 7.0 },
      { studentId: 5, activityId: 2, value: 6.5 },
    ],

    // cada registro representa uma chamada (turma + data + aula) com a lista de presenças
    frequencias: [
      {
        id: 1,
        turmaId: 1,
        data: "2026-09-18",
        aula: "JavaScript",
        registros: [
          { alunoId: 1, status: "presente" },
          { alunoId: 2, status: "presente" },
          { alunoId: 3, status: "falta" },
          { alunoId: 4, status: "presente" },
          { alunoId: 5, status: "presente" },
        ],
      },
      {
        id: 2,
        turmaId: 1,
        data: "2026-09-23",
        aula: "HTML e CSS",
        registros: [
          { alunoId: 1, status: "presente" },
          { alunoId: 2, status: "presente" },
          { alunoId: 3, status: "falta" },
          { alunoId: 4, status: "falta" },
          { alunoId: 5, status: "presente" },
        ],
      },
    ],

    atestados: [],

    usuarios: [
      {
        id: 1,
        tipo: "educador",
        nome: "Profa. Patrícia Souza",
        email: "patricia@educore.com",
        senha: "educore123",
      },
    ],
  };
}

let DB = null;

function carregarDados() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (bruto) {
      DB = JSON.parse(bruto);
      return;
    }
  } catch (e) {
    console.warn("Não foi possível ler o localStorage, iniciando com dados padrão.", e);
  }
  DB = seedData();
  salvarDados();
}

function salvarDados() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  } catch (e) {
    console.warn("Não foi possível salvar no localStorage.", e);
  }
}

function proximoId(entidade) {
  const id = DB.nextIds[entidade];
  DB.nextIds[entidade] = id + 1;
  return id;
}

/* ================================================================
   Helper de ligação segura de eventos.
   Evita que um elemento inexistente (ID errado, HTML desatualizado
   etc.) derrube a inicialização inteira do sistema com um
   "Cannot read properties of null (reading 'addEventListener')".
   ================================================================ */

function on(id, evento, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, handler);
  return el;
}

/* ================================================================
   AUTENTICAÇÃO
   ================================================================ */

let sessao = null; // { tipo: 'educador' | 'aluno', usuarioId, alunoId? }

function carregarSessao() {
  try {
    const bruto = localStorage.getItem(SESSION_KEY);
    if (bruto) sessao = JSON.parse(bruto);
  } catch (e) {
    sessao = null;
  }
}

function salvarSessao() {
  if (sessao) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Navegação central de telas de nível superior (autenticação + os
 * dois aplicativos). Esconde todas as .screen e mostra somente a
 * pedida, através da classe "is-active" (ver .screen / .screen.is-active
 * em style.css). É a ÚNICA função que deve alternar entre:
 *   screen-inicial, screen-login-educador, screen-cadastro-aluno,
 *   screen-login-aluno, app-educador, app-aluno.
 *
 * A navegação *dentro* de cada aplicativo (dashboard, turmas, alunos...
 * ou início, notas, frequência...) é feita por goToView() / goToAlunoView(),
 * que já centralizam a troca das .view — o menu lateral permanece
 * visível o tempo todo.
 */
function mostrarScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("is-active"));
  const alvo = document.getElementById(id);
  if (alvo) alvo.classList.add("is-active");
}

function loginEducador(email, senha) {
  const usuario = DB.usuarios.find(
    (u) => u.tipo === "educador" && u.email.toLowerCase() === email.toLowerCase() && u.senha === senha,
  );
  if (!usuario) return false;
  sessao = { tipo: "educador", usuarioId: usuario.id };
  salvarSessao();
  return true;
}

function loginAluno(identificador, senha) {
  const termo = identificador.trim().toLowerCase();
  const usuario = DB.usuarios.find((u) => {
    if (u.tipo !== "aluno" || u.senha !== senha) return false;
    const aluno = getStudent(u.alunoId);
    if (!aluno) return false;
    return (
      u.email.toLowerCase() === termo || aluno.matricula.toLowerCase() === termo
    );
  });
  if (!usuario) return false;
  sessao = { tipo: "aluno", usuarioId: usuario.id, alunoId: usuario.alunoId };
  salvarSessao();
  return true;
}

function cadastrarAluno({ nome, email, senha, turmaId }) {
  const emailExiste = DB.usuarios.some(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (emailExiste) {
    return { ok: false, erro: "Já existe uma conta com este e-mail." };
  }

  const aluno = criarAluno({ name: nome, turmaId, email });

  const usuario = {
    id: proximoId("usuario"),
    tipo: "aluno",
    email,
    senha,
    alunoId: aluno.id,
  };
  DB.usuarios.push(usuario);
  salvarDados();
  return { ok: true, aluno };
}

function logout() {
  sessao = null;
  salvarSessao();
  mostrarScreen("screen-inicial");
}

function usuarioAtualEducador() {
  if (!sessao || sessao.tipo !== "educador") return null;
  return DB.usuarios.find((u) => u.id === sessao.usuarioId) || null;
}

function alunoLogado() {
  if (!sessao || sessao.tipo !== "aluno") return null;
  return getStudent(sessao.alunoId) || null;
}

/* ================================================================
   TURMAS
   ================================================================ */

function getTurma(id) {
  return DB.turmas.find((t) => t.id === id);
}

function alunosDaTurma(turmaId) {
  return DB.students.filter((s) => s.turmaId === turmaId);
}

function codigoTurmaEmUso(codigo, ignorarId) {
  return DB.turmas.some((t) => t.codigo === codigo && t.id !== ignorarId);
}

function criarTurma({ nome, codigo, descricao }) {
  const turma = {
    id: proximoId("turma"),
    nome,
    codigo,
    descricao: descricao || "",
    nextSeq: 1,
  };
  DB.turmas.push(turma);
  salvarDados();
  return turma;
}

function atualizarTurma(id, { nome, codigo, descricao }) {
  const turma = getTurma(id);
  if (!turma) return;
  turma.nome = nome;
  turma.codigo = codigo;
  turma.descricao = descricao || "";
  salvarDados();
}

function excluirTurma(id) {
  const vinculados = alunosDaTurma(id);
  if (vinculados.length > 0) {
    alert(
      `Não é possível excluir esta turma: existem ${vinculados.length} aluno(s) vinculado(s). Remova ou transfira os alunos primeiro.`,
    );
    return false;
  }
  DB.turmas = DB.turmas.filter((t) => t.id !== id);
  DB.frequencias = DB.frequencias.filter((f) => f.turmaId !== id);
  salvarDados();
  return true;
}

function gerarMatricula(turmaId) {
  const turma = getTurma(turmaId);
  const numero = turma.nextSeq;
  turma.nextSeq += 1;
  return `${turma.codigo}${String(numero).padStart(3, "0")}`;
}

function frequenciaMediaTurma(turmaId) {
  const alunos = alunosDaTurma(turmaId);
  if (alunos.length === 0) return null;
  const valores = alunos
    .map((a) => calcFrequenciaAluno(a.id))
    .filter((v) => v !== null);
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/* ================================================================
   ALUNOS
   ================================================================ */

function getStudent(id) {
  return DB.students.find((s) => s.id === id);
}

function getGradesByStudent(studentId) {
  return DB.grades.filter((g) => g.studentId === studentId);
}

function getGrade(studentId, activityId) {
  return DB.grades.find(
    (g) => g.studentId === studentId && g.activityId === activityId,
  );
}

function criarAluno({ name, turmaId, email }) {
  const matricula = gerarMatricula(turmaId);
  const aluno = {
    id: proximoId("aluno"),
    name,
    turmaId,
    matricula,
    email: email || "",
  };
  DB.students.push(aluno);
  salvarDados();
  return aluno;
}

function atualizarAluno(id, { name }) {
  const aluno = getStudent(id);
  if (!aluno) return;
  aluno.name = name;
  salvarDados();
}

function excluirAluno(id) {
  DB.students = DB.students.filter((s) => s.id !== id);
  DB.grades = DB.grades.filter((g) => g.studentId !== id);
  DB.frequencias.forEach((f) => {
    f.registros = f.registros.filter((r) => r.alunoId !== id);
  });
  DB.atestados = DB.atestados.filter((a) => a.alunoId !== id);
  const usuario = DB.usuarios.find((u) => u.tipo === "aluno" && u.alunoId === id);
  if (usuario) DB.usuarios = DB.usuarios.filter((u) => u !== usuario);
  salvarDados();
}

function calcMediaAluno(studentId, bimestre) {
  let list = getGradesByStudent(studentId);
  if (bimestre) {
    list = list.filter((g) => getActivity(g.activityId).bimestre === bimestre);
  }
  if (list.length === 0) return null;

  let somaNotas = 0;
  let somaMaximos = 0;
  list.forEach((g) => {
    const atividade = getActivity(g.activityId);
    somaNotas += g.value;
    somaMaximos += atividade.maxValue;
  });

  return (somaNotas / somaMaximos) * 10;
}

function calcMediaTurma(bimestre, turmaId) {
  const alunos = turmaId ? alunosDaTurma(turmaId) : DB.students;
  const medias = alunos
    .map((s) => calcMediaAluno(s.id, bimestre))
    .filter((m) => m !== null);
  if (medias.length === 0) return null;
  return medias.reduce((a, b) => a + b, 0) / medias.length;
}

function getSituacao(media) {
  if (media === null || media === undefined) return "Sem notas";
  if (media >= SITUACAO_THRESHOLDS.aprovado) return "Aprovado";
  if (media >= SITUACAO_THRESHOLDS.recuperacaoMin) return "Recuperação";
  return "Insuficiente";
}

function situacaoTagClass(situacao) {
  if (situacao === "Aprovado") return "tag--success";
  if (situacao === "Recuperação") return "tag--warning";
  if (situacao === "Insuficiente") return "tag--danger";
  return "tag--neutral";
}

function situacaoBarClass(situacao) {
  if (situacao === "Aprovado") return "is-success";
  if (situacao === "Recuperação") return "is-warning";
  return "is-danger";
}

function formatNota(valor) {
  if (valor === null || valor === undefined) return "—";
  return valor.toFixed(1).replace(".", ",");
}

function formatData(iso) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/* ================================================================
   ATIVIDADES
   ================================================================ */

function getActivity(id) {
  return DB.activities.find((a) => a.id === id);
}

/* ================================================================
   FREQUÊNCIA
   ================================================================ */

function getRegistroFrequencia(turmaId, data, aula) {
  return DB.frequencias.find(
    (f) => f.turmaId === turmaId && f.data === data && f.aula === aula,
  );
}

function salvarChamada(turmaId, data, aula, registros) {
  let registro = getRegistroFrequencia(turmaId, data, aula);
  if (registro) {
    registro.registros = registros;
  } else {
    registro = { id: proximoId("frequencia"), turmaId, data, aula, registros };
    DB.frequencias.push(registro);
  }
  salvarDados();
  return registro;
}

function registrosDoAluno(alunoId) {
  const lista = [];
  DB.frequencias.forEach((f) => {
    const r = f.registros.find((reg) => reg.alunoId === alunoId);
    if (r) lista.push({ data: f.data, aula: f.aula, status: r.status, frequenciaId: f.id });
  });
  return lista.sort((a, b) => (a.data < b.data ? 1 : -1));
}

function calcFrequenciaAluno(alunoId) {
  const registros = registrosDoAluno(alunoId);
  if (registros.length === 0) return null;
  const presencas = registros.filter(
    (r) => r.status === "presente" || r.status === "justificada",
  ).length;
  return (presencas / registros.length) * 100;
}

function situacaoFrequenciaLabel(status) {
  if (status === "presente") return "Presente";
  if (status === "falta") return "Falta";
  return "Falta justificada";
}

function situacaoFrequenciaTag(status) {
  if (status === "presente") return "tag--success";
  if (status === "falta") return "tag--danger";
  return "tag--neutral";
}

/* ================================================================
   ATESTADOS
   ================================================================ */

function criarAtestado({ alunoId, data, descricao, arquivoNome }) {
  const atestado = {
    id: proximoId("atestado"),
    alunoId,
    data,
    descricao,
    arquivoNome: arquivoNome || "",
    status: "Em análise",
  };
  DB.atestados.push(atestado);
  salvarDados();
  return atestado;
}

function atualizarStatusAtestado(id, status) {
  const atestado = DB.atestados.find((a) => a.id === id);
  if (!atestado) return;
  atestado.status = status;

  if (status === "Aprovado") {
    // procura um registro de falta do aluno na mesma data e transforma em justificada
    DB.frequencias.forEach((f) => {
      if (f.data !== atestado.data) return;
      const registro = f.registros.find(
        (r) => r.alunoId === atestado.alunoId && r.status === "falta",
      );
      if (registro) registro.status = "justificada";
    });
  }

  salvarDados();
}

/* ================================================================
   DESEMPENHO / ALERTAS
   ================================================================ */

function atividadesPendentesAluno(alunoId) {
  return DB.activities.filter((a) => !getGrade(alunoId, a.id));
}

function gerarAlertas() {
  const alertas = [];

  DB.students.forEach((aluno) => {
    const media = calcMediaAluno(aluno.id);
    const freq = calcFrequenciaAluno(aluno.id);
    const pendentes = atividadesPendentesAluno(aluno.id).length;
    const motivos = [];

    if (media === null) {
      motivos.push("Sem notas lançadas");
    } else if (media < SITUACAO_THRESHOLDS.aprovado) {
      motivos.push(`Média ${formatNota(media)}`);
    }

    if (freq !== null && freq < FREQUENCIA_ALERTA_MIN) {
      motivos.push(`Frequência ${Math.round(freq)}%`);
    }

    if (pendentes > 0) {
      motivos.push(`${pendentes} atividade(s) pendente(s)`);
    }

    if (motivos.length > 0) {
      alertas.push({ aluno, media, freq, motivos });
    }
  });

  const atestadosPendentes = DB.atestados.filter((a) => a.status === "Em análise");

  return { alunos: alertas, atestadosPendentes };
}

/* ================================================================
   DASHBOARD (educador)
   ================================================================ */

const viewTitles = {
  dashboard: ["Dashboard", "Todas as turmas"],
  turmas: ["Turmas", "Gerenciamento das turmas"],
  alunos: ["Alunos", "Gerenciamento dos alunos"],
  atividades: ["Atividades", "Cadastro e edição de atividades"],
  notas: ["Notas", "Lançamento e consulta de notas"],
  frequencia: ["Frequência", "Registro de presença por turma"],
  desempenho: ["Desempenho", "Análise de resultados"],
  atestados: ["Atestados", "Análise de justificativas de falta"],
  alertas: ["Alertas", "Situações que merecem atenção"],
  configuracoes: ["Configurações", "Perfil, aparência e acessibilidade"],
};

let currentView = "dashboard";
let currentAlunoView = "inicio";

/**
 * Navegação central das views internas do ambiente do educador.
 * Encontra todas as .view, remove "is-active" de todas e adiciona
 * somente na view solicitada — mesma lógica pedida para mostrarScreen,
 * aplicada ao segundo nível de navegação.
 */
function goToView(view) {
  currentView = view;

  document.querySelectorAll("#app-educador .nav-item[data-view]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });

  document.querySelectorAll("#app-educador .view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `view-${view}`);
  });

  const [title, subtitle] = viewTitles[view];
  document.getElementById("topbar-title").textContent = title;
  document.getElementById("topbar-subtitle").textContent = subtitle;

  renderAll();
}

function goToAlunoView(view) {
  currentAlunoView = view;

  document.querySelectorAll("#app-aluno .nav-item[data-aview]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.aview === view);
  });

  document.querySelectorAll("#app-aluno .view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `aview-${view}`);
  });

  const titles = {
    inicio: ["Início", ""],
    notas: ["Minhas notas", "Suas notas por atividade"],
    frequencia: ["Frequência", "Seu histórico de presença"],
    atividades: ["Atividades", "Pendentes e concluídas"],
    atestados: ["Atestados", "Envio e acompanhamento"],
  };
  const [title, subtitle] = titles[view];
  document.getElementById("aluno-topbar-title").textContent = title;
  document.getElementById("aluno-topbar-subtitle").textContent = subtitle;

  renderAlunoApp();
}

/* ---------- Render dashboard ---------- */

function renderDashboard() {
  const total = DB.students.length;
  const totalTurmas = DB.turmas.length;
  const mediaGeral = calcMediaTurma();
  const freqGeral = (() => {
    const valores = DB.students
      .map((s) => calcFrequenciaAluno(s.id))
      .filter((v) => v !== null);
    if (valores.length === 0) return null;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  })();
  const pendentesTotal = DB.students.reduce(
    (soma, s) => soma + atividadesPendentesAluno(s.id).length,
    0,
  );
  const { alunos: emAtencao, atestadosPendentes } = gerarAlertas();

  document.getElementById("stat-strip").innerHTML = `
    <div class="stat">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Alunos</div>
    </div>
    <div class="stat">
      <div class="stat-value">${totalTurmas}</div>
      <div class="stat-label">Turmas</div>
    </div>
    <div class="stat">
      <div class="stat-value is-accent">${mediaGeral !== null ? formatNota(mediaGeral) : "—"}</div>
      <div class="stat-label">Média geral</div>
    </div>
    <div class="stat">
      <div class="stat-value">${freqGeral !== null ? Math.round(freqGeral) + "%" : "—"}</div>
      <div class="stat-label">Frequência média</div>
    </div>
    <div class="stat">
      <div class="stat-value">${pendentesTotal}</div>
      <div class="stat-label">Atividades pendentes</div>
    </div>
    <div class="stat">
      <div class="stat-value">${emAtencao.length}</div>
      <div class="stat-label">Alunos em atenção</div>
    </div>
    <div class="stat">
      <div class="stat-value">${atestadosPendentes.length}</div>
      <div class="stat-label">Atestados aguardando</div>
    </div>
  `;

  const attentionList = document.getElementById("attention-list");
  if (emAtencao.length === 0) {
    attentionList.innerHTML = `<p class="empty-inline">Nenhum aluno precisa de atenção no momento.</p>`;
  } else {
    attentionList.innerHTML = emAtencao
      .slice(0, 6)
      .map((item) => {
        const turma = getTurma(item.aluno.turmaId);
        return `
        <div class="attention-row">
          <div>
            <div class="attention-name">${item.aluno.name}</div>
            <div class="attention-turma">${turma ? turma.nome : "—"}</div>
          </div>
          <div class="attention-meta">
            <span class="attention-reason">${item.motivos.join(" · ")}</span>
          </div>
        </div>
      `;
      })
      .join("");
  }

  const recent = [...DB.activities].sort((a, b) => b.id - a.id).slice(0, 4);
  document.getElementById("recent-activities").innerHTML = recent
    .map((a) => {
      const lancadas = DB.grades.filter((g) => g.activityId === a.id).length;
      return `
      <div class="recent-row">
        <div>
          <div class="recent-title">${a.name}</div>
          <div class="recent-meta">
            <span>${a.bimestre}º bimestre</span>
            <span>·</span>
            <span>${lancadas} de ${DB.students.length} notas lançadas</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  renderBimesterBars("bimester-overview", (bimestre) => calcMediaTurma(bimestre));

  document.getElementById("dashboard-turmas").innerHTML = DB.turmas
    .map((t) => {
      const qtd = alunosDaTurma(t.id).length;
      const media = calcMediaTurma(null, t.id);
      return `
      <div class="recent-row">
        <div>
          <div class="recent-title">${t.nome}</div>
          <div class="recent-meta">
            <span>Código ${t.codigo}</span>
            <span>·</span>
            <span>${qtd} aluno(s)</span>
            <span>·</span>
            <span>Média ${media !== null ? formatNota(media) : "—"}</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  atualizarBadges();
}

function atualizarBadges() {
  const { alunos: emAtencao, atestadosPendentes } = gerarAlertas();
  const badgeAlertas = document.getElementById("badge-alertas");
  const badgeAtestados = document.getElementById("badge-atestados");

  if (emAtencao.length > 0) {
    badgeAlertas.hidden = false;
    badgeAlertas.textContent = emAtencao.length;
  } else {
    badgeAlertas.hidden = true;
  }

  if (atestadosPendentes.length > 0) {
    badgeAtestados.hidden = false;
    badgeAtestados.textContent = atestadosPendentes.length;
  } else {
    badgeAtestados.hidden = true;
  }
}

function renderBimesterBars(containerId, mediaFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = BIMESTRES.map((b) => {
    const media = mediaFn(b);
    const largura = media !== null ? Math.min((media / 10) * 100, 100) : 0;
    return `
      <div class="bimester-row">
        <span class="bimester-label">${b}º Bimestre</span>
        <div class="bimester-track"><div class="bimester-fill" style="width:${largura}%"></div></div>
        <span class="bimester-value">${media !== null ? formatNota(media) : "—"}</span>
      </div>
    `;
  }).join("");
}

/* ================================================================
   INTERFACE — Turmas (educador)
   ================================================================ */

function renderTurmas() {
  const grid = document.getElementById("turmas-grid");
  if (DB.turmas.length === 0) {
    grid.innerHTML = `<p class="empty-state">Nenhuma turma cadastrada.</p>`;
    return;
  }

  grid.innerHTML = DB.turmas
    .map((t) => {
      const qtd = alunosDaTurma(t.id).length;
      const media = calcMediaTurma(null, t.id);
      const freq = frequenciaMediaTurma(t.id);
      return `
      <div class="activity-card">
        <div class="activity-top">
          <span class="activity-name" onclick="openTurmaDetail(${t.id})">${t.nome}</span>
          <span class="activity-bimestre">Cód. ${t.codigo}</span>
        </div>
        <p class="activity-desc">${t.descricao || "Sem descrição."}</p>
        <div class="turma-card-stats">
          <span><strong>${qtd}</strong> aluno(s)</span>
          <span>Média <strong>${media !== null ? formatNota(media) : "—"}</strong></span>
          <span>Freq. <strong>${freq !== null ? Math.round(freq) + "%" : "—"}</strong></span>
        </div>
        <div class="activity-foot">
          <span class="activity-value"></span>
          <div class="row-actions">
            <button class="btn btn--ghost btn--small" onclick="openTurmaForm(${t.id})">Editar</button>
            <button class="btn btn--ghost btn--small" onclick="handleExcluirTurma(${t.id})">Excluir</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function openTurmaForm(id) {
  const turma = id ? getTurma(id) : null;
  const titulo = turma ? "Editar turma" : "Nova turma";

  openModal(
    titulo,
    `
    <form id="form-turma">
      <div class="field" style="margin-bottom:14px;">
        <label for="f-turma-nome">Nome da turma</label>
        <input type="text" id="f-turma-nome" value="${turma ? turma.nome : ""}" required>
      </div>
      <div class="form-grid" style="margin-bottom:14px;">
        <div class="field">
          <label for="f-turma-codigo">Código (usado na matrícula)</label>
          <input type="number" id="f-turma-codigo" min="1" step="1" value="${turma ? turma.codigo : ""}" required>
        </div>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label for="f-turma-desc">Descrição (opcional)</label>
        <textarea id="f-turma-desc">${turma ? turma.descricao : ""}</textarea>
      </div>
      <p class="auth-error" id="turma-form-error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>
  `,
  );

  document.getElementById("form-turma").addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = document.getElementById("f-turma-nome").value.trim();
    const codigo = Number(document.getElementById("f-turma-codigo").value);
    const descricao = document.getElementById("f-turma-desc").value.trim();
    const erroEl = document.getElementById("turma-form-error");

    if (codigoTurmaEmUso(codigo, turma ? turma.id : null)) {
      erroEl.textContent = "Já existe uma turma com este código.";
      erroEl.hidden = false;
      return;
    }

    if (turma) {
      atualizarTurma(turma.id, { nome, codigo, descricao });
    } else {
      criarTurma({ nome, codigo, descricao });
    }

    closeModal();
    renderAll();
  });
}

function handleExcluirTurma(id) {
  const turma = getTurma(id);
  if (!confirm(`Excluir a turma "${turma.nome}"?`)) return;
  if (excluirTurma(id)) renderAll();
}

function openTurmaDetail(id) {
  const turma = getTurma(id);
  const alunos = alunosDaTurma(id);
  const media = calcMediaTurma(null, id);
  const freq = frequenciaMediaTurma(id);

  const linhas = alunos
    .map((a) => {
      const m = calcMediaAluno(a.id);
      const situacao = getSituacao(m);
      return `
      <div class="detail-activity-row">
        <span>${a.matricula} — ${a.name}</span>
        <span class="tag ${situacaoTagClass(situacao)}">${situacao}</span>
      </div>
    `;
    })
    .join("");

  openModal(
    turma.nome,
    `
    <div class="detail-sub">Código ${turma.codigo}${turma.descricao ? " · " + turma.descricao : ""}</div>
    <div class="detail-stats">
      <div>
        <div class="detail-stat-value">${alunos.length}</div>
        <div class="detail-stat-label">Alunos</div>
      </div>
      <div>
        <div class="detail-stat-value">${media !== null ? formatNota(media) : "—"}</div>
        <div class="detail-stat-label">Média</div>
      </div>
      <div>
        <div class="detail-stat-value">${freq !== null ? Math.round(freq) + "%" : "—"}</div>
        <div class="detail-stat-label">Frequência</div>
      </div>
    </div>
    <div>${linhas || '<p class="empty-inline">Nenhum aluno vinculado.</p>'}</div>
  `,
  );
}

function preencherSelectsTurma() {
  const opcoes = DB.turmas
    .map((t) => `<option value="${t.id}">${t.nome}</option>`)
    .join("");

  const selCadastro = document.getElementById("cad-turma");
  if (selCadastro) selCadastro.innerHTML = opcoes;

  const selFiltro = document.getElementById("aluno-filter-turma");
  if (selFiltro) {
    const atual = selFiltro.value;
    selFiltro.innerHTML =
      `<option value="todas">Todas as turmas</option>` + opcoes;
    if (atual) selFiltro.value = atual;
  }

  const selFreq = document.getElementById("freq-turma");
  if (selFreq) selFreq.innerHTML = opcoes;

  const selDesempenho = document.getElementById("desempenho-turma-select");
  if (selDesempenho) {
    const atual = selDesempenho.value;
    selDesempenho.innerHTML =
      `<option value="todas">Todas as turmas</option>` + opcoes;
    if (atual) selDesempenho.value = atual;
  }
}

/* ================================================================
   INTERFACE — Alunos (educador)
   ================================================================ */

function renderAlunos() {
  const termo = document.getElementById("aluno-search").value.trim().toLowerCase();
  const filtroSituacao = document.getElementById("aluno-filter-situacao").value;
  const filtroTurma = document.getElementById("aluno-filter-turma").value;

  let lista = DB.students.filter((s) => s.name.toLowerCase().includes(termo));

  if (filtroTurma && filtroTurma !== "todas") {
    lista = lista.filter((s) => s.turmaId === Number(filtroTurma));
  }

  lista = lista.filter((s) => {
    if (filtroSituacao === "todas") return true;
    return getSituacao(calcMediaAluno(s.id)) === filtroSituacao;
  });

  const tbody = document.getElementById("alunos-tbody");
  const empty = document.getElementById("alunos-empty");

  if (lista.length === 0) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = lista
    .map((s) => {
      const media = calcMediaAluno(s.id);
      const situacao = getSituacao(media);
      const freq = calcFrequenciaAluno(s.id);
      const turma = getTurma(s.turmaId);
      return `
      <tr>
        <td>
          <div class="student-cell">
            <strong onclick="openAlunoDetail(${s.id})">${s.name}</strong>
          </div>
        </td>
        <td class="num">${s.matricula}</td>
        <td>${turma ? turma.nome : "—"}</td>
        <td class="num">${formatNota(media)}</td>
        <td class="num">${freq !== null ? Math.round(freq) + "%" : "—"}</td>
        <td><span class="tag ${situacaoTagClass(situacao)}">${situacao}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn--ghost btn--small" onclick="openAlunoForm(${s.id})">Editar</button>
            <button class="btn btn--ghost btn--small" onclick="handleExcluirAluno(${s.id})">Excluir</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function openAlunoForm(id) {
  const aluno = id ? getStudent(id) : null;
  const titulo = aluno ? "Editar aluno" : "Novo aluno";

  if (DB.turmas.length === 0) {
    alert("Cadastre uma turma antes de adicionar alunos.");
    return;
  }

  const opcoesTurma = DB.turmas
    .map(
      (t) =>
        `<option value="${t.id}" ${aluno && aluno.turmaId === t.id ? "selected" : ""}>${t.nome}</option>`,
    )
    .join("");

  openModal(
    titulo,
    `
    <form id="form-aluno">
      <div class="field" style="margin-bottom:14px;">
        <label for="f-aluno-nome">Nome completo</label>
        <input type="text" id="f-aluno-nome" value="${aluno ? aluno.name : ""}" required>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label for="f-aluno-turma">Turma</label>
        <select id="f-aluno-turma" ${aluno ? "disabled" : ""} required>${opcoesTurma}</select>
        ${aluno ? '<span class="stat-label">A turma não pode ser alterada após o cadastro, pois a matrícula é vinculada a ela.</span>' : ""}
      </div>
      ${
        aluno
          ? `<div class="field" style="margin-bottom:14px;"><label>Matrícula</label><input type="text" value="${aluno.matricula}" disabled></div>`
          : `<p class="stat-label" style="display:block;margin-bottom:14px;">A matrícula será gerada automaticamente a partir do código da turma selecionada.</p>`
      }
      <div class="form-actions">
        <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>
  `,
  );

  document.getElementById("form-aluno").addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = document.getElementById("f-aluno-nome").value.trim();

    if (aluno) {
      atualizarAluno(aluno.id, { name: nome });
    } else {
      const turmaId = Number(document.getElementById("f-aluno-turma").value);
      criarAluno({ name: nome, turmaId });
    }

    closeModal();
    renderAll();
  });
}

function handleExcluirAluno(id) {
  const aluno = getStudent(id);
  if (
    !confirm(
      `Excluir "${aluno.name}"? As notas e frequências lançadas para este aluno também serão removidas.`,
    )
  )
    return;

  excluirAluno(id);
  renderAll();
}

function openAlunoDetail(id) {
  const aluno = getStudent(id);
  const turma = getTurma(aluno.turmaId);
  const notasAluno = getGradesByStudent(id);
  const media = calcMediaAluno(id);
  const situacao = getSituacao(media);
  const freq = calcFrequenciaAluno(id);

  const linhasAtividades = DB.activities
    .map((a) => {
      const nota = getGrade(id, a.id);
      return `
      <div class="detail-activity-row">
        <span>${a.name}</span>
        <span class="num" style="font-family: var(--font-mono); font-weight:600;">
          ${nota ? formatNota(nota.value) : "—"}
        </span>
      </div>
    `;
    })
    .join("");

  openModal(
    aluno.name,
    `
    <div class="detail-sub">${turma ? turma.nome : "—"} · Matrícula ${aluno.matricula}</div>
    <div class="detail-stats">
      <div>
        <div class="detail-stat-value">${formatNota(media)}</div>
        <div class="detail-stat-label">Média geral</div>
      </div>
      <div>
        <div class="detail-stat-value">${freq !== null ? Math.round(freq) + "%" : "—"}</div>
        <div class="detail-stat-label">Frequência</div>
      </div>
      <div>
        <div class="detail-stat-value">${notasAluno.length}</div>
        <div class="detail-stat-label">Atividades avaliadas</div>
      </div>
      <div>
        <span class="tag ${situacaoTagClass(situacao)}">${situacao}</span>
        <div class="detail-stat-label" style="margin-top:6px;">Situação</div>
      </div>
    </div>
    <div>${linhasAtividades || '<p class="empty-inline">Nenhuma atividade cadastrada.</p>'}</div>
  `,
  );
}

/* ================================================================
   INTERFACE — Atividades (educador)
   ================================================================ */

function renderAtividades() {
  const filtro = document.getElementById("atividade-filter-bimestre").value;
  let lista = [...DB.activities].sort((a, b) => a.bimestre - b.bimestre || a.id - b.id);

  if (filtro !== "todos") {
    lista = lista.filter((a) => a.bimestre === Number(filtro));
  }

  const grid = document.getElementById("activity-grid");

  if (lista.length === 0) {
    grid.innerHTML = `<p class="empty-state">Nenhuma atividade neste bimestre.</p>`;
    return;
  }

  grid.innerHTML = lista
    .map((a) => {
      const lancadas = DB.grades.filter((g) => g.activityId === a.id).length;
      return `
      <div class="activity-card">
        <div class="activity-top">
          <span class="activity-name" onclick="openAtividadeForm(${a.id})">${a.name}</span>
          <span class="activity-bimestre">${a.bimestre}º Bim.</span>
        </div>
        <p class="activity-desc">${a.description}</p>
        <div class="activity-foot">
          <span class="activity-value">
            Valor: ${formatNota(a.maxValue)} · ${lancadas}/${DB.students.length} notas
            ${a.dataEntrega ? " · Entrega " + formatData(a.dataEntrega) : ""}
          </span>
          <div class="row-actions">
            <button class="btn btn--ghost btn--small" onclick="openAtividadeForm(${a.id})">Editar</button>
            <button class="btn btn--ghost btn--small" onclick="deleteAtividade(${a.id})">Excluir</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function openAtividadeForm(id) {
  const atividade = id ? getActivity(id) : null;
  const titulo = atividade ? "Editar atividade" : "Nova atividade";

  openModal(
    titulo,
    `
    <form id="form-atividade">
      <div class="field" style="margin-bottom:14px;">
        <label for="f-ativ-nome">Nome</label>
        <input type="text" id="f-ativ-nome" value="${atividade ? atividade.name : ""}" required>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label for="f-ativ-desc">Descrição</label>
        <textarea id="f-ativ-desc" required>${atividade ? atividade.description : ""}</textarea>
      </div>
      <div class="form-grid" style="margin-bottom:14px;">
        <div class="field">
          <label for="f-ativ-valor">Valor máximo</label>
          <input type="number" id="f-ativ-valor" min="1" step="0.5" value="${atividade ? atividade.maxValue : 10}" required>
        </div>
        <div class="field">
          <label for="f-ativ-bimestre">Bimestre</label>
          <select id="f-ativ-bimestre" required>
            ${BIMESTRES.map((b) => `<option value="${b}" ${atividade && atividade.bimestre === b ? "selected" : ""}>${b}º Bimestre</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label for="f-ativ-entrega">Data de entrega (opcional)</label>
        <input type="date" id="f-ativ-entrega" value="${atividade && atividade.dataEntrega ? atividade.dataEntrega : ""}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>
  `,
  );

  document.getElementById("form-atividade").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("f-ativ-nome").value.trim();
    const description = document.getElementById("f-ativ-desc").value.trim();
    const maxValue = Number(document.getElementById("f-ativ-valor").value);
    const bimestre = Number(document.getElementById("f-ativ-bimestre").value);
    const dataEntrega = document.getElementById("f-ativ-entrega").value || null;

    if (atividade) {
      atividade.name = name;
      atividade.description = description;
      atividade.maxValue = maxValue;
      atividade.bimestre = bimestre;
      atividade.dataEntrega = dataEntrega;
    } else {
      DB.activities.push({
        id: proximoId("atividade"),
        name,
        description,
        maxValue,
        bimestre,
        dataEntrega,
      });
    }

    salvarDados();
    closeModal();
    renderAll();
  });
}

function deleteAtividade(id) {
  const atividade = getActivity(id);
  if (
    !confirm(
      `Excluir "${atividade.name}"? As notas lançadas nesta atividade também serão removidas.`,
    )
  )
    return;

  DB.activities = DB.activities.filter((a) => a.id !== id);
  DB.grades = DB.grades.filter((g) => g.activityId !== id);
  salvarDados();
  renderAll();
}

/* ================================================================
   INTERFACE — Notas (educador)
   ================================================================ */

function renderNotas() {
  const selectAluno = document.getElementById("nota-aluno");
  const selectAtividade = document.getElementById("nota-atividade");

  selectAluno.innerHTML = DB.students
    .map((s) => `<option value="${s.id}">${s.name} (${s.matricula})</option>`)
    .join("");
  selectAtividade.innerHTML = DB.activities
    .map((a) => `<option value="${a.id}">${a.name} (${a.bimestre}º bim.)</option>`)
    .join("");

  const thead = document.getElementById("notas-thead");
  thead.innerHTML = `
    <tr>
      <th>Aluno</th>
      ${DB.activities.map((a) => `<th>${a.name}</th>`).join("")}
      <th>Média</th>
    </tr>
  `;

  const tbody = document.getElementById("notas-tbody");
  tbody.innerHTML = DB.students
    .map((s) => {
      const celulas = DB.activities
        .map((a) => {
          const nota = getGrade(s.id, a.id);
          return `<td class="num">${nota ? formatNota(nota.value) : "—"}</td>`;
        })
        .join("");
      const media = calcMediaAluno(s.id);
      return `
      <tr>
        <td>${s.name}</td>
        ${celulas}
        <td class="num">${formatNota(media)}</td>
      </tr>
    `;
    })
    .join("");
}

function handleLancarNota(e) {
  e.preventDefault();
  const studentId = Number(document.getElementById("nota-aluno").value);
  const activityId = Number(document.getElementById("nota-atividade").value);
  const valorInput = document.getElementById("nota-valor");
  const valor = Number(valorInput.value);
  const atividade = getActivity(activityId);

  if (valor < 0 || valor > atividade.maxValue) {
    alert(`A nota deve estar entre 0 e ${formatNota(atividade.maxValue)}.`);
    return;
  }

  const existente = getGrade(studentId, activityId);
  if (existente) {
    existente.value = valor;
  } else {
    DB.grades.push({ studentId, activityId, value: valor });
  }

  salvarDados();
  valorInput.value = "";
  renderAll();
}

/* ================================================================
   INTERFACE — Frequência (educador)
   ================================================================ */

let chamadaAtual = null; // { turmaId, data, aula }

function renderFrequenciaHistorico() {
  const tbody = document.getElementById("freq-historico-tbody");
  const empty = document.getElementById("freq-historico-empty");
  const lista = [...DB.frequencias].sort((a, b) => (a.data < b.data ? 1 : -1));

  if (lista.length === 0) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = lista
    .map((f) => {
      const turma = getTurma(f.turmaId);
      const presencas = f.registros.filter((r) => r.status !== "falta").length;
      const faltas = f.registros.filter((r) => r.status === "falta").length;
      return `
      <tr>
        <td>${formatData(f.data)}</td>
        <td>${turma ? turma.nome : "—"}</td>
        <td>${f.aula}</td>
        <td class="num">${presencas}</td>
        <td class="num">${faltas}</td>
      </tr>
    `;
    })
    .join("");
}

function carregarChamada(e) {
  e.preventDefault();
  const turmaId = Number(document.getElementById("freq-turma").value);
  const data = document.getElementById("freq-data").value;
  const aula = document.getElementById("freq-aula").value.trim();

  if (!turmaId || !data || !aula) return;

  chamadaAtual = { turmaId, data, aula };
  const alunos = alunosDaTurma(turmaId);
  const existente = getRegistroFrequencia(turmaId, data, aula);

  const wrap = document.getElementById("freq-lista-wrap");
  const hint = document.getElementById("freq-lista-hint");
  const tbody = document.getElementById("freq-tbody");

  if (alunos.length === 0) {
    wrap.hidden = true;
    alert("Esta turma ainda não possui alunos.");
    return;
  }

  wrap.hidden = false;
  const turma = getTurma(turmaId);
  hint.textContent = `${turma.nome} · ${formatData(data)} · ${aula}`;

  tbody.innerHTML = alunos
    .map((a) => {
      const registroExistente = existente
        ? existente.registros.find((r) => r.alunoId === a.id)
        : null;
      const status = registroExistente ? registroExistente.status : "presente";
      return `
      <tr data-aluno-id="${a.id}">
        <td class="num">${a.matricula}</td>
        <td>${a.name}</td>
        <td>
          <div class="attendance-toggle" data-aluno-id="${a.id}">
            <button type="button" class="is-presente ${status !== "falta" ? "is-selected" : ""}" data-status="presente">Presente</button>
            <button type="button" class="is-falta ${status === "falta" ? "is-selected" : ""}" data-status="falta">Falta</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  tbody.querySelectorAll(".attendance-toggle").forEach((toggle) => {
    toggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggle
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
      });
    });
  });
}

function handleSalvarFrequencia() {
  if (!chamadaAtual) return;
  const linhas = document.querySelectorAll("#freq-tbody tr");
  const registros = Array.from(linhas).map((linha) => {
    const alunoId = Number(linha.dataset.alunoId);
    const selecionado = linha.querySelector(".is-selected");
    const status = selecionado ? selecionado.dataset.status : "presente";
    return { alunoId, status };
  });

  salvarChamada(chamadaAtual.turmaId, chamadaAtual.data, chamadaAtual.aula, registros);
  alert("Frequência salva.");
  renderAll();
}

/* ================================================================
   INTERFACE — Desempenho (educador)
   ================================================================ */

function renderDesempenho() {
  const selectTurma = document.getElementById("desempenho-turma-select");
  const selectAluno = document.getElementById("desempenho-aluno-select");
  const turmaFiltro = selectTurma.value || "todas";

  const alunosFiltrados =
    turmaFiltro === "todas" ? DB.students : alunosDaTurma(Number(turmaFiltro));

  const selecionadoAnterior = selectAluno.value || "turma";
  selectAluno.innerHTML =
    `<option value="turma">Turma inteira</option>` +
    alunosFiltrados
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join("");

  const aindaExiste = alunosFiltrados.some((s) => String(s.id) === selecionadoAnterior);
  selectAluno.value = aindaExiste ? selecionadoAnterior : "turma";
  const selecionado = selectAluno.value;

  const strip = document.getElementById("desempenho-strip");
  const turmaIdFiltro = turmaFiltro === "todas" ? null : Number(turmaFiltro);

  if (selecionado === "turma") {
    const notasFiltradas = DB.grades.filter((g) =>
      alunosFiltrados.some((a) => a.id === g.studentId),
    );
    const media = calcMediaTurma(null, turmaIdFiltro);
    const freq = (() => {
      const valores = alunosFiltrados
        .map((a) => calcFrequenciaAluno(a.id))
        .filter((v) => v !== null);
      if (valores.length === 0) return null;
      return valores.reduce((a, b) => a + b, 0) / valores.length;
    })();
    const valores = notasFiltradas.map((g) => g.value);

    strip.innerHTML = `
      <div class="stat">
        <div class="stat-value is-accent">${media !== null ? formatNota(media) : "—"}</div>
        <div class="stat-label">Média</div>
      </div>
      <div class="stat">
        <div class="stat-value">${freq !== null ? Math.round(freq) + "%" : "—"}</div>
        <div class="stat-label">Frequência média</div>
      </div>
      <div class="stat">
        <div class="stat-value">${valores.length ? formatNota(Math.max(...valores)) : "—"}</div>
        <div class="stat-label">Maior nota lançada</div>
      </div>
      <div class="stat">
        <div class="stat-value">${valores.length ? formatNota(Math.min(...valores)) : "—"}</div>
        <div class="stat-label">Menor nota lançada</div>
      </div>
      <div class="stat">
        <div class="stat-value">${notasFiltradas.length}</div>
        <div class="stat-label">Notas lançadas no total</div>
      </div>
    `;

    renderSituacaoBreakdown(alunosFiltrados);
    renderBimesterBars("desempenho-bimestre", (b) => calcMediaTurma(b, turmaIdFiltro));
  } else {
    const id = Number(selecionado);
    const aluno = getStudent(id);
    const notasAluno = getGradesByStudent(id).map((g) => g.value);
    const media = calcMediaAluno(id);
    const situacao = getSituacao(media);
    const freq = calcFrequenciaAluno(id);

    strip.innerHTML = `
      <div class="stat">
        <div class="stat-value is-accent">${formatNota(media)}</div>
        <div class="stat-label">Média — ${aluno.name}</div>
      </div>
      <div class="stat">
        <div class="stat-value">${freq !== null ? Math.round(freq) + "%" : "—"}</div>
        <div class="stat-label">Frequência</div>
      </div>
      <div class="stat">
        <div class="stat-value">${notasAluno.length ? formatNota(Math.max(...notasAluno)) : "—"}</div>
        <div class="stat-label">Maior nota</div>
      </div>
      <div class="stat">
        <div class="stat-value">${notasAluno.length ? formatNota(Math.min(...notasAluno)) : "—"}</div>
        <div class="stat-label">Menor nota</div>
      </div>
      <div class="stat">
        <div class="stat-value">${notasAluno.length}</div>
        <div class="stat-label">Atividades realizadas</div>
      </div>
    `;

    document.getElementById("situacao-breakdown").innerHTML = `
      <div class="attention-row" style="border:none;padding:4px;">
        <span>Situação atual</span>
        <span class="tag ${situacaoTagClass(situacao)}">${situacao}</span>
      </div>
    `;

    renderBimesterBars("desempenho-bimestre", (b) => calcMediaAluno(id, b));
  }
}

function renderSituacaoBreakdown(alunos) {
  const total = alunos.length || 1;
  const grupos = ["Aprovado", "Recuperação", "Insuficiente"].map((situacao) => {
    const count = alunos.filter(
      (s) => getSituacao(calcMediaAluno(s.id)) === situacao,
    ).length;
    return { situacao, count };
  });

  document.getElementById("situacao-breakdown").innerHTML = grupos
    .map(
      (g) => `
    <div class="situacao-row">
      <span class="bimester-label">${g.situacao}</span>
      <div class="situacao-track"><div class="situacao-fill ${situacaoBarClass(g.situacao)}" style="width:${(g.count / total) * 100}%"></div></div>
      <span class="situacao-count">${g.count}</span>
    </div>
  `,
    )
    .join("");
}

/* ================================================================
   INTERFACE — Atestados (educador)
   ================================================================ */

function renderAtestadosEducador() {
  const tbody = document.getElementById("atestados-tbody");
  const empty = document.getElementById("atestados-empty");
  const lista = [...DB.atestados].sort((a, b) => (a.data < b.data ? 1 : -1));

  if (lista.length === 0) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = lista
    .map((a) => {
      const aluno = getStudent(a.alunoId);
      const statusClass =
        a.status === "Aprovado"
          ? "tag--success"
          : a.status === "Recusado"
            ? "tag--danger"
            : "tag--warning";
      const botoes =
        a.status === "Em análise"
          ? `
          <button class="btn btn--ghost btn--small" onclick="handleAtestado(${a.id}, 'Aprovado')">Aprovar</button>
          <button class="btn btn--ghost btn--small" onclick="handleAtestado(${a.id}, 'Recusado')">Recusar</button>
        `
          : "";
      return `
      <tr>
        <td>${aluno ? aluno.name : "—"}</td>
        <td>${formatData(a.data)}</td>
        <td>${a.descricao}${a.arquivoNome ? ` <span class="stat-label">(${a.arquivoNome})</span>` : ""}</td>
        <td><span class="tag ${statusClass}">${a.status}</span></td>
        <td><div class="row-actions">${botoes}</div></td>
      </tr>
    `;
    })
    .join("");
}

function handleAtestado(id, status) {
  atualizarStatusAtestado(id, status);
  renderAll();
}

/* ================================================================
   INTERFACE — Alertas (educador)
   ================================================================ */

function renderAlertas() {
  const { alunos } = gerarAlertas();
  const container = document.getElementById("alertas-list");

  if (alunos.length === 0) {
    container.innerHTML = `<p class="empty-inline">Nenhum alerta no momento.</p>`;
    return;
  }

  container.innerHTML = alunos
    .map((item) => {
      const turma = getTurma(item.aluno.turmaId);
      return `
      <div class="attention-row">
        <div>
          <div class="attention-name">${item.aluno.name}</div>
          <div class="attention-turma">${turma ? turma.nome : "—"}</div>
        </div>
        <div class="attention-meta">
          <span class="attention-reason">${item.motivos.join(" · ")}</span>
        </div>
      </div>
    `;
    })
    .join("");
}

/* ================================================================
   Modal genérico
   ================================================================ */

function openModal(titulo, corpoHTML) {
  document.getElementById("modal-title").textContent = titulo;
  document.getElementById("modal-body").innerHTML = corpoHTML;
  document.getElementById("modal-overlay").classList.add("is-open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("is-open");
  document.getElementById("modal-body").innerHTML = "";
}

/* ================================================================
   Render geral — educador
   ================================================================ */

function renderAll() {
  preencherSelectsTurma();
  renderDashboard();
  renderTurmas();
  renderAlunos();
  renderAtividades();
  renderNotas();
  renderFrequenciaHistorico();
  renderDesempenho();
  renderAtestadosEducador();
  renderAlertas();
  atualizarBadges();
  renderConfiguracoes();

  const educador = usuarioAtualEducador();
  if (educador) {
    document.getElementById("teacher-name").textContent = educador.nome;
    document.getElementById("teacher-avatar").textContent = educador.nome
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
}

/* ================================================================
   INTERFACE — Área do aluno
   ================================================================ */

function renderAlunoApp() {
  const aluno = alunoLogado();
  if (!aluno) return;

  const turma = getTurma(aluno.turmaId);
  const media = calcMediaAluno(aluno.id);
  const freq = calcFrequenciaAluno(aluno.id);
  const pendentes = atividadesPendentesAluno(aluno.id);

  document.getElementById("aluno-nome-topo").textContent = aluno.name;
  document.getElementById("aluno-matricula-topo").textContent = `Matrícula ${aluno.matricula}`;
  document.getElementById("aluno-avatar").textContent = aluno.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (currentAlunoView === "inicio") {
    document.getElementById("aluno-saudacao").textContent = `Olá, ${aluno.name.split(" ")[0]}`;
    document.getElementById("aluno-turma-info").textContent = `${turma ? turma.nome : "—"} · Matrícula ${aluno.matricula}`;

    document.getElementById("aluno-stat-strip").innerHTML = `
      <div class="stat">
        <div class="stat-value is-accent">${media !== null ? formatNota(media) : "—"}</div>
        <div class="stat-label">Média</div>
      </div>
      <div class="stat">
        <div class="stat-value">${freq !== null ? Math.round(freq) + "%" : "—"}</div>
        <div class="stat-label">Frequência</div>
      </div>
      <div class="stat">
        <div class="stat-value">${pendentes.length}</div>
        <div class="stat-label">Atividades pendentes</div>
      </div>
    `;

    const proximas = [...pendentes]
      .filter((a) => a.dataEntrega)
      .sort((a, b) => (a.dataEntrega > b.dataEntrega ? 1 : -1));

    document.getElementById("aluno-proximas-atividades").innerHTML =
      proximas.length === 0
        ? `<p class="empty-inline">Nenhuma atividade pendente com data de entrega definida.</p>`
        : proximas
            .map(
              (a) => `
        <div class="recent-row">
          <div>
            <div class="recent-title">${a.name}</div>
            <div class="recent-meta"><span>Entrega: ${formatData(a.dataEntrega)}</span></div>
          </div>
        </div>
      `,
            )
            .join("");
  }

  if (currentAlunoView === "notas") {
    const filtro = document.getElementById("aluno-notas-bimestre").value;
    let atividades = [...DB.activities];
    if (filtro !== "todos") atividades = atividades.filter((a) => a.bimestre === Number(filtro));

    const tbody = document.getElementById("aluno-notas-tbody");
    const empty = document.getElementById("aluno-notas-empty");

    if (atividades.length === 0) {
      tbody.innerHTML = "";
      empty.hidden = false;
    } else {
      empty.hidden = true;
      tbody.innerHTML = atividades
        .map((a) => {
          const nota = getGrade(aluno.id, a.id);
          return `
          <tr>
            <td>${a.name}</td>
            <td>${a.bimestre}º</td>
            <td class="num">${nota ? formatNota(nota.value) : "—"}</td>
          </tr>
        `;
        })
        .join("");
    }

    const mediaFiltrada = calcMediaAluno(aluno.id, filtro !== "todos" ? Number(filtro) : undefined);
    document.getElementById("aluno-notas-media-strip").innerHTML = `
      <div class="stat">
        <div class="stat-value is-accent">${mediaFiltrada !== null ? formatNota(mediaFiltrada) : "—"}</div>
        <div class="stat-label">Média geral</div>
      </div>
    `;
  }

  if (currentAlunoView === "frequencia") {
    document.getElementById("aluno-freq-strip").innerHTML = `
      <div class="stat">
        <div class="stat-value is-accent">${freq !== null ? Math.round(freq) + "%" : "—"}</div>
        <div class="stat-label">Frequência geral</div>
      </div>
    `;

    const registros = registrosDoAluno(aluno.id);
    const tbody = document.getElementById("aluno-freq-tbody");
    const empty = document.getElementById("aluno-freq-empty");

    if (registros.length === 0) {
      tbody.innerHTML = "";
      empty.hidden = false;
    } else {
      empty.hidden = true;
      tbody.innerHTML = registros
        .map(
          (r) => `
        <tr>
          <td>${formatData(r.data)}</td>
          <td>${r.aula}</td>
          <td><span class="tag ${situacaoFrequenciaTag(r.status)}">${situacaoFrequenciaLabel(r.status)}</span></td>
        </tr>
      `,
        )
        .join("");
    }
  }

  if (currentAlunoView === "atividades") {
    const concluidas = DB.activities.filter((a) => getGrade(aluno.id, a.id));
    const pendentesLista = pendentes;

    document.getElementById("aluno-ativ-pendentes").innerHTML =
      pendentesLista.length === 0
        ? `<p class="empty-inline">Nenhuma atividade pendente.</p>`
        : pendentesLista
            .map(
              (a) => `
        <div class="recent-row">
          <div>
            <div class="recent-title">${a.name}</div>
            <div class="recent-meta">
              <span>${a.bimestre}º bimestre</span>
              ${a.dataEntrega ? `<span>· Entrega: ${formatData(a.dataEntrega)}</span>` : ""}
            </div>
          </div>
        </div>
      `,
            )
            .join("");

    document.getElementById("aluno-ativ-concluidas").innerHTML =
      concluidas.length === 0
        ? `<p class="empty-inline">Nenhuma atividade concluída ainda.</p>`
        : concluidas
            .map((a) => {
              const nota = getGrade(aluno.id, a.id);
              return `
        <div class="recent-row">
          <div>
            <div class="recent-title">${a.name}</div>
            <div class="recent-meta"><span>${a.bimestre}º bimestre</span></div>
          </div>
          <span class="attention-media">${formatNota(nota.value)}</span>
        </div>
      `;
            })
            .join("");
  }

  if (currentAlunoView === "atestados") {
    renderAtestadosAluno(aluno.id);
  }
}

function renderAtestadosAluno(alunoId) {
  const lista = DB.atestados
    .filter((a) => a.alunoId === alunoId)
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  const tbody = document.getElementById("aluno-atestados-tbody");
  const empty = document.getElementById("aluno-atestados-empty");

  if (lista.length === 0) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = lista
    .map((a) => {
      const statusClass =
        a.status === "Aprovado"
          ? "tag--success"
          : a.status === "Recusado"
            ? "tag--danger"
            : "tag--warning";
      return `
      <tr>
        <td>${formatData(a.data)}</td>
        <td>${a.descricao}</td>
        <td>${a.arquivoNome || "—"}</td>
        <td><span class="tag ${statusClass}">${a.status}</span></td>
      </tr>
    `;
    })
    .join("");
}

function handleEnviarAtestado(e) {
  e.preventDefault();
  const aluno = alunoLogado();
  if (!aluno) return;

  const data = document.getElementById("atest-data").value;
  const descricao = document.getElementById("atest-desc").value.trim();
  const arquivoInput = document.getElementById("atest-arquivo");
  const arquivoNome = arquivoInput.files && arquivoInput.files[0] ? arquivoInput.files[0].name : "";

  criarAtestado({ alunoId: aluno.id, data, descricao, arquivoNome });

  e.target.reset();
  renderAlunoApp();
  atualizarBadges();
}

/* ================================================================
   ACESSIBILIDADE / PREFERÊNCIAS (novo)
   ================================================================
   Guarda tema, tamanho de fonte, alto contraste e redução de
   animação em localStorage e aplica tudo via atributos/classes no
   <html>, para que também valham nas telas de autenticação e na
   área do aluno — sem tocar em nenhuma lógica de dados acima.
   ================================================================ */

const PREFS_KEY = "educore_prefs_v1";

function preferenciasPadrao() {
  return {
    tema: "sistema", // 'claro' | 'escuro' | 'sistema'
    fonte: "normal", // 'pequena' | 'normal' | 'grande' | 'muitoGrande'
    altoContraste: false,
    reduzirAnimacoes: false,
  };
}

let prefs = preferenciasPadrao();

function carregarPreferencias() {
  try {
    const bruto = localStorage.getItem(PREFS_KEY);
    if (bruto) prefs = { ...preferenciasPadrao(), ...JSON.parse(bruto) };
  } catch (e) {
    prefs = preferenciasPadrao();
  }
}

function salvarPreferencias() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn("Não foi possível salvar preferências.", e);
  }
}

function temaResolvido() {
  if (prefs.tema === "sistema") {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "escuro"
      : "claro";
  }
  return prefs.tema;
}

function aplicarPreferencias() {
  const root = document.documentElement;

  root.setAttribute("data-theme", temaResolvido() === "escuro" ? "dark" : "light");

  const mapaFonte = { pequena: "small", normal: "normal", grande: "large", muitoGrande: "xlarge" };
  root.setAttribute("data-font-size", mapaFonte[prefs.fonte] || "normal");

  root.classList.toggle("high-contrast", !!prefs.altoContraste);
  root.classList.toggle("reduce-motion", !!prefs.reduzirAnimacoes);
}

/* ---------- Microinterações do login (ver style.css, seção 18) ----------
   Só adicionam/removem classes de CSS: não mudam nenhuma regra de
   autenticação. Respeitam "reduzir animações" e prefers-reduced-motion
   (nesse caso pulam também a espera artificial). */

function movimentoReduzido() {
  return (
    !!prefs.reduzirAnimacoes ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
}

// Pequena confirmação visual (~190ms) antes de entrar no sistema.
function transicionarParaApp(formEl, callback) {
  const box = formEl.closest(".auth-box");
  if (!box || movimentoReduzido()) {
    callback();
    return;
  }
  box.classList.add("is-success-transition");
  window.setTimeout(() => {
    callback();
    box.classList.remove("is-success-transition");
  }, 190);
}

// Tremor discreto no card quando o login/cadastro falha.
function sacudirErro(formEl) {
  const box = formEl.closest(".auth-box");
  if (!box || movimentoReduzido()) return;
  box.classList.remove("is-shake");
  void box.offsetWidth; // reflow: permite reiniciar a animação
  box.classList.add("is-shake");
  // animationend também "borbulha" das animações dos filhos: só limpa quando for a do próprio card
  const limpar = (ev) => {
    if (ev.target !== box) return;
    box.classList.remove("is-shake");
    box.removeEventListener("animationend", limpar);
  };
  box.addEventListener("animationend", limpar);
}

function renderConfiguracoes() {
  const secao = document.getElementById("view-configuracoes");
  if (!secao) return;

  const educador = usuarioAtualEducador();
  if (educador) {
    const nomeEl = document.getElementById("config-perfil-nome");
    const emailEl = document.getElementById("config-perfil-email");
    const avatarEl = document.getElementById("config-perfil-avatar");
    if (nomeEl) nomeEl.textContent = educador.nome;
    if (emailEl) emailEl.textContent = educador.email;
    if (avatarEl) {
      avatarEl.textContent = educador.nome
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
  }

  const radiosTema = document.querySelectorAll('input[name="config-tema"]');
  radiosTema.forEach((r) => {
    r.checked = r.value === prefs.tema;
  });

  const radiosFonte = document.querySelectorAll('input[name="config-fonte"]');
  radiosFonte.forEach((r) => {
    r.checked = r.value === prefs.fonte;
  });

  const contrasteEl = document.getElementById("config-alto-contraste");
  if (contrasteEl) contrasteEl.checked = !!prefs.altoContraste;

  const animacoesEl = document.getElementById("config-reduzir-animacoes");
  if (animacoesEl) animacoesEl.checked = !!prefs.reduzirAnimacoes;
}

function inicializarEventosConfiguracoes() {
  document.querySelectorAll('input[name="config-tema"]').forEach((r) => {
    r.addEventListener("change", () => {
      if (r.checked) {
        prefs.tema = r.value;
        salvarPreferencias();
        aplicarPreferencias();
      }
    });
  });

  document.querySelectorAll('input[name="config-fonte"]').forEach((r) => {
    r.addEventListener("change", () => {
      if (r.checked) {
        prefs.fonte = r.value;
        salvarPreferencias();
        aplicarPreferencias();
      }
    });
  });

  on("config-alto-contraste", "change", (e) => {
    prefs.altoContraste = e.target.checked;
    salvarPreferencias();
    aplicarPreferencias();
  });

  on("config-reduzir-animacoes", "change", (e) => {
    prefs.reduzirAnimacoes = e.target.checked;
    salvarPreferencias();
    aplicarPreferencias();
  });
}

/* ================================================================
   EVENTOS
   ================================================================ */

function entrarComoEducador() {
  currentView = "dashboard";
  mostrarScreen("app-educador");
  goToView("dashboard");
}

function entrarComoAluno() {
  currentAlunoView = "inicio";
  mostrarScreen("app-aluno");
  goToAlunoView("inicio");
}

function inicializarNavegacaoAuth() {
  on("btn-ir-educador", "click", () => mostrarScreen("screen-login-educador"));

  on("btn-ir-cadastro-aluno", "click", () => {
    preencherSelectsTurma();
    mostrarScreen("screen-cadastro-aluno");
  });

  on("btn-ir-login-aluno", "click", () => mostrarScreen("screen-login-aluno"));

  on("link-ir-cadastro", "click", (e) => {
    e.preventDefault();
    preencherSelectsTurma();
    mostrarScreen("screen-cadastro-aluno");
  });

  document.querySelectorAll(".auth-back").forEach((btn) => {
    btn.addEventListener("click", () => mostrarScreen(btn.dataset.back));
  });

  on("form-login-educador", "submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("ed-email").value.trim();
    const senha = document.getElementById("ed-senha").value;
    const erroEl = document.getElementById("ed-login-error");

    if (loginEducador(email, senha)) {
      erroEl.hidden = true;
      const form = e.target;
      form.reset();
      transicionarParaApp(form, entrarComoEducador);
    } else {
      erroEl.textContent = "E-mail ou senha inválidos.";
      erroEl.hidden = false;
      sacudirErro(e.target);
    }
  });

  on("form-cadastro-aluno", "submit", (e) => {
    e.preventDefault();
    const nome = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim();
    const senha = document.getElementById("cad-senha").value;
    const turmaId = Number(document.getElementById("cad-turma").value);
    const erroEl = document.getElementById("cad-aluno-error");

    if (!turmaId) {
      erroEl.textContent = "Cadastre uma turma antes de criar contas de aluno.";
      erroEl.hidden = false;
      sacudirErro(e.target);
      return;
    }

    const resultado = cadastrarAluno({ nome, email, senha, turmaId });
    if (!resultado.ok) {
      erroEl.textContent = resultado.erro;
      erroEl.hidden = false;
      sacudirErro(e.target);
      return;
    }

    erroEl.hidden = true;
    e.target.reset();
    alert(
      `Conta criada com sucesso. Sua matrícula é ${resultado.aluno.matricula}. Você já pode fazer login.`,
    );
    mostrarScreen("screen-login-aluno");
  });

  on("form-login-aluno", "submit", (e) => {
    e.preventDefault();
    const identificador = document.getElementById("al-identificador").value;
    const senha = document.getElementById("al-senha").value;
    const erroEl = document.getElementById("al-login-error");

    if (loginAluno(identificador, senha)) {
      erroEl.hidden = true;
      const form = e.target;
      form.reset();
      transicionarParaApp(form, entrarComoAluno);
    } else {
      erroEl.textContent = "Matrícula/e-mail ou senha inválidos.";
      erroEl.hidden = false;
      sacudirErro(e.target);
    }
  });
}

function inicializarEventosEducador() {
  document.querySelectorAll("#app-educador .nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => goToView(btn.dataset.view));
  });

  on("btn-logout-educador", "click", logout);
  on("btn-nova-turma", "click", () => openTurmaForm(null));
  on("btn-novo-aluno", "click", () => openAlunoForm(null));
  on("aluno-search", "input", renderAlunos);
  on("aluno-filter-situacao", "change", renderAlunos);
  on("aluno-filter-turma", "change", renderAlunos);
  on("btn-nova-atividade", "click", () => openAtividadeForm(null));
  on("atividade-filter-bimestre", "change", renderAtividades);
  on("form-notas", "submit", handleLancarNota);
  on("form-frequencia-config", "submit", carregarChamada);
  on("btn-salvar-frequencia", "click", handleSalvarFrequencia);

  on("desempenho-turma-select", "change", () => {
    const selAluno = document.getElementById("desempenho-aluno-select");
    if (selAluno) selAluno.value = "turma";
    renderDesempenho();
  });
  on("desempenho-aluno-select", "change", renderDesempenho);

  inicializarEventosConfiguracoes();
}

function inicializarEventosAluno() {
  document.querySelectorAll("#app-aluno .nav-item[data-aview]").forEach((btn) => {
    btn.addEventListener("click", () => goToAlunoView(btn.dataset.aview));
  });

  on("btn-logout-aluno", "click", logout);
  on("aluno-notas-bimestre", "change", renderAlunoApp);
  on("form-atestado-aluno", "submit", handleEnviarAtestado);
}

document.addEventListener("DOMContentLoaded", () => {
  carregarPreferencias();
  aplicarPreferencias();

  carregarDados();
  carregarSessao();

  inicializarNavegacaoAuth();
  inicializarEventosEducador();
  inicializarEventosAluno();

  on("modal-close", "click", closeModal);
  on("modal-overlay", "click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });

  preencherSelectsTurma();

  if (sessao && sessao.tipo === "educador" && usuarioAtualEducador()) {
    entrarComoEducador();
  } else if (sessao && sessao.tipo === "aluno" && alunoLogado()) {
    entrarComoAluno();
  } else {
    sessao = null;
    salvarSessao();
    mostrarScreen("screen-inicial");
  }
});