// ===========================================================
// 공통 유틸리티
// ===========================================================

// 전체 본문 메타데이터 (홈 화면 카드 + 본문 페이지 제목 등에 사용)
const PASSAGE_META = [
  { id: "fever", num: "01", title: "Fever", kr: "발열", desc: "체온조절 기전, 발열의 병태생리, 발열+발진 환자 접근" },
  { id: "acute_abdomen", num: "02", title: "Acute Abdominal Pain", kr: "급성 복통", desc: "응급실 복통 환자 평가 — PQRST, 통증 위치/양상/방사" },
  { id: "abdominal_pain", num: "03", title: "Abdominal Pain", kr: "복통", desc: "급성/만성/진행성 복통의 원인 질환 총정리 (Mayo Clinic)" },
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
