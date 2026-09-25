/* ============================================================
   EduCore — Dados e regras de negócio
   ============================================================ */

const SITUACAO_THRESHOLDS = {
  aprovado: 6,
  recuperacaoMin: 4,
};

const BIMESTRES = [1, 2, 3, 4];

let students = [
  { id: 1, name: "João Silva", turma: "2º DS", matricula: "2001" },
  { id: 2, name: "Maria Santos", turma: "2º DS", matricula: "2002" },
  { id: 3, name: "Carlos Oliveira", turma: "2º DS", matricula: "2003" },
  { id: 4, name: "Ana Souza", turma: "2º DS", matricula: "2004" },
  { id: 5, name: "Lucas Ferreira", turma: "2º DS", matricula: "2005" },
];

let activities = [
  {
    id: 1,
    name: "Introdução ao JavaScript",
    description: "Exercícios de lógica e variáveis",
    maxValue: 10,
    bimestre: 1,
  },
  {
    id: 2,
    name: "Estruturas Condicionais",
    description: "Exercícios utilizando if e else",
    maxValue: 10,
    bimestre: 1,
  },
  {
    id: 3,
    name: "Projeto HTML e CSS",
    description: "Desenvolvimento de uma página web",
    maxValue: 10,
    bimestre: 2,
  },
];

let grades = [
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
];

let nextStudentId = 6;
let nextActivityId = 4;

let currentView = "dashboard";

/* ============================================================
   Helpers de dados
   ============================================================ */

function getStudent(id) {
  return students.find((s) => s.id === id);
}

function getActivity(id) {
  return activities.find((a) => a.id === id);
}

function getGradesByStudent(studentId) {
  return grades.filter((g) => g.studentId === studentId);
}

function getGrade(studentId, activityId) {
  return grades.find(
    (g) => g.studentId === studentId && g.activityId === activityId,
  );
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

function calcMediaTurma(bimestre) {
  const medias = students
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
  return "";
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

/* ============================================================
   Navegação
   ============================================================ */

const viewTitles = {
  dashboard: ["Dashboard", "2º Desenvolvimento de Sistemas"],
  alunos: ["Alunos", "Gerenciamento da turma"],
  atividades: ["Atividades", "Cadastro e edição de atividades"],
  notas: ["Notas", "Lançamento e consulta de notas"],
  desempenho: ["Desempenho", "Análise de resultados da turma"],
  config: ["Configurações", "Ajustes do sistema"],
};

function goToView(view) {
  currentView = view;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `view-${view}`);
  });

  const [title, subtitle] = viewTitles[view];
  document.getElementById("topbar-title").textContent = title;
  document.getElementById("topbar-subtitle").textContent = subtitle;

  renderAll();
}

/* ============================================================
   Render — Dashboard
   ============================================================ */

function renderDashboard() {
  const total = students.length;
  const mediaTurma = calcMediaTurma();
  const bom = students.filter((s) => {
    const m = calcMediaAluno(s.id);
    return m !== null && m >= SITUACAO_THRESHOLDS.aprovado;
  }).length;
  const atencao = students.filter((s) => {
    const m = calcMediaAluno(s.id);
    return m === null || m < SITUACAO_THRESHOLDS.aprovado;
  }).length;

  document.getElementById("stat-strip").innerHTML = `
    <div class="stat">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Alunos na turma</div>
    </div>
    <div class="stat">
      <div class="stat-value is-accent">${mediaTurma !== null ? formatNota(mediaTurma) : "—"}</div>
      <div class="stat-label">Média geral da turma</div>
    </div>
    <div class="stat">
      <div class="stat-value">${bom}</div>
      <div class="stat-label">Com bom desempenho</div>
    </div>
    <div class="stat">
      <div class="stat-value">${atencao}</div>
      <div class="stat-label">Precisam de atenção</div>
    </div>
  `;

  const emAtencao = students
    .map((s) => ({ student: s, media: calcMediaAluno(s.id) }))
    .filter(
      (item) =>
        item.media === null || item.media < SITUACAO_THRESHOLDS.aprovado,
    )
    .sort((a, b) => (a.media ?? -1) - (b.media ?? -1));

  const attentionList = document.getElementById("attention-list");
  if (emAtencao.length === 0) {
    attentionList.innerHTML = `<p class="empty-inline">Nenhum aluno precisa de atenção no momento.</p>`;
  } else {
    attentionList.innerHTML = emAtencao
      .slice(0, 6)
      .map((item) => {
        const situacao = getSituacao(item.media);
        return `
        <div class="attention-row">
          <div>
            <div class="attention-name">${item.student.name}</div>
            <div class="attention-turma">${item.student.turma}</div>
          </div>
          <div class="attention-meta">
            <span class="attention-media">${formatNota(item.media)}</span>
            <span class="tag ${situacaoTagClass(situacao)}">${situacao}</span>
          </div>
        </div>
      `;
      })
      .join("");
  }

  const recent = [...activities].sort((a, b) => b.id - a.id).slice(0, 4);
  document.getElementById("recent-activities").innerHTML = recent
    .map((a) => {
      const lancadas = grades.filter((g) => g.activityId === a.id).length;
      return `
      <div class="recent-row">
        <div class="recent-title">${a.name}</div>
        <div class="recent-meta">
          <span>${a.bimestre}º bimestre</span>
          <span>·</span>
          <span>${lancadas} de ${students.length} notas lançadas</span>
        </div>
      </div>
    `;
    })
    .join("");

  renderBimesterBars("bimester-overview", (bimestre) =>
    calcMediaTurma(bimestre),
  );
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

/* ============================================================
   Render — Alunos
   ============================================================ */

function renderAlunos() {
  const termo = document
    .getElementById("aluno-search")
    .value.trim()
    .toLowerCase();
  const filtroSituacao = document.getElementById("aluno-filter-situacao").value;

  let lista = students.filter((s) => s.name.toLowerCase().includes(termo));

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
      return `
      <tr>
        <td>
          <div class="student-cell">
            <strong onclick="openAlunoDetail(${s.id})">${s.name}</strong>
          </div>
        </td>
        <td class="num">${s.matricula}</td>
        <td>${s.turma}</td>
        <td class="num">${formatNota(media)}</td>
        <td><span class="tag ${situacaoTagClass(situacao)}">${situacao}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn--ghost btn--small" onclick="openAlunoForm(${s.id})">Editar</button>
            <button class="btn btn--ghost btn--small" onclick="deleteAluno(${s.id})">Excluir</button>
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

  openModal(
    titulo,
    `
    <form id="form-aluno">
      <div class="field" style="margin-bottom:14px;">
        <label for="f-aluno-nome">Nome completo</label>
        <input type="text" id="f-aluno-nome" value="${aluno ? aluno.name : ""}" required>
      </div>
      <div class="form-grid">
        <div class="field">
          <label for="f-aluno-turma">Turma</label>
          <input type="text" id="f-aluno-turma" value="${aluno ? aluno.turma : "2º DS"}" required>
        </div>
        <div class="field">
          <label for="f-aluno-matricula">Matrícula</label>
          <input type="text" id="f-aluno-matricula" value="${aluno ? aluno.matricula : ""}" required>
        </div>
      </div>
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
    const turma = document.getElementById("f-aluno-turma").value.trim();
    const matricula = document.getElementById("f-aluno-matricula").value.trim();

    if (aluno) {
      aluno.name = nome;
      aluno.turma = turma;
      aluno.matricula = matricula;
    } else {
      students.push({ id: nextStudentId++, name: nome, turma, matricula });
    }

    closeModal();
    renderAll();
  });
}

function deleteAluno(id) {
  const aluno = getStudent(id);
  if (
    !confirm(
      `Excluir "${aluno.name}"? As notas lançadas para este aluno também serão removidas.`,
    )
  )
    return;

  students = students.filter((s) => s.id !== id);
  grades = grades.filter((g) => g.studentId !== id);
  renderAll();
}

function openAlunoDetail(id) {
  const aluno = getStudent(id);
  const notasAluno = getGradesByStudent(id);
  const media = calcMediaAluno(id);
  const situacao = getSituacao(media);

  const linhasAtividades = activities
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
    <div class="detail-sub">${aluno.turma} · Matrícula ${aluno.matricula}</div>
    <div class="detail-stats">
      <div>
        <div class="detail-stat-value">${formatNota(media)}</div>
        <div class="detail-stat-label">Média geral</div>
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

/* ============================================================
   Render — Atividades
   ============================================================ */

function renderAtividades() {
  const filtro = document.getElementById("atividade-filter-bimestre").value;
  let lista = [...activities].sort(
    (a, b) => a.bimestre - b.bimestre || a.id - b.id,
  );

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
      const lancadas = grades.filter((g) => g.activityId === a.id).length;
      return `
      <div class="activity-card">
        <div class="activity-top">
          <span class="activity-name">${a.name}</span>
          <span class="activity-bimestre">${a.bimestre}º Bim.</span>
        </div>
        <p class="activity-desc">${a.description}</p>
        <div class="activity-foot">
          <span class="activity-value">Valor: ${formatNota(a.maxValue)} · ${lancadas}/${students.length} notas</span>
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
      <div class="form-grid">
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

    if (atividade) {
      atividade.name = name;
      atividade.description = description;
      atividade.maxValue = maxValue;
      atividade.bimestre = bimestre;
    } else {
      activities.push({
        id: nextActivityId++,
        name,
        description,
        maxValue,
        bimestre,
      });
    }

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

  activities = activities.filter((a) => a.id !== id);
  grades = grades.filter((g) => g.activityId !== id);
  renderAll();
}

/* ============================================================
   Render — Notas
   ============================================================ */

function renderNotas() {
  const selectAluno = document.getElementById("nota-aluno");
  const selectAtividade = document.getElementById("nota-atividade");

  selectAluno.innerHTML = students
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join("");
  selectAtividade.innerHTML = activities
    .map(
      (a) => `<option value="${a.id}">${a.name} (${a.bimestre}º bim.)</option>`,
    )
    .join("");

  const thead = document.getElementById("notas-thead");
  thead.innerHTML = `
    <tr>
      <th>Aluno</th>
      ${activities.map((a) => `<th>${a.name}</th>`).join("")}
      <th>Média</th>
    </tr>
  `;

  const tbody = document.getElementById("notas-tbody");
  tbody.innerHTML = students
    .map((s) => {
      const celulas = activities
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
    grades.push({ studentId, activityId, value: valor });
  }

  valorInput.value = "";
  renderAll();
}

/* ============================================================
   Render — Desempenho
   ============================================================ */

function renderDesempenho() {
  const select = document.getElementById("desempenho-aluno-select");
  const selecionado = select.value || "turma";

  select.innerHTML =
    `<option value="turma">Turma inteira</option>` +
    students
      .map(
        (s) =>
          `<option value="${s.id}" ${String(s.id) === selecionado ? "selected" : ""}>${s.name}</option>`,
      )
      .join("");
  select.value = selecionado;

  const strip = document.getElementById("desempenho-strip");

  if (selecionado === "turma") {
    const todasNotas = grades.map((g) => g.value);
    const media = calcMediaTurma();
    strip.innerHTML = `
      <div class="stat">
        <div class="stat-value is-accent">${media !== null ? formatNota(media) : "—"}</div>
        <div class="stat-label">Média da turma</div>
      </div>
      <div class="stat">
        <div class="stat-value">${todasNotas.length ? formatNota(Math.max(...todasNotas)) : "—"}</div>
        <div class="stat-label">Maior nota lançada</div>
      </div>
      <div class="stat">
        <div class="stat-value">${todasNotas.length ? formatNota(Math.min(...todasNotas)) : "—"}</div>
        <div class="stat-label">Menor nota lançada</div>
      </div>
      <div class="stat">
        <div class="stat-value">${grades.length}</div>
        <div class="stat-label">Notas lançadas no total</div>
      </div>
    `;

    renderSituacaoBreakdown();
    renderBimesterBars("desempenho-bimestre", (b) => calcMediaTurma(b));
  } else {
    const id = Number(selecionado);
    const aluno = getStudent(id);
    const notasAluno = getGradesByStudent(id).map((g) => g.value);
    const media = calcMediaAluno(id);
    const situacao = getSituacao(media);

    strip.innerHTML = `
      <div class="stat">
        <div class="stat-value is-accent">${formatNota(media)}</div>
        <div class="stat-label">Média individual — ${aluno.name}</div>
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

function renderSituacaoBreakdown() {
  const total = students.length || 1;
  const grupos = ["Aprovado", "Recuperação", "Insuficiente"].map((situacao) => {
    const count = students.filter(
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

/* ============================================================
   Modal genérico
   ============================================================ */

function openModal(titulo, corpoHTML) {
  document.getElementById("modal-title").textContent = titulo;
  document.getElementById("modal-body").innerHTML = corpoHTML;
  document.getElementById("modal-overlay").classList.add("is-open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("is-open");
  document.getElementById("modal-body").innerHTML = "";
}

/* ============================================================
   Render geral
   ============================================================ */

function renderAll() {
  renderDashboard();
  renderAlunos();
  renderAtividades();
  renderNotas();
  renderDesempenho();
}

/* ============================================================
   Inicialização e eventos
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => goToView(btn.dataset.view));
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });

  document
    .getElementById("btn-novo-aluno")
    .addEventListener("click", () => openAlunoForm(null));
  document
    .getElementById("aluno-search")
    .addEventListener("input", renderAlunos);
  document
    .getElementById("aluno-filter-situacao")
    .addEventListener("change", renderAlunos);

  document
    .getElementById("btn-nova-atividade")
    .addEventListener("click", () => openAtividadeForm(null));
  document
    .getElementById("atividade-filter-bimestre")
    .addEventListener("change", renderAtividades);

  document
    .getElementById("form-notas")
    .addEventListener("submit", handleLancarNota);

  document
    .getElementById("desempenho-aluno-select")
    .addEventListener("change", renderDesempenho);

  goToView("dashboard");
});
