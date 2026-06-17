// ===========================================================
// 퀴즈 페이지 — 본문 선택 + 객관식/주관식 모드 + 진행 + 결과
// ===========================================================

(function () {
  const FEW_CHOICES_THRESHOLD = 6; // 이 개수 이하면 버튼형, 초과하면 스크롤 라디오리스트형

  const state = {
    selectedPassages: new Set(["all"]), // "all" 또는 본문 id들의 집합
    mode: "mc", // "mc" | "sa"
    questions: [], // 이번 회차에 풀 문제 목록 (셔플됨)
    currentIndex: 0,
    score: 0,
    wrongQuestions: [], // 틀린 문제 객체 저장 (다시 풀기용)
    answeredCurrent: false,
  };

  let ALL_QUESTIONS = [];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function passageMetaOf(id) {
    return PASSAGE_META.find((p) => p.id === id);
  }

  // ---------- 설정 화면 ----------
  function renderFilterbar() {
    const bar = document.getElementById("passage-filterbar");
    const chips = [{ id: "all", title: "전체" }, ...PASSAGE_META];
    bar.innerHTML = chips
      .map(
        (c) =>
          `<button class="filter-chip ${state.selectedPassages.has(c.id) ? "active" : ""}" data-passage="${c.id}">${c.title}</button>`
      )
      .join("");

    bar.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.getAttribute("data-passage");
        if (id === "all") {
          state.selectedPassages = new Set(["all"]);
        } else {
          state.selectedPassages.delete("all");
          if (state.selectedPassages.has(id)) {
            state.selectedPassages.delete(id);
          } else {
            state.selectedPassages.add(id);
          }
          if (state.selectedPassages.size === 0) state.selectedPassages = new Set(["all"]);
        }
        renderFilterbar();
        updateSetupCount();
      });
    });
  }

  function getFilteredQuestionPool() {
    if (state.selectedPassages.has("all")) return ALL_QUESTIONS;
    return ALL_QUESTIONS.filter((q) => state.selectedPassages.has(q.passageId));
  }

  function updateSetupCount() {
    const pool = getFilteredQuestionPool();
    document.getElementById("setup-count").textContent = `선택한 범위에 총 ${pool.length}문제가 있습니다.`;
    document.getElementById("start-btn").disabled = pool.length === 0;
  }

  function setupModeToggle() {
    const btnMc = document.getElementById("mode-mc");
    const btnSa = document.getElementById("mode-sa");
    btnMc.addEventListener("click", () => {
      state.mode = "mc";
      btnMc.classList.add("active");
      btnSa.classList.remove("active");
    });
    btnSa.addEventListener("click", () => {
      state.mode = "sa";
      btnSa.classList.add("active");
      btnMc.classList.remove("active");
    });
  }

  // ---------- 퀴즈 시작 ----------
  function startQuiz(questionPool) {
    state.questions = shuffle(questionPool);
    state.currentIndex = 0;
    state.score = 0;
    state.wrongQuestions = [];

    document.getElementById("view-setup").style.display = "none";
    document.getElementById("view-result").style.display = "none";
    document.getElementById("view-quiz").style.display = "";

    renderCurrentQuestion();
  }

  function renderCurrentQuestion() {
    FloatPopover && FloatPopover.close && FloatPopover.close();
    state.answeredCurrent = false;

    const q = state.questions[state.currentIndex];
    const meta = passageMetaOf(q.passageId);

    document.getElementById("quiz-progress").textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
    document.getElementById("quiz-source").textContent = `${meta ? meta.title : q.passageId} · 출처: ${q.years.map((y) => y + "학번").join(", ")}`;
    document.getElementById("quiz-question").textContent = q.question;

    const feedback = document.getElementById("quiz-feedback");
    feedback.classList.remove("show", "correct", "wrong");
    document.getElementById("quiz-next-btn").disabled = true;

    const area = document.getElementById("quiz-answer-area");
    area.innerHTML = "";

    if (state.mode === "sa") {
      renderShortAnswerInput(area, q);
    } else {
      renderMultipleChoice(area, q);
    }
  }

  function renderMultipleChoice(area, q) {
    const isMany = q.choices.length > FEW_CHOICES_THRESHOLD;
    const wrapper = document.createElement("div");
    wrapper.className = `quiz-choices ${isMany ? "many" : ""}`;

    if (isMany) {
      wrapper.innerHTML = q.choices
        .map(
          (c, i) => `
        <label class="choice-radio-row" data-choice="${escapeAttr(c)}">
          <input type="radio" name="quiz-choice" value="${escapeAttr(c)}">
          <span>${c}</span>
        </label>`
        )
        .join("");
      area.appendChild(wrapper);

      wrapper.querySelectorAll(".choice-radio-row").forEach((row) => {
        row.addEventListener("click", () => {
          if (state.answeredCurrent) return;
          const choice = row.getAttribute("data-choice");
          submitAnswer(q, choice, wrapper);
        });
      });
    } else {
      wrapper.innerHTML = q.choices
        .map((c) => `<button class="choice-btn" data-choice="${escapeAttr(c)}">${c}</button>`)
        .join("");
      area.appendChild(wrapper);

      wrapper.querySelectorAll(".choice-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (state.answeredCurrent) return;
          const choice = btn.getAttribute("data-choice");
          submitAnswer(q, choice, wrapper);
        });
      });
    }
  }

  function renderShortAnswerInput(area, q) {
    const row = document.createElement("div");
    row.className = "quiz-input-row";
    row.innerHTML = `<input type="text" id="sa-input" placeholder="답을 입력하세요" autocomplete="off">
      <button class="btn" id="sa-submit">확인</button>`;
    area.appendChild(row);

    const input = document.getElementById("sa-input");
    const submit = () => {
      if (state.answeredCurrent) return;
      const value = input.value.trim();
      if (!value) return;
      submitAnswer(q, value, area, true);
    };
    document.getElementById("sa-submit").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    input.focus();
  }

  function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "").trim();
  }

  function submitAnswer(q, userChoice, areaEl, isShortAnswer) {
    state.answeredCurrent = true;
    const isCorrect = isShortAnswer
      ? normalize(userChoice) === normalize(q.answer)
      : userChoice === q.answer;

    if (isCorrect) {
      state.score++;
    } else {
      state.wrongQuestions.push(q);
    }

    if (isShortAnswer) {
      const input = document.getElementById("sa-input");
      const submitBtn = document.getElementById("sa-submit");
      if (input) input.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
    } else {
      // 버튼형: 선택한 것 + 정답 표시
      areaEl.querySelectorAll(".choice-btn, .choice-radio-row").forEach((el) => {
        const c = el.getAttribute("data-choice");
        el.classList.remove("correct", "wrong");
        if (c === q.answer) el.classList.add("correct");
        else if (c === userChoice && !isCorrect) el.classList.add("wrong");
        if (el.tagName === "BUTTON") el.disabled = true;
        const radio = el.querySelector('input[type="radio"]');
        if (radio) radio.disabled = true;
      });
    }

    const feedback = document.getElementById("quiz-feedback");
    feedback.classList.add("show", isCorrect ? "correct" : "wrong");
    document.getElementById("feedback-answer-line").textContent = isCorrect
      ? "정답입니다."
      : `오답입니다. 정답: ${q.answer}`;
    document.getElementById("feedback-explanation").textContent = q.explanation || "";

    document.getElementById("quiz-next-btn").disabled = false;
  }

  function goNext() {
    if (state.currentIndex + 1 >= state.questions.length) {
      showResult();
    } else {
      state.currentIndex++;
      renderCurrentQuestion();
    }
  }

  function showResult() {
    document.getElementById("view-quiz").style.display = "none";
    document.getElementById("view-result").style.display = "";

    const total = state.questions.length;
    document.getElementById("result-score").textContent = `${state.score} / ${total}`;
    const pct = total ? Math.round((state.score / total) * 100) : 0;
    document.getElementById("result-detail").textContent =
      state.wrongQuestions.length === 0
        ? `모두 맞혔습니다! (${pct}%)`
        : `${pct}% 정답 · 틀린 문제 ${state.wrongQuestions.length}개`;

    document.getElementById("review-wrong-btn").style.display =
      state.wrongQuestions.length > 0 ? "" : "none";
  }

  function backToSetup() {
    document.getElementById("view-quiz").style.display = "none";
    document.getElementById("view-result").style.display = "none";
    document.getElementById("view-setup").style.display = "";
  }

  // ---------- 초기화 ----------
  async function init() {
    try {
      ALL_QUESTIONS = await fetchJSON("../data/questions.json");
    } catch (e) {
      console.error(e);
      document.getElementById("setup-count").textContent = "문제 데이터를 불러올 수 없습니다.";
      return;
    }

    renderFilterbar();
    setupModeToggle();
    updateSetupCount();

    document.getElementById("start-btn").addEventListener("click", () => {
      const pool = getFilteredQuestionPool();
      if (pool.length === 0) return;
      startQuiz(pool);
    });

    document.getElementById("quiz-next-btn").addEventListener("click", goNext);
    document.getElementById("quiz-quit-btn").addEventListener("click", backToSetup);
    document.getElementById("retry-btn").addEventListener("click", () => {
      startQuiz(getFilteredQuestionPool());
    });
    document.getElementById("review-wrong-btn").addEventListener("click", () => {
      if (state.wrongQuestions.length === 0) return;
      startQuiz(state.wrongQuestions);
    });
  }

  init();
})();
