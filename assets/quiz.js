// ===========================================================
// 퀴즈 페이지 — 본문 선택 + 객관식/주관식 모드 + 진행 + 결과
// ===========================================================
//
// 데이터 구조(questions.json) 안내:
// - stem            : 순수 질문 문장
// - passage         : (있으면) 인용된 영문 지문. 빈칸은 ___ 로 표시됨
// - choiceSourceType: "given" | "open"
//     - "given": 문제/지문이 선택지 후보를 직접 한정한 경우 → choiceSourceOptions만 보기로 사용
//     - "open" : 일반적인 빈칸 채우기 등, 정답+오답을 별도로 구성한 경우 → choices 사용
// - choices / choiceSourceOptions : 둘 중 하나만 존재 (choiceSourceType에 따라)
// - answer, explanation, years는 기존과 동일

(function () {
  const FEW_CHOICES_THRESHOLD = 6; // 이 개수 초과 시 스크롤 가능한 보기 박스로 감쌈

  const state = {
    selectedPassages: new Set(["all"]), // "all" 또는 본문 id들의 집합
    mode: "mc", // "mc" | "sa"
    questions: [], // 이번 회차에 풀 문제 목록 (셔플됨)
    currentIndex: 0,
    score: 0,
    wrongQuestions: [], // 틀린 문제 객체 저장 (다시 풀기용)
    answeredCurrent: false, // "확인" 버튼으로 채점이 끝났는지 여부
    pendingChoice: null, // 라디오로 골랐지만 아직 "확인"을 누르기 전인 값
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

  // 문제별로 실제 사용할 보기 배열을 반환 (given이면 choiceSourceOptions, open이면 choices)
  function getChoicesOf(q) {
    return q.choiceSourceType === "given" ? q.choiceSourceOptions : q.choices;
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
    state.pendingChoice = null;

    const q = state.questions[state.currentIndex];
    const meta = passageMetaOf(q.passageId);

    document.getElementById("quiz-progress").textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
    const sourceText = q.years && q.years.length ? ` · 출처: ${q.years.join(", ")}` : "";
    document.getElementById("quiz-source").textContent = `${meta ? meta.title : q.passageId}${sourceText}`;

    // 문제(stem) / 지문(passage) 분리 렌더링
    document.getElementById("quiz-question").textContent = q.stem;
    const passageEl = document.getElementById("quiz-passage");
    if (passageEl) {
      if (q.passage) {
        passageEl.textContent = q.passage;
        passageEl.style.display = "";
      } else {
        passageEl.textContent = "";
        passageEl.style.display = "none";
      }
    }

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

  // 모든 객관식은 라디오버튼으로 통일. 보기 개수가 많으면 스크롤 박스로 감싼다.
  // 보기가 많은 문제(매칭형, 병변 분류 등)는 순서를 고정하고, 일반 문제만 매번 섞는다.
  function renderMultipleChoice(area, q) {
    const rawChoices = getChoicesOf(q);
    const isMany = rawChoices.length > FEW_CHOICES_THRESHOLD;
    const choices = isMany ? rawChoices : shuffle(rawChoices);

    const wrapper = document.createElement("div");
    wrapper.className = `quiz-choices ${isMany ? "many" : ""}`;

    if (isMany) {
      const hint = document.createElement("div");
      hint.className = "quiz-many-hint";
      hint.textContent = `보기 ${choices.length}개 · 스크롤하여 확인하세요`;
      area.appendChild(hint);
    }

    wrapper.innerHTML = choices
      .map(
        (c) => `
      <label class="choice-radio-row" data-choice="${escapeAttr(c)}">
        <input type="radio" name="quiz-choice" value="${escapeAttr(c)}">
        <span>${c}</span>
      </label>`
      )
      .join("");
    area.appendChild(wrapper);

    // 라디오 선택 시: 바로 채점하지 않고 선택 상태만 표시 + 확인 버튼 활성화
    wrapper.querySelectorAll(".choice-radio-row").forEach((row) => {
      row.addEventListener("click", () => {
        if (state.answeredCurrent) return;
        const choice = row.getAttribute("data-choice");
        state.pendingChoice = choice;
        wrapper.querySelectorAll(".choice-radio-row").forEach((r) => r.classList.remove("selected"));
        row.classList.add("selected");
        document.getElementById("quiz-confirm-btn").disabled = false;
      });
    });

    // 확인 버튼: 실제 채점은 여기서 일어남
    const confirmArea = document.createElement("div");
    confirmArea.className = "quiz-confirm-row";
    confirmArea.innerHTML = `<button class="btn" id="quiz-confirm-btn" disabled>확인</button>`;
    area.appendChild(confirmArea);

    document.getElementById("quiz-confirm-btn").addEventListener("click", () => {
      if (state.answeredCurrent || state.pendingChoice === null) return;
      submitAnswer(q, state.pendingChoice, wrapper);
    });
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

  // 정답에 "풀네임 (약어)" 형태가 섞여 있을 때, 주관식 채점에서는 약어를 떼고
  // 풀네임만 기준으로 비교한다 (예: "Gastroesophageal reflux disease (GERD)" -> 풀네임만 인정)
  function stripAbbreviation(s) {
    return s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }

  // 정답이 영어 복수형으로 끝나는 경우, 단수형으로 입력해도 정답으로 인정하기 위해
  // 가능한 단수형 후보들을 만들어 반환한다. 정답이 여러 단어로 나뉘어 있으면(예: "manifestations / postmortem")
  // 슬래시로 나눠 각 부분을 따로 변환한 뒤 다시 합친다.
  function singularize(word) {
    const w = word.trim();
    const lower = w.toLowerCase();
    const candidates = new Set([w]);
    if (lower.endsWith("ies") && lower.length > 3) {
      candidates.add(w.slice(0, -3) + "y");
    } else if (lower.endsWith("ses") && lower.length > 3) {
      candidates.add(w.slice(0, -2)); // diagnoses -> diagnose 류 보정은 과하지 않게 -es만 제거
      candidates.add(w.slice(0, -1)); // "ses" -> "se" 가능성
    } else if (lower.endsWith("es") && lower.length > 2) {
      candidates.add(w.slice(0, -2));
      candidates.add(w.slice(0, -1));
    } else if (lower.endsWith("ae") && lower.length > 2) {
      candidates.add(w.slice(0, -2) + "a"); // bullae -> bulla
    } else if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 1) {
      candidates.add(w.slice(0, -1));
    }
    return Array.from(candidates);
  }

  function answerVariants(answer) {
    const base = stripAbbreviation(answer);
    // "manifestations / postmortem" 같은 슬래시 구분 두 단어 빈칸은 각 부분을 따로 단수화한 뒤 재조합
    if (base.includes("/")) {
      const parts = base.split("/").map((p) => p.trim());
      const partVariants = parts.map((p) => singularize(p));
      // 각 파트의 후보 조합을 모두 생성 (파트가 2개 이하인 일반적 경우 기준)
      let combos = [""];
      partVariants.forEach((variants, idx) => {
        const next = [];
        combos.forEach((c) => {
          variants.forEach((v) => {
            next.push(idx === 0 ? v : c + " / " + v);
          });
        });
        combos = next;
      });
      return combos;
    }
    // 여러 단어로 된 정답(예: "myocardial infarction")은 마지막 단어만 단수화 시도
    const words = base.split(/\s+/);
    const lastWord = words[words.length - 1];
    const lastVariants = singularize(lastWord);
    return lastVariants.map((v) => words.slice(0, -1).concat(v).join(" "));
  }

  function submitAnswer(q, userChoice, areaEl, isShortAnswer) {
    state.answeredCurrent = true;
    const isCorrect = isShortAnswer
      ? answerVariants(q.answer).some((variant) => normalize(userChoice) === normalize(variant))
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
      // 라디오 행: 정답/오답 표시 + 더 이상 선택 불가
      areaEl.querySelectorAll(".choice-radio-row").forEach((row) => {
        const c = row.getAttribute("data-choice");
        row.classList.remove("selected");
        if (c === q.answer) row.classList.add("correct");
        else if (c === userChoice && !isCorrect) row.classList.add("wrong");
        const radio = row.querySelector('input[type="radio"]');
        if (radio) radio.disabled = true;
      });
      const confirmBtn = document.getElementById("quiz-confirm-btn");
      if (confirmBtn) {
        const confirmRow = confirmBtn.closest(".quiz-confirm-row");
        if (confirmRow) confirmRow.style.display = "none";
      }
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
