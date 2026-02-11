const API_BASE = "http://localhost:3000/api";

const state = {
  token: localStorage.getItem("oab_token") || null,
  user: null,
  selectedAnswer: null,
  currentQuestion: null,
  limits: null
};

const el = {
  authCard: document.getElementById("authCard"),
  dashboard: document.getElementById("dashboard"),
  authMsg: document.getElementById("authMsg"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  tabLogin: document.getElementById("tabLogin"),
  tabRegister: document.getElementById("tabRegister"),
  logoutBtn: document.getElementById("logoutBtn"),
  planBadge: document.getElementById("planBadge"),
  streakValue: document.getElementById("streakValue"),
  xpLevelValue: document.getElementById("xpLevelValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  limitInfo: document.getElementById("limitInfo"),
  nextQuestionBtn: document.getElementById("nextQuestionBtn"),
  answerBtn: document.getElementById("answerBtn"),
  questionTopic: document.getElementById("questionTopic"),
  questionDifficulty: document.getElementById("questionDifficulty"),
  questionStatement: document.getElementById("questionStatement"),
  optionsWrap: document.getElementById("optionsWrap"),
  feedbackBox: document.getElementById("feedbackBox"),
  upgradeBanner: document.getElementById("upgradeBanner"),
  upgradeBtn: document.getElementById("upgradeBtn")
};

function setAuthTab(mode) {
  const isLogin = mode === "login";
  el.tabLogin.classList.toggle("active", isLogin);
  el.tabRegister.classList.toggle("active", !isLogin);
  el.loginForm.classList.toggle("active", isLogin);
  el.registerForm.classList.toggle("active", !isLogin);
  el.authMsg.textContent = "";
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "Erro inesperado");
    error.code = data.code;
    throw error;
  }

  return data;
}

function saveToken(token) {
  state.token = token;
  localStorage.setItem("oab_token", token);
}

function clearSession() {
  state.token = null;
  state.user = null;
  state.currentQuestion = null;
  state.selectedAnswer = null;
  localStorage.removeItem("oab_token");
  render();
}

function renderStats() {
  const p = state.user.progress;
  const accuracy = p.totalAnswered > 0
    ? ((p.totalCorrect / p.totalAnswered) * 100).toFixed(1)
    : "0.0";

  el.planBadge.textContent = state.user.plan === "premium" ? "Premium ✨" : "Free";
  el.streakValue.textContent = `${p.streak || 0} dias 🔥`;
  el.xpLevelValue.textContent = `${p.xp || 0} XP · Lv.${p.level || 1}`;
  el.accuracyValue.textContent = `${accuracy}%`;

  if (state.user.plan === "premium") {
    el.upgradeBanner.classList.add("hidden");
    el.limitInfo.textContent = "Premium ativo: acesso ilimitado às questões.";
  } else {
    el.upgradeBanner.classList.remove("hidden");
    const remaining = state.limits?.remainingToday ?? "-";
    el.limitInfo.textContent = `Plano Free: restam ${remaining} questões hoje.`;
  }
}

function renderQuestion(question) {
  state.currentQuestion = question;
  state.selectedAnswer = null;
  el.answerBtn.disabled = true;
  el.feedbackBox.className = "feedback hidden";
  el.feedbackBox.innerHTML = "";

  el.questionTopic.textContent = question.topic;
  el.questionDifficulty.textContent = `Nível ${question.difficulty}`;
  el.questionStatement.textContent = question.statement;

  el.optionsWrap.innerHTML = "";
  question.options.forEach((option, idx) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.type = "button";
    btn.textContent = `${String.fromCharCode(65 + idx)}) ${option}`;
    btn.addEventListener("click", () => {
      state.selectedAnswer = idx;
      [...el.optionsWrap.children].forEach((child) => child.classList.remove("selected"));
      btn.classList.add("selected");
      el.answerBtn.disabled = false;
    });
    el.optionsWrap.appendChild(btn);
  });
}

function markAnswerResult(payload) {
  const options = [...el.optionsWrap.children];
  options.forEach((button, idx) => {
    button.disabled = true;
    if (idx === payload.correctOptionIndex) button.classList.add("correct");
    if (idx === state.selectedAnswer && idx !== payload.correctOptionIndex) {
      button.classList.add("wrong");
    }
  });

  el.feedbackBox.className = `feedback ${payload.result}`;
  el.feedbackBox.innerHTML = `
    <strong>${payload.feedback}</strong>
    <p><strong>Explicação:</strong> ${payload.explanation}</p>
    <p>+${payload.xpGained} XP · Nível ${payload.progress.level} · Sequência ${payload.progress.streak} dias</p>
  `;
}

async function loadProfile() {
  const data = await api("/session/profile");
  state.user = data.user;
  state.limits = data.limits;
  render();
}

async function getNextQuestion() {
  try {
    const data = await api("/questions/next", { method: "POST" });
    renderQuestion(data.question);
    await loadProfile();
  } catch (error) {
    if (error.code === "FREE_LIMIT_REACHED") {
      el.limitInfo.textContent = "Você atingiu o limite diário Free. Assine Premium para continuar hoje.";
      return;
    }
    el.limitInfo.textContent = error.message;
  }
}

async function submitAnswer() {
  if (state.selectedAnswer === null) return;

  try {
    const payload = await api("/questions/answer", {
      method: "POST",
      body: JSON.stringify({ answerIndex: state.selectedAnswer })
    });

    markAnswerResult(payload);
    await loadProfile();
    el.answerBtn.disabled = true;
  } catch (error) {
    el.limitInfo.textContent = error.message;
  }
}

async function upgradeToPremium() {
  try {
    const checkout = await api("/payment/checkout", { method: "POST" });

    if (checkout.mode === "stripe" && checkout.checkoutUrl) {
      window.location.href = checkout.checkoutUrl;
      return;
    }

    await api("/payment/confirm-sandbox", { method: "POST" });
    await loadProfile();
    el.limitInfo.textContent = "Premium ativado em sandbox com sucesso!";
  } catch (error) {
    el.limitInfo.textContent = error.message;
  }
}

function render() {
  const authenticated = Boolean(state.token && state.user);

  el.authCard.classList.toggle("hidden", authenticated);
  el.dashboard.classList.toggle("hidden", !authenticated);
  el.logoutBtn.classList.toggle("hidden", !authenticated);

  if (authenticated) renderStats();
}

el.tabLogin.addEventListener("click", () => setAuthTab("login"));
el.tabRegister.addEventListener("click", () => setAuthTab("register"));

el.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.loginForm);

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });

    saveToken(data.token);
    state.user = data.user;
    await loadProfile();
  } catch (error) {
    el.authMsg.textContent = error.message;
  }
});

el.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.registerForm);

  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password")
      })
    });

    saveToken(data.token);
    state.user = data.user;
    await loadProfile();
  } catch (error) {
    el.authMsg.textContent = error.message;
  }
});

el.nextQuestionBtn.addEventListener("click", getNextQuestion);
el.answerBtn.addEventListener("click", submitAnswer);
el.upgradeBtn.addEventListener("click", upgradeToPremium);
el.logoutBtn.addEventListener("click", clearSession);

(async function init() {
  setAuthTab("login");

  if (state.token) {
    try {
      await loadProfile();
    } catch {
      clearSession();
    }
  }

  render();
})();
