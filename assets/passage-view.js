// ===========================================================
// 본문 학습 페이지 — 렌더링 + 인터랙션
// ===========================================================

(async function () {
  const passageId = getPassageId();
  const meta = PASSAGE_META.find((p) => p.id === passageId) || PASSAGE_META[0];

  document.title = `${meta.title} — 본문 학습`;
  document.getElementById("passage-eyebrow").textContent = `PASSAGE ${meta.num}`;

  let data;
  try {
    const all = await fetchJSON("../data/passages.json");
    data = all[passageId];
  } catch (e) {
    document.getElementById("passage-title").textContent = "본문을 불러올 수 없습니다";
    console.error(e);
    return;
  }

  if (!data) {
    document.getElementById("passage-title").textContent = `${meta.title} (준비 중)`;
    document.getElementById("passage-authors").textContent = "이 본문의 데이터는 아직 추가되지 않았습니다.";
    return;
  }

  document.getElementById("passage-title").textContent = data.title;
  document.getElementById("passage-authors").textContent = data.authors || "";
  document.getElementById("meta-paracount").textContent = `단락 ${data.paragraphs.length}개`;
  const noteCount = data.paragraphs.filter((p) => p.note).length;
  document.getElementById("meta-notecount").textContent = `해설 ${noteCount}개`;

  renderOriginal(data);
  renderSummary(data);

  // ---------- 모드 토글 ----------
  const btnOriginal = document.getElementById("btn-original");
  const btnSummary = document.getElementById("btn-summary");
  const viewOriginal = document.getElementById("view-original");
  const viewSummary = document.getElementById("view-summary");

  btnOriginal.addEventListener("click", () => {
    btnOriginal.classList.add("active");
    btnSummary.classList.remove("active");
    viewOriginal.style.display = "";
    viewSummary.style.display = "none";
  });

  btnSummary.addEventListener("click", () => {
    btnSummary.classList.add("active");
    btnOriginal.classList.remove("active");
    viewSummary.style.display = "";
    viewOriginal.style.display = "none";
  });

  // ---------- 원문 모드 렌더 ----------
  function renderOriginal(data) {
    const container = document.getElementById("view-original");
    const footnotes = data.footnotes || {};
    let html = "";

    data.paragraphs.forEach((para, idx) => {
      const fnKeys = [];
      const enHtml = renderEnglishWithFootnotes(para.en, fnKeys, idx);

      html += `<div class="paragraph-block">`;
      html += `<span class="para-num">¶ ${idx + 1}</span>`;
      html += `<p class="para-en">${enHtml}</p>`;

      // 각주 팝오버 (단어별)
      fnKeys.forEach(({ key, term }) => {
        const def = footnotes[term];
        if (def) {
          html += `<div class="fn-popover" data-fn-target="${key}">
            <span class="fn-label">${escapeAttr(term)}</span>${def}
          </div>`;
        }
      });

      if (para.kr) {
        html += `<button class="toggle-kr" data-idx="${idx}">한글 해석 보기</button>`;
        html += `<p class="para-kr" data-idx="${idx}">${para.kr}</p>`;
      }

      if (para.note) {
        html += `<div class="para-note"><span class="label">단락 해설</span>${para.note}</div>`;
      }

      html += `</div>`;
    });

    container.innerHTML = html;

    // 각주 클릭 토글
    container.querySelectorAll(".fn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-fn-key");
        const popover = container.querySelector(`.fn-popover[data-fn-target="${key}"]`);
        if (!popover) return;
        const isOpen = popover.classList.contains("show");

        // 같은 단락 내 다른 팝오버는 닫지 않고, 클릭한 것만 토글 (여러 개 동시에 봐도 무방)
        popover.classList.toggle("show");
        btn.classList.toggle("open", !isOpen);
      });
    });

    // 한글 해석 토글
    container.querySelectorAll(".toggle-kr").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-idx");
        const krEl = container.querySelector(`.para-kr[data-idx="${idx}"]`);
        const showing = krEl.classList.toggle("show");
        btn.textContent = showing ? "한글 해석 숨기기" : "한글 해석 보기";
      });
    });
  }

  // ---------- 요약 모드 렌더 ----------
  function renderSummary(data) {
    const container = document.getElementById("view-summary");
    const summary = data.summary;
    if (!summary) {
      container.innerHTML = `<p style="color:var(--color-ink-faint); font-size:13px;">이 본문의 요약은 아직 준비되지 않았습니다.</p>`;
      return;
    }

    let html = "";
    summary.sections.forEach((sec) => {
      html += `<div class="summary-section">`;
      if (sec.heading) html += `<h4>${sec.heading}</h4>`;

      if (sec.type === "narrative") {
        html += sec.html;
      } else if (sec.type === "table") {
        html += `<table class="summary-table"><thead><tr>`;
        sec.columns.forEach((c) => (html += `<th>${c}</th>`));
        html += `</tr></thead><tbody>`;
        sec.rows.forEach((row) => {
          html += `<tr>`;
          row.forEach((cell) => (html += `<td>${cell}</td>`));
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      } else if (sec.type === "list") {
        html += `<ul class="summary-list">`;
        sec.items.forEach((item) => {
          html += `<li><span class="bullet"></span><span>${item}</span></li>`;
        });
        html += `</ul>`;
      }

      html += `</div>`;
    });

    container.innerHTML = html;

    // 핵심 단어 클릭 → 정의 토글 (정의 박스를 해당 span 바로 뒤에 삽입)
    const terms = summary.terms || {};
    container.querySelectorAll(".term").forEach((span) => {
      span.addEventListener("click", () => {
        const key = span.getAttribute("data-term");
        const def = terms[key];
        if (!def) return;

        // 이미 열려있는 정의가 바로 다음 형제면 토글, 아니면 생성
        let next = span.nextElementSibling;
        if (next && next.classList.contains("term-def") && next.getAttribute("data-for") === key) {
          next.classList.toggle("show");
          return;
        }
        const box = document.createElement("div");
        box.className = "term-def show";
        box.setAttribute("data-for", key);
        box.textContent = def;
        span.insertAdjacentElement("afterend", box);
      });
    });
  }
})();
