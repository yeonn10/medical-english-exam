// ===========================================================
// 공통 유틸리티
// ===========================================================

// 전체 본문 메타데이터 (홈 화면 카드 + 본문 페이지 제목 등에 사용)
const PASSAGE_META = [
  { id: "abdominal_pain", num: "01", title: "Abdominal Pain", kr: "복통", desc: "급성/만성/진행성 복통의 원인 질환 총정리 (Mayo Clinic)" },
  { id: "acute_abdomen", num: "02", title: "Acute Abdominal Pain", kr: "급성 복통", desc: "응급실 복통 환자 평가 — PQRST, 통증 위치/양상/방사" },
  { id: "fever", num: "03", title: "Fever", kr: "발열", desc: "체온조절 기전, 발열의 병태생리, 발열+발진 환자 접근" },
  { id: "atherosclerosis", num: "04", title: "Atherosclerosis", kr: "동맥경화증", desc: "동맥경화의 공간적·시간적 국소성, 부위별 임상 양상" }
];

function getPassageId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "fever";
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("failed to load " + path);
  return res.json();
}

// {{term}} 형태의 마커를 클릭 가능한 각주 트리거 span으로 변환
function renderEnglishWithFootnotes(en, footnoteKeys, paraIndex) {
  let counter = 0;
  const html = en.replace(/\{\{([^}]+)\}\}/g, (match, term) => {
    counter++;
    const safeTerm = term.trim();
    const key = `p${paraIndex}-fn${counter}`;
    footnoteKeys.push({ key, term: safeTerm });
    return `<button class="fn" data-fn-key="${key}">${safeTerm}<span class="fn-sup">●</span></button>`;
  });
  return html;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

// ===========================================================
// 공통 떠다니는 말풍선(popover) 매니저
// 각주 트리거(.fn)와 핵심단어(.term)에서 공통으로 사용.
// 클릭한 단어 근처에 위치를 계산해 띄우고, 바깥 클릭 시 닫힘.
// ===========================================================
const FloatPopover = (function () {
  let currentEl = null; // 현재 열려있는 popover DOM
  let currentAnchor = null; // 현재 popover를 띄운 트리거 엘리먼트

  function close() {
    if (currentEl) {
      currentEl.remove();
      currentEl = null;
    }
    if (currentAnchor) {
      currentAnchor.classList.remove("fn-active", "term-active");
      currentAnchor = null;
    }
  }

  function open(anchorEl, html, opts) {
    const isSameAnchor = currentAnchor === anchorEl;
    close();
    if (isSameAnchor) return; // 같은 단어를 다시 클릭하면 닫기만 하고 끝

    const styleClass = (opts && opts.styleClass) || "";
    const box = document.createElement("div");
    box.className = `float-popover ${styleClass}`.trim();
    box.innerHTML = html;
    document.body.appendChild(box);

    const rect = anchorEl.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const margin = 6;

    let top = rect.bottom + margin;

    // 화면 아래쪽에 공간이 부족하면 위쪽에 띄움
    if (top + boxRect.height > window.innerHeight - 12) {
      top = rect.top - boxRect.height - margin;
      if (top < 12) top = 12; // 위쪽도 부족하면 화면 상단에 붙임
    }

    let left = rect.left;
    const maxLeft = window.innerWidth - boxRect.width - 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);

    box.style.top = `${top}px`;
    box.style.left = `${left}px`;

    requestAnimationFrame(() => box.classList.add("show"));

    currentEl = box;
    currentAnchor = anchorEl;
    anchorEl.classList.add(opts && opts.activeClass ? opts.activeClass : "fn-active");
  }

  // 바깥 클릭/스크롤/리사이즈 시 닫기
  document.addEventListener("click", (e) => {
    if (!currentEl) return;
    if (e.target.closest(".float-popover")) return; // 말풍선 내부 클릭은 무시
    if (currentAnchor && e.target === currentAnchor) return; // 트리거 클릭은 각 핸들러가 처리
    if (currentAnchor && currentAnchor.contains(e.target)) return;
    close();
  });
  window.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);

  return { open, close };
})();
