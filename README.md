# 의학영어 시험대비 사이트

본문 4개(Fever / Acute Abdomen / Abdominal Pain / Atherosclerosis)를 원문 모드(각주)와 요약 모드(핵심 단어 정의)로 학습할 수 있는 정적 웹사이트입니다.

## GitHub Pages로 배포하는 방법

1. GitHub에 새 저장소를 만듭니다 (예: `medical-english-exam`).
2. 이 폴더(`site/`) 안의 모든 파일을 그 저장소에 업로드합니다.
   - GitHub 웹사이트에서 "Add file → Upload files"로 드래그해서 올려도 됩니다.
   - 폴더 구조(`assets/`, `data/`, `passages/`, `quiz/`, `index.html`)를 그대로 유지해야 합니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Source**를 "Deploy from a branch"로 선택하고, Branch를 `main`(또는 `master`), 폴더를 `/ (root)`로 설정한 뒤 Save를 누릅니다.
5. 1~2분 후 `https://[사용자이름].github.io/[저장소이름]/` 주소로 사이트가 열립니다.

## 폴더 구조

```
site/
├── index.html              홈 페이지
├── passages/
│   ├── index.html          본문 목록
│   └── passage.html        본문 학습 (원문/요약 모드)
├── quiz/
│   └── index.html          문제 학습 (준비 중 안내)
├── data/
│   └── passages.json       본문 데이터 (단락, 각주, 요약)
└── assets/
    ├── style.css
    ├── app.js
    └── passage-view.js
```

## 현재 상태

- 본문 4개 모두 원문 모드(단락별 한글 해석 토글 + 단락 해설 + 교수님 각주 클릭) 완성
- 본문 4개 모두 요약 모드(표/리스트로 구조화 + 핵심 단어 클릭 시 기출문제 정의 형태에 가까운 뜻풀이) 완성
- 문제 학습(퀴즈) 기능은 아직 미구현 — `quiz/index.html`은 안내 페이지만 있는 상태
- 기출문제 데이터(`의학영어_기출정리_...txt`)는 이미 정리되어 있으므로, 추후 이를 `data/questions.json` 형태로 변환하고 `quiz/index.html`에 퀴즈 UI를 구현하면 완성됩니다. (style.css에 퀴즈용 클래스는 이미 준비되어 있음: `.quiz-progress`, `.quiz-filterbar`, `.choice-btn`, `.quiz-feedback` 등)

## 데이터 추가/수정 방법

`data/passages.json`을 직접 수정하면 됩니다. 각 본문은 다음 구조를 따릅니다.

- `paragraphs`: 단락별 `en`(영문, 각주는 `{{단어}}`로 표시), `kr`(한글 번역), `note`(단락 해설, 없으면 `null`)
- `footnotes`: `{{단어}}`와 정확히 같은 텍스트를 키로 하는 각주 설명 딕셔너리
- `summary.sections`: `narrative`(서술형 html), `table`(표), `list`(목록) 타입 섹션
- `summary.terms`: 요약 섹션 안의 `data-term="키"`와 매칭되는 핵심 단어 정의 딕셔너리
