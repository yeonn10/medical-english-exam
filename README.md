# 의학영어 시험대비 사이트

본문 4개(Fever / Acute Abdomen / Abdominal Pain / Atherosclerosis)를 원문 모드(각주)와 요약 모드(핵심 단어 정의)로 학습하고, 기출문제 80문항을 퀴즈로 풀어볼 수 있는 정적 웹사이트입니다.

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
│   └── index.html          문제 학습 (본문 선택 + 객관식/주관식 퀴즈)
├── data/
│   ├── passages.json       본문 데이터 (단락, 각주, 요약)
│   └── questions.json      기출문제 데이터 (80문항)
└── assets/
    ├── style.css
    ├── app.js
    ├── passage-view.js
    └── quiz.js
```

## 현재 상태

- 본문 4개 모두 원문 모드(섹션 소제목 구분 + 단락별 한글 해석 토글 + 단락 해설 + 교수님 각주 클릭) 완성
- 본문 4개 모두 요약 모드(표/리스트로 구조화 + 핵심 단어 클릭 시 기출문제 정의 형태에 가까운 뜻풀이) 완성
- 문제 학습(퀴즈) 완성: 기출문제 80문항을 본문별로 선택해서 풀 수 있고, 객관식/주관식 모드 전환이 가능하며, 보기가 많은 매칭형 문제(예: Abdominal Pain의 Acute causes 35개)는 실제 시험처럼 전체 보기를 스크롤 가능한 라디오 리스트로 제공. 결과 화면에서 틀린 문제만 다시 풀기도 가능.

## 데이터 추가/수정 방법

### 본문 데이터 (`data/passages.json`)

각 본문은 다음 구조를 따릅니다.

- `paragraphs`: 각 항목은 `type: "para"`(일반 단락) 또는 `type: "bulletGroup"`(원문이 불릿 목록인 경우)
  - `para` 타입: `sectionTitle`(소제목, 없으면 null), `en`(영문, 각주는 `{{단어}}`로 표시), `kr`(한글 번역), `note`(단락 해설)
  - `bulletGroup` 타입: `sectionTitle`, `introEn`(도입 문장), `items`(불릿 항목 배열), `kr`(목록 전체 한글 해석), `note`(목록 전체 해설)
- `footnotes`: `{{단어}}`와 정확히 같은 텍스트를 키로 하는 각주 설명 딕셔너리
- `summary.sections`: `narrative`(서술형 html), `table`(표), `list`(목록) 타입 섹션
- `summary.terms`: 요약 섹션 안의 `data-term="키"`와 매칭되는 핵심 단어 정의 딕셔너리

### 퀴즈 데이터 (`data/questions.json`)

문제 목록 배열이며, 각 문제는 다음 구조를 따릅니다.

```json
{
  "id": "q001",
  "passageId": "abdominal_pain",
  "type": "fill_blank",
  "question": "질문 텍스트",
  "choices": ["보기1", "보기2", "보기3", "보기4"],
  "answer": "보기1",
  "explanation": "해설",
  "years": [19, 20, 22]
}
```

- `passageId`는 `abdominal_pain`, `acute_abdomen`, `fever`, `atherosclerosis` 중 하나여야 합니다.
- `answer`는 `choices` 배열 안의 값과 정확히 일치해야 합니다.
- `choices` 개수가 6개를 초과하면 자동으로 스크롤 가능한 라디오 리스트 형태로 렌더링됩니다(보기가 많은 매칭형 문제용).
- 주관식 모드에서는 `choices`는 쓰이지 않고 텍스트 입력 후 `answer`와 대소문자/공백/특수문자를 무시하고 비교합니다.
