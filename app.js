import {
  analyzeHooks,
  analyzeRisks,
  generateHooks,
  inspectStructure,
  makeRiskSafeSuggestions,
  textPreview,
  todayISO,
} from "./core.js";
import {
  CloudStore,
  LocalStore,
  clearCloudConfig,
  getCloudConfig,
  getActiveStore,
  saveCloudConfig,
  testCloudConnection,
} from "./storage.js";

const EDITOR_DRAFT_KEY = "softcopy-studio-editor-draft";

const SAMPLE_SOURCE = `标题：劝玻璃胃猫家长，先别急着跟风买乳铁蛋白

上个月换季，我家猫一天打十几个喷嚏，眼角总是糊糊的，软便也反反复复。最开始看到很多人推荐，我就跟风买了一款，结果吃了两天又开始软便。

后来换了一款便宜的，喷嚏还是照打，猫也不爱吃。钱花了双份，猫受了两茬罪。我当时真的又气又自责。

后来一个养了五年猫的朋友来家里，看我手忙脚乱喂药才提醒我：选乳铁不能只看含量，还要看适口性和肠胃能不能接受。她让我先少量试，不要一次买太多。

我才开始认真看成分和喂法，也不再只看“高含量”几个字。`;

const SAMPLE_REVIEW = `标题：跟风买乳铁蛋白结果踩大雷了……

上个月换季，我家猫突然开始打喷嚏，一天能打十几个，软便也反反复复。看到很多人推荐乳铁蛋白，我就跟风买了一款，结果喂了两天就开始窜稀。

后来换了一款，喷嚏照打、软便照旧，猫还不爱吃。那几天我真的又气又自责。

最后换的这款说是活性乳铁蛋白，能抑制病毒繁殖，250mg刚好是猫能吸收的上限。喂了不到两周，黄脓鼻涕变成清涕，软便也稳住了，喷嚏再也没有了。

健康猫就选别家，玻璃胃和杯状猫闭眼入这一款，肯定不会错。`;

const state = {
  activeStore: LocalStore,
  activeView: "home",
  articles: [],
  activeArticleId: null,
  activeArticle: null,
  cloudSession: null,
  editorAnalysis: null,
  draftTimer: null,
};

const elements = {
  views: [...document.querySelectorAll(".view")],
  navButtons: [...document.querySelectorAll("[data-view-link]")],
  metricGrid: document.querySelector("#home-metrics"),
  recentList: document.querySelector("#recent-list"),
  storagePill: document.querySelector("#storage-pill"),
  storageLabel: document.querySelector("#storage-label"),
  settingsButton: document.querySelector("#settings-button"),
  settingsDialog: document.querySelector("#settings-dialog"),
  hookInput: document.querySelector("#hook-input"),
  hookResults: document.querySelector("#hook-results"),
  reviewInput: document.querySelector("#review-input"),
  reviewResults: document.querySelector("#review-results"),
  editorId: document.querySelector("#editor-id"),
  editorTitle: document.querySelector("#editor-title"),
  editorProduct: document.querySelector("#editor-product"),
  editorStatus: document.querySelector("#editor-status"),
  editorDate: document.querySelector("#editor-date"),
  editorBody: document.querySelector("#editor-body"),
  editorSourceNotes: document.querySelector("#editor-source-notes"),
  editorNotes: document.querySelector("#editor-notes"),
  editorAnalysis: document.querySelector("#editor-analysis"),
  libraryContainer: document.querySelector("#article-library"),
  librarySearch: document.querySelector("#library-search"),
  libraryStatusFilter: document.querySelector("#library-status-filter"),
  librarySubtitle: document.querySelector("#library-subtitle"),
  importFileInput: document.querySelector("#import-file-input"),
  authSignedOut: document.querySelector("#auth-signed-out"),
  authSignedIn: document.querySelector("#auth-signed-in"),
  signedInEmail: document.querySelector("#signed-in-email"),
  localModeCard: document.querySelector("#local-mode-card"),
  cloudModeCard: document.querySelector("#cloud-mode-card"),
  supabaseUrl: document.querySelector("#supabase-url"),
  supabaseKey: document.querySelector("#supabase-key"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  generatedHooks: document.querySelector("#generated-hooks"),
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll("\n", "&#10;");
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `article-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function formatShortDate(value) {
  if (!value) return "未标日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatFullDate(value) {
  if (!value) return "未标日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function statusClass(status) {
  if (status === "已发布") return "published";
  if (status === "已提交") return "submitted";
  return "";
}

function severityRank(severity) {
  return { high: 0, medium: 1, low: 2 }[severity] ?? 3;
}

function showToast(message, type = "success") {
  const container = document.querySelector("#toast-region");
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.textContent = message;
  container.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function switchView(viewName) {
  state.activeView = viewName;
  for (const view of elements.views) {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  }
  for (const button of elements.navButtons) {
    button.classList.toggle(
      "is-active",
      button.dataset.viewLink === viewName,
    );
  }
  if (viewName === "library") renderLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStorageStatus(mode, detail = "") {
  elements.storagePill.classList.toggle("is-cloud", mode === "cloud");
  elements.storageLabel.textContent =
    mode === "cloud"
      ? detail || "云端同步"
      : mode === "pending"
        ? "云端待登录"
        : "本机保存";
}

async function reloadStoreAndArticles() {
  const config = getCloudConfig();
  let session = null;
  if (config) {
    try {
      const cloudStore = new CloudStore();
      session = await cloudStore.getSession();
      if (session) {
        state.activeStore = cloudStore;
        state.cloudSession = session;
        setStorageStatus("cloud", session.user?.email || "云端同步");
      } else {
        state.activeStore = LocalStore;
        state.cloudSession = null;
        setStorageStatus("pending");
      }
    } catch {
      state.activeStore = LocalStore;
      state.cloudSession = null;
      setStorageStatus("pending");
    }
  } else {
    state.activeStore = await getActiveStore();
    state.cloudSession = null;
    setStorageStatus("local");
  }

  state.articles = await state.activeStore.listArticles();
  renderMetrics();
  renderRecentArticles();
  renderLibrary();
  renderAuthState();
}

function renderMetrics() {
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay() || 7;
  startOfWeek.setDate(startOfWeek.getDate() - day + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const thisWeek = state.articles.filter(
    (article) => new Date(article.updatedAt) >= startOfWeek,
  ).length;
  const riskCount = state.articles.reduce(
    (total, article) => total + (article.riskAnalysis?.high || 0),
    0,
  );
  elements.metricGrid.innerHTML = `
    <article class="metric-card">
      <span>已保存</span>
      <strong>${state.articles.length}</strong>
      <small>篇软文</small>
    </article>
    <article class="metric-card">
      <span>本周修改</span>
      <strong>${thisWeek}</strong>
      <small>篇</small>
    </article>
    <article class="metric-card">
      <span>高风险记录</span>
      <strong>${riskCount}</strong>
      <small>处</small>
    </article>`;
}

function articleButton(article) {
  return `
    <button class="recent-item" type="button" data-open-article="${escapeAttribute(article.id)}">
      <span class="recent-date">${escapeHTML(formatShortDate(article.createdAt))}</span>
      <span class="recent-copy">
        <strong>${escapeHTML(article.title || "未命名软文")}</strong>
        <small>${escapeHTML(article.product || article.status || "未分类")}</small>
      </span>
      <span class="status-badge ${statusClass(article.status)}">${escapeHTML(article.status || "草稿")}</span>
    </button>`;
}

function renderRecentArticles() {
  if (!state.articles.length) {
    elements.recentList.innerHTML = `
      <div class="empty-state">
        <strong>还没有保存过软文</strong>
        <p>写好的稿子会按日期出现在这里。</p>
      </div>`;
    return;
  }
  elements.recentList.innerHTML = state.articles.slice(0, 3).map(articleButton).join("");
}

function hookResultHTML(result) {
  const hookCards = result.hooks.length
    ? result.hooks
        .map(
          (hook) => `
            <article class="hook-result-card">
              <div class="hook-result-head">
                <strong>${escapeHTML(hook.label)}</strong>
                <span>${hook.inOpening ? "开头出现" : "正文出现"} · ${hook.count} 次</span>
              </div>
              <p>${hook.examples.map((example) => `“${escapeHTML(example)}”`).join("、")}</p>
              <p>${escapeHTML(hook.advice)}</p>
            </article>`,
        )
        .join("")
    : `
      <div class="hook-result-card">
        <div class="hook-result-head">
          <strong>没有识别到明显钩子</strong>
        </div>
        <p>试着把具体场景、前后反差或者一句劝告放到标题和前两行。</p>
      </div>`;

  const suggestions = result.suggestions.length
    ? `<ul class="advice-list">${result.suggestions.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`
    : `<ul class="advice-list"><li>开头已经有多类钩子，检查事实和原创表达即可。</li></ul>`;

  return `
    <div class="analysis-header">
      <div>
        <h3>钩子完整度</h3>
        <p>${escapeHTML(result.opening || "还没有可分析的正文")}</p>
      </div>
      <div class="score-ring" style="--score:${result.score}">
        <strong>${result.score}</strong>
      </div>
    </div>
    <section class="analysis-section">
      <h4>识别到的钩子</h4>
      <div class="tag-row">
        ${result.hookTypes.map((type) => `<span class="tag">${escapeHTML(type)}</span>`).join("") || '<span class="tag">暂未识别</span>'}
      </div>
    </section>
    <section class="analysis-section">
      <h4>逐项判断</h4>
      ${hookCards}
    </section>
    <section class="analysis-section">
      <h4>还能怎么改</h4>
      ${suggestions}
    </section>`;
}

function runHookAnalysis() {
  const text = elements.hookInput.value.trim();
  if (!text) {
    showToast("先粘贴一篇文案。", "error");
    elements.hookInput.focus();
    return;
  }
  const result = analyzeHooks(text);
  elements.hookResults.innerHTML = hookResultHTML(result);
}

function riskIssueHTML(issue) {
  const severityText = {
    high: "高风险",
    medium: "需注意",
    low: "可优化",
  }[issue.severity];
  return `
    <article class="issue-card risk-${escapeAttribute(issue.severity)}">
      <div class="issue-head">
        <strong>${escapeHTML(issue.label)}</strong>
        <span class="severity ${escapeAttribute(issue.severity)}">${severityText}</span>
      </div>
      <p class="quoted-phrase">命中：${escapeHTML(issue.phrase)}</p>
      ${issue.sentence && issue.sentence !== issue.phrase ? `<p>原句：${escapeHTML(issue.sentence)}</p>` : ""}
      <p>${escapeHTML(issue.advice)}</p>
    </article>`;
}

function riskResultHTML(risk, structure) {
  const sortedIssues = [...risk.issues].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
  const issueSection = sortedIssues.length
    ? `<div class="issue-list">${sortedIssues.map(riskIssueHTML).join("")}</div>`
    : `<ul class="advice-list"><li>没有扫到明显风险，仍需逐句核对事实。</li></ul>`;
  const structureSuggestions = structure.suggestions.length
    ? `<ul class="structure-list">${structure.suggestions.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`
    : `<ul class="structure-list"><li>长度和段落节奏没有明显问题。</li></ul>`;

  return `
    <div class="analysis-header">
      <div>
        <h3>文案安全度</h3>
        <p>${escapeHTML(risk.summary)}</p>
      </div>
      <div class="score-ring" style="--score:${risk.score}">
        <strong>${risk.score}</strong>
      </div>
    </div>
    <section class="analysis-section">
      <h4>风险概况</h4>
      <div class="tag-row">
        <span class="tag">高风险 ${risk.high}</span>
        <span class="tag">需注意 ${risk.medium}</span>
        <span class="tag">可优化 ${risk.low}</span>
      </div>
    </section>
    <section class="analysis-section">
      <h4>逐条问题</h4>
      ${issueSection}
    </section>
    <section class="analysis-section">
      <h4>结构与长度</h4>
      <div class="tag-row">
        <span class="tag">${structure.totalLength} 字</span>
        <span class="tag">${structure.paragraphCount} 段</span>
        <span class="tag">${structure.sentenceCount} 句</span>
      </div>
      <div style="height:10px"></div>
      ${structureSuggestions}
    </section>`;
}

function runReviewAnalysis() {
  const text = elements.reviewInput.value.trim();
  if (!text) {
    showToast("先把文案粘贴进来。", "error");
    elements.reviewInput.focus();
    return;
  }
  const risk = analyzeRisks(text);
  const structure = inspectStructure(text);
  elements.reviewResults.innerHTML = riskResultHTML(risk, structure);
}

function sendReviewToEditor() {
  const text = elements.reviewInput.value.trim();
  if (!text) {
    showToast("先粘贴一篇文案。", "error");
    return;
  }
  const firstLine = text.split("\n").find(Boolean) || "";
  elements.editorTitle.value = firstLine
    .replace(/^标题[:：]\s*/, "")
    .slice(0, 80);
  elements.editorBody.value = text
    .split("\n")
    .filter((line, index) => !(index === 0 && /^标题[:：]/.test(line)))
    .join("\n")
    .trim();
  state.activeArticleId = null;
  state.activeArticle = null;
  switchView("create");
  showToast("已放进编辑器，可以继续修改。");
}

function editorFormData() {
  const selectedDate = elements.editorDate.value || todayISO();
  const title = elements.editorTitle.value.trim();
  const body = elements.editorBody.value.trim();
  return {
    id: state.activeArticleId || elements.editorId.value || newId(),
    title,
    body,
    product: elements.editorProduct.value.trim(),
    status: elements.editorStatus.value,
    sourceNotes: elements.editorSourceNotes.value.trim(),
    notes: elements.editorNotes.value.trim(),
    date: selectedDate,
  };
}

function buildArticle({ makeVersion = false } = {}) {
  const form = editorFormData();
  if (!form.title) {
    showToast("先写一个标题再保存。", "error");
    elements.editorTitle.focus();
    return null;
  }
  if (!form.body) {
    showToast("正文还是空的。", "error");
    elements.editorBody.focus();
    return null;
  }
  const combined = `${form.title}\n${form.body}`;
  const hookAnalysis = analyzeHooks(combined);
  const riskAnalysis = analyzeRisks(combined);
  const structureAnalysis = inspectStructure(combined);
  const timestamp = nowISO();
  const existing = state.activeArticle;
  const versions = [...(existing?.versions || [])];
  if (makeVersion && existing) {
    versions.push({
      id: newId(),
      savedAt: timestamp,
      title: existing.title,
      body: existing.body,
      product: existing.product,
      status: existing.status,
      notes: existing.notes,
    });
  }
  const createdAt =
    existing?.createdAt ||
    new Date(`${form.date}T12:00:00`).toISOString();
  return {
    id: form.id,
    title: form.title,
    body: form.body,
    product: form.product,
    status: form.status,
    sourceNotes: form.sourceNotes,
    notes: form.notes,
    hookAnalysis,
    riskAnalysis,
    structureAnalysis,
    versions,
    createdAt,
    updatedAt: timestamp,
  };
}

async function saveEditor({ makeVersion = false } = {}) {
  const article = buildArticle({ makeVersion });
  if (!article) return;
  try {
    const saved = await state.activeStore.saveArticle(article);
    state.activeArticle = saved;
    state.activeArticleId = saved.id;
    elements.editorId.value = saved.id;
    clearTimeout(state.draftTimer);
    localStorage.removeItem(EDITOR_DRAFT_KEY);
    await reloadStoreAndArticles();
    state.activeArticle = saved;
    state.activeArticleId = saved.id;
    showToast(makeVersion ? "已保存一个新版本。" : "软文已保存。");
    renderEditorAnalysis();
    renderEditorVersions(saved);
  } catch (error) {
    showToast(error.message || "保存失败，请稍后再试。", "error");
  }
}

function renderEditorAnalysis() {
  const title = elements.editorTitle.value.trim();
  const body = elements.editorBody.value.trim();
  if (!title && !body) {
    showToast("先写一点内容再检查。", "error");
    return;
  }
  const combined = `${title}\n${body}`;
  const hooks = analyzeHooks(combined);
  const risk = analyzeRisks(combined);
  const structure = inspectStructure(combined);
  state.editorAnalysis = { hooks, risk, structure };
  elements.editorAnalysis.innerHTML = `
    <div class="analysis-header">
      <div>
        <h3>当前稿</h3>
        <p>${structure.totalLength} 字 · ${risk.high} 个高风险</p>
      </div>
      <div class="score-ring" style="--score:${risk.score}">
        <strong>${risk.score}</strong>
      </div>
    </div>
    <section class="analysis-section">
      <h4>钩子</h4>
      <div class="tag-row">
        ${hooks.hookTypes.map((type) => `<span class="tag">${escapeHTML(type)}</span>`).join("") || '<span class="tag">暂未识别</span>'}
      </div>
    </section>
    <section class="analysis-section">
      <h4>优先处理</h4>
      ${
        risk.issues.length
          ? `<div class="issue-list">${[...risk.issues]
              .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
              .slice(0, 4)
              .map(riskIssueHTML)
              .join("")}</div>`
          : `<ul class="advice-list"><li>没有扫到明显高风险，继续核对事实。</li></ul>`
      }
    </section>
    <section class="analysis-section">
      <h4>长度建议</h4>
      <ul class="structure-list">
        ${
          structure.suggestions
            .map((item) => `<li>${escapeHTML(item)}</li>`)
            .join("") ||
          "<li>长度和段落没有明显问题。</li>"
        }
      </ul>
    </section>
    <section class="analysis-section">
      <h4>修改边界提示</h4>
      <p class="helper-text">${escapeHTML(risk.summary)} 工具只抓规则命中的风险，事实与合规口径仍要人工确认。</p>
    </section>`;
}

function renderEditorVersions(article) {
  if (!article?.versions?.length) return;
  const html = `
    <section class="analysis-section">
      <h4>历史版本</h4>
      <ul class="structure-list">
        ${article.versions
          .slice()
          .reverse()
          .map(
            (version) =>
              `<li>${escapeHTML(formatFullDate(version.savedAt))}：${escapeHTML(version.title || "未命名")}</li>`,
          )
          .join("")}
      </ul>
    </section>`;
  elements.editorAnalysis.insertAdjacentHTML("beforeend", html);
}

function clearEditor() {
  clearTimeout(state.draftTimer);
  state.activeArticleId = null;
  state.activeArticle = null;
  elements.editorId.value = "";
  elements.editorTitle.value = "";
  elements.editorProduct.value = "";
  elements.editorStatus.value = "草稿";
  elements.editorDate.value = todayISO();
  elements.editorBody.value = "";
  elements.editorSourceNotes.value = "";
  elements.editorNotes.value = "";
  elements.editorAnalysis.innerHTML = `
    <div class="empty-result compact-empty">
      <span class="result-symbol">↗</span>
      <strong>边写边看</strong>
      <p>点“检查当前稿”后，这里会显示钩子、风险和长度建议。</p>
    </div>`;
  localStorage.removeItem(EDITOR_DRAFT_KEY);
}

function loadArticle(id) {
  const article = state.articles.find((item) => item.id === id);
  if (!article) return;
  state.activeArticle = article;
  state.activeArticleId = article.id;
  elements.editorId.value = article.id;
  elements.editorTitle.value = article.title || "";
  elements.editorProduct.value = article.product || "";
  elements.editorStatus.value = article.status || "草稿";
  elements.editorDate.value = (article.createdAt || nowISO()).slice(0, 10);
  elements.editorBody.value = article.body || "";
  elements.editorSourceNotes.value = article.sourceNotes || "";
  elements.editorNotes.value = article.notes || "";
  if (article.hookAnalysis || article.riskAnalysis) {
    state.editorAnalysis = {
      hooks: article.hookAnalysis,
      risk: article.riskAnalysis,
      structure: article.structureAnalysis,
    };
    renderEditorAnalysis();
  } else {
    renderEditorAnalysis();
  }
  renderEditorVersions(article);
  switchView("create");
}

function scheduleDraftSave() {
  clearTimeout(state.draftTimer);
  state.draftTimer = window.setTimeout(() => {
    const form = editorFormData();
    const hasContent = form.title || form.body;
    if (!hasContent) {
      localStorage.removeItem(EDITOR_DRAFT_KEY);
      return;
    }
    localStorage.setItem(
      EDITOR_DRAFT_KEY,
      JSON.stringify({
        ...form,
        savedAt: nowISO(),
      }),
    );
  }, 500);
}

function restoreEditorDraft() {
  try {
    const raw = localStorage.getItem(EDITOR_DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft?.title && !draft?.body) return;
    state.activeArticleId = draft.id && state.articles.some((item) => item.id === draft.id)
      ? draft.id
      : null;
    state.activeArticle =
      state.articles.find((item) => item.id === state.activeArticleId) || null;
    elements.editorId.value = draft.id || "";
    elements.editorTitle.value = draft.title || "";
    elements.editorProduct.value = draft.product || "";
    elements.editorStatus.value = draft.status || "草稿";
    elements.editorDate.value = draft.date || todayISO();
    elements.editorBody.value = draft.body || "";
    elements.editorSourceNotes.value = draft.sourceNotes || "";
    elements.editorNotes.value = draft.notes || "";
  } catch {
    localStorage.removeItem(EDITOR_DRAFT_KEY);
  }
}

function filteredArticles() {
  const query = elements.librarySearch.value.trim().toLowerCase();
  const status = elements.libraryStatusFilter.value;
  return state.articles.filter((article) => {
    const matchesStatus = !status || article.status === status;
    const haystack =
      `${article.title} ${article.product} ${article.body}`.toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
}

function renderLibrary() {
  const articles = filteredArticles();
  elements.librarySubtitle.textContent = `共 ${state.articles.length} 篇，当前显示 ${articles.length} 篇。`;
  if (!articles.length) {
    elements.libraryContainer.innerHTML = `
      <div class="empty-state">
        <strong>${state.articles.length ? "没有符合筛选条件的软文" : "还没有软文"}</strong>
        <p>${state.articles.length ? "换个关键词或状态试试。" : "保存第一篇后，就可以按日期、产品和状态查找。"}</p>
      </div>`;
    return;
  }
  elements.libraryContainer.innerHTML = articles
    .map(
      (article) => `
        <article class="article-card" data-open-article="${escapeAttribute(article.id)}">
          <div class="article-meta">
            <span>${escapeHTML(formatFullDate(article.createdAt))}</span>
            <span class="status-badge ${statusClass(article.status)}">${escapeHTML(article.status || "草稿")}</span>
          </div>
          <h3>${escapeHTML(article.title || "未命名软文")}</h3>
          <p>${escapeHTML(textPreview(article.body, 105))}</p>
          <div class="article-card-foot">
            <span>${escapeHTML(article.product || "未填产品")} · ${article.versions?.length ? `${article.versions.length} 个历史版本` : "当前版本"}</span>
            <button class="delete-article" type="button" data-delete-article="${escapeAttribute(article.id)}">删除</button>
          </div>
        </article>`,
    )
    .join("");
}

async function deleteArticle(id) {
  const article = state.articles.find((item) => item.id === id);
  if (!article) return;
  const confirmed = window.confirm(`确定删除《${article.title || "未命名软文"}》吗？`);
  if (!confirmed) return;
  try {
    await state.activeStore.deleteArticle(id);
    if (state.activeArticleId === id) clearEditor();
    await reloadStoreAndArticles();
    showToast("软文已删除。");
  } catch (error) {
    showToast(error.message || "删除失败。", "error");
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportBackup() {
  try {
    const data = await state.activeStore.exportData();
    downloadJSON(data, `钩子工坊备份-${todayISO()}.json`);
    showToast("备份已导出。");
  } catch (error) {
    showToast(error.message || "导出失败。", "error");
  }
}

async function importBackup(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const count = await state.activeStore.importData(data);
    await reloadStoreAndArticles();
    showToast(`已导入 ${count} 篇软文。`);
  } catch (error) {
    showToast(error.message || "导入失败。", "error");
  }
}

function renderGeneratedHooks(hooks) {
  elements.generatedHooks.innerHTML = hooks
    .map(
      (hook) => `
        <article class="generated-hook">
          <span>${escapeHTML(hook.type)}</span>
          <strong>${escapeHTML(hook.title)}</strong>
          <p>${escapeHTML(hook.opening)}</p>
          <button class="text-button" type="button" data-copy-hook="${escapeAttribute(`${hook.title}\n${hook.opening}`)}">复制</button>
        </article>`,
    )
    .join("");
}

function generateHookIdeas() {
  const hooks = generateHooks({
    audience: document.querySelector("#builder-audience").value,
    pain: document.querySelector("#builder-pain").value,
    action: document.querySelector("#builder-action").value,
    product: document.querySelector("#builder-product").value,
    evidence: document.querySelector("#builder-evidence").value,
  });
  renderGeneratedHooks(hooks);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制。");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("已复制。");
  }
}

function renderAuthState() {
  const config = getCloudConfig();
  const activeCloud =
    Boolean(config) && state.activeStore instanceof CloudStore && state.cloudSession;
  elements.localModeCard.classList.toggle("is-current", !activeCloud);
  elements.cloudModeCard.classList.toggle("is-current", Boolean(activeCloud));
  elements.authSignedOut.hidden = Boolean(activeCloud);
  elements.authSignedIn.hidden = !activeCloud;
  elements.signedInEmail.textContent = state.cloudSession?.user?.email || "";
  elements.supabaseUrl.value = config?.url || elements.supabaseUrl.value || "";
  elements.supabaseKey.value = config?.anonKey || elements.supabaseKey.value || "";
}

async function testConnectionFromForm() {
  try {
    await testCloudConnection(
      elements.supabaseUrl.value,
      elements.supabaseKey.value,
    );
    showToast("连接成功。");
  } catch (error) {
    showToast(error.message || "连接失败。", "error");
  }
}

async function saveCloudFromForm() {
  try {
    const config = saveCloudConfig({
      url: elements.supabaseUrl.value,
      anonKey: elements.supabaseKey.value,
    });
    if (!config.url || !config.anonKey) {
      throw new Error("URL 和 anon key 都要填写。");
    }
    await reloadStoreAndArticles();
    renderAuthState();
    showToast("云端配置已保存，请登录账号。");
  } catch (error) {
    showToast(error.message || "保存配置失败。", "error");
  }
}

async function signIn() {
  try {
    saveCloudConfig({
      url: elements.supabaseUrl.value,
      anonKey: elements.supabaseKey.value,
    });
    const cloud = new CloudStore();
    const session = await cloud.signIn(
      elements.authEmail.value.trim(),
      elements.authPassword.value,
    );
    state.activeStore = cloud;
    state.cloudSession = session;
    await reloadStoreAndArticles();
    renderAuthState();
    showToast("已登录，正在使用云端同步。");
  } catch (error) {
    showToast(error.message || "登录失败。", "error");
  }
}

async function signUp() {
  try {
    saveCloudConfig({
      url: elements.supabaseUrl.value,
      anonKey: elements.supabaseKey.value,
    });
    const cloud = new CloudStore();
    const result = await cloud.signUp(
      elements.authEmail.value.trim(),
      elements.authPassword.value,
    );
    if (result.session) {
      state.activeStore = cloud;
      state.cloudSession = result.session;
      await reloadStoreAndArticles();
      showToast("账号创建成功并已登录。");
    } else {
      showToast("账号已创建，请去邮箱确认后再登录。");
    }
  } catch (error) {
    showToast(error.message || "注册失败。", "error");
  }
}

async function signOut() {
  try {
    if (state.activeStore instanceof CloudStore) {
      await state.activeStore.signOut();
    }
    state.cloudSession = null;
    state.activeStore = LocalStore;
    await reloadStoreAndArticles();
    renderAuthState();
    showToast("已退出云端账号，当前回到本机保存。");
  } catch (error) {
    showToast(error.message || "退出失败。", "error");
  }
}

function openSettings() {
  renderAuthState();
  elements.settingsDialog.showModal();
}

function bindEvents() {
  for (const button of elements.navButtons) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      switchView(button.dataset.viewLink);
    });
  }

  elements.settingsButton.addEventListener("click", openSettings);
  elements.storagePill.addEventListener("click", openSettings);

  document.querySelector("#analyze-hooks-button").addEventListener("click", runHookAnalysis);
  document.querySelector("#load-hook-sample").addEventListener("click", () => {
    elements.hookInput.value = SAMPLE_SOURCE;
    runHookAnalysis();
  });
  document.querySelector("#generate-hooks-button").addEventListener("click", generateHookIdeas);

  document.querySelector("#analyze-review-button").addEventListener("click", runReviewAnalysis);
  document.querySelector("#load-review-sample").addEventListener("click", () => {
    elements.reviewInput.value = SAMPLE_REVIEW;
    runReviewAnalysis();
  });
  document.querySelector("#send-to-editor").addEventListener("click", sendReviewToEditor);

  document.querySelector("#check-editor-button").addEventListener("click", renderEditorAnalysis);
  document.querySelector("#save-editor-button").addEventListener("click", () => saveEditor());
  document.querySelector("#save-version-button").addEventListener("click", () =>
    saveEditor({ makeVersion: true }),
  );
  document.querySelector("#new-editor-button").addEventListener("click", () => {
    clearEditor();
    switchView("create");
  });
  document.querySelector("#library-new-button").addEventListener("click", () => {
    clearEditor();
    switchView("create");
  });

  for (const input of [
    elements.editorTitle,
    elements.editorProduct,
    elements.editorStatus,
    elements.editorDate,
    elements.editorBody,
    elements.editorSourceNotes,
    elements.editorNotes,
  ]) {
    input.addEventListener("input", scheduleDraftSave);
    input.addEventListener("change", scheduleDraftSave);
  }

  elements.librarySearch.addEventListener("input", renderLibrary);
  elements.libraryStatusFilter.addEventListener("change", renderLibrary);
  elements.libraryContainer.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-article]");
    if (deleteButton) {
      event.stopPropagation();
      deleteArticle(deleteButton.dataset.deleteArticle);
      return;
    }
    const openTarget = event.target.closest("[data-open-article]");
    if (openTarget) loadArticle(openTarget.dataset.openArticle);
  });
  elements.recentList.addEventListener("click", (event) => {
    const target = event.target.closest("[data-open-article]");
    if (target) loadArticle(target.dataset.openArticle);
  });

  document.querySelector("#export-button").addEventListener("click", exportBackup);
  document.querySelector("#import-button").addEventListener("click", () =>
    elements.importFileInput.click(),
  );
  elements.importFileInput.addEventListener("change", async () => {
    const file = elements.importFileInput.files?.[0];
    if (file) await importBackup(file);
    elements.importFileInput.value = "";
  });

  elements.generatedHooks.addEventListener("click", (event) => {
    const target = event.target.closest("[data-copy-hook]");
    if (target) copyText(target.dataset.copyHook);
  });

  document.querySelector("#test-cloud-button").addEventListener("click", testConnectionFromForm);
  document.querySelector("#save-cloud-button").addEventListener("click", saveCloudFromForm);
  document.querySelector("#sign-in-button").addEventListener("click", signIn);
  document.querySelector("#sign-up-button").addEventListener("click", signUp);
  document.querySelector("#sign-out-button").addEventListener("click", signOut);
}

async function init() {
  elements.editorDate.value = todayISO();
  bindEvents();
  await reloadStoreAndArticles();
  restoreEditorDraft();
  renderAuthState();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init().catch((error) => {
  console.error(error);
  showToast("页面初始化失败，请刷新重试。", "error");
});

