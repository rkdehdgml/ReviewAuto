# 체험단 리뷰 자동화 — ReviewAuto (리뷰오토) 구현 계획 v2

## 1. 프로젝트 개요

체험단(리뷰노트 등) 선정 후 네이버 블로그 리뷰 글 작성을 반자동화하는 **개인용 로컬 웹앱**.
사용자가 업체 정보/가이드라인/사진을 입력하면 Claude가 사진을 분석해 사진 배치까지 포함된 완성 리뷰 글을 생성하고, 검수 후 Playwright가 네이버 블로그에 **임시저장까지** 자동 입력한다. **발행은 반드시 사용자가 수동으로** 한다.

### 핵심 원칙
- 아키텍처: **로컬 웹앱** — Next.js 서버가 사용자 PC에서 실행(localhost:3000), 브라우저는 UI만 담당. `claude -p`와 Playwright는 로컬 서버 프로세스가 실행한다. 클라우드 배포(Vercel 등)는 하지 않는다.
- 글 생성: Claude (`claude -p` headless 모드, Pro 구독 인증 사용 — API 키 사용 금지)
- 블로그 입력: 결정적(deterministic) Playwright 스크립트 (AI가 브라우저를 조작하지 않음)
- 자동화 범위는 **임시저장까지**. 발행 버튼 자동 클릭 기능은 구현하지 않는다 (계정 제재/저품질 리스크 관리)

### 벤치마킹 레퍼런스
1. **bbinya1224/blog-template** (my-blog-tone-lab): 네이버 블로그 RSS로 문체 학습 + 프로필 캐싱, 로컬 검색 API로 가게 정보 자동 수집, Few-Shot 프롬프트, graceful degradation 패턴 차용
2. **Daewooki/naver-bc-automation**: 로컬 Next.js + Playwright로 네이버 블로그 자동 포스팅(이미지 업로드 포함)이 실증된 레포. `npm run login` 분리 세션 관리 패턴(세션 7~30일 유지, 만료 시 재로그인), 봇 감지 시 stealth plugin 대응 차용

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + React + TypeScript | 로컬 실행 전용, API Routes가 백엔드 역할 |
| 스타일 | Tailwind CSS | |
| 글 생성 | Claude Code CLI (`claude -p`) | API Route에서 `child_process.execFile`로 실행 |
| 브라우저 자동화 | Playwright (chromium, persistent context) | 네이버 로그인 세션 유지. 감지 이슈 발생 시에만 playwright-extra + stealth plugin 도입 |
| 가게 정보 | 네이버 지역 검색 API (오픈 API) | 클라이언트 ID/Secret은 .env, 전화번호 누락 시 생략 |
| 문체 학습 | 네이버 블로그 RSS 파싱 (axios + cheerio 또는 rss-parser) | 최초 1회 분석 → 로컬 캐싱 |
| 이미지 처리 | sharp | 분석용 리사이즈 사본 생성 |
| 상태/저장 | 로컬 JSON 파일 (`data/` 디렉터리) | DB 불필요 (Prisma/SQLite 도입하지 않음) |
| 실행 | `start.bat` (서버 기동 + 브라우저 자동 오픈) | exe 패키징 없음 |

주의: 실행 환경에 `ANTHROPIC_API_KEY` 환경 변수가 있으면 `claude -p`가 구독 대신 API 과금으로 동작한다. 서버 기동 시 이 변수 존재 여부를 검사해 UI에 경고를 띄운다.

## 3. 전체 사용자 플로우

0. **최초 셋업 (1회)**: `npm run login`으로 브라우저를 열어 네이버 직접 로그인(2단계 인증 포함) → 세션 저장. 설정 화면에서 본인 블로그 주소 입력 → RSS 수집 → 문체 프로필 생성·캐싱
1. **입력**: 업체명, 위치, 가이드라인 원문(복붙), 사진 파일(드래그앤드롭, 파일별 한 줄 설명은 선택), 자유 메모
2. **정보 수집**: 네이버 지역 검색 API로 업체 공식 정보(상호/카테고리/주소) 자동 조회 → 사용자가 검색 결과 중 해당 업체 확인/선택. 실패 시 정보 없이 진행 (graceful degradation)
3. **생성**: `claude -p` 실행 → 사진 vision 분석 + 문체 프로필 + 가게 정보 반영 → 구조화 JSON(글 블록 + 사진 배치) 반환
4. **검수**: 블록 에디터에서 텍스트 편집, 사진 블록 드래그 이동, 자동 검증 패널 확인
5. **임시저장**: Playwright가 네이버 스마트에디터 ONE에 블록 순서대로 텍스트/사진 입력 후 임시저장
6. **완료**: 완료 화면에서 이번 리뷰 요약 확인 → 사용자가 네이버에서 임시저장 글을 열어 최종 확인 후 직접 발행

## 4. 초안 JSON 스키마 (claude -p 출력 계약)

```json
{
  "title": "string — 필수 키워드 포함 제목",
  "blocks": [
    { "type": "text", "content": "string" },
    { "type": "image", "file": "IMG_001.jpg", "caption": "string(선택)" }
  ],
  "hashtags": ["string"],
  "disclosure": "string — 공정위 대가성 문구",
  "validation": {
    "keywordCounts": { "키워드": 5 },
    "charCount": 1520,
    "charCountNoSpace": 1230,
    "minCharRequired": 1000
  }
}
```

규칙:
- `blocks[].file` 값은 입력으로 제공된 파일명과 **정확히 일치**해야 한다. 앱은 생성 직후 파일명 존재 여부를 검증하고, 불일치 시 재생성 요청한다.
- 모든 사진은 정확히 1회씩 사용한다.
- 응답은 JSON만 출력한다 (마크다운 펜스 금지). 파싱 실패 시 1회 자동 재시도.

### 문체 프로필 스키마 (`data/style-profile.json`)

```json
{
  "blogUrl": "https://blog.naver.com/...",
  "analyzedAt": "ISO datetime",
  "sourcePostCount": 10,
  "profile": {
    "tone": "string — 종결어미/존댓말 스타일 요약",
    "sentenceStyle": "string — 문장 길이/리듬 특성",
    "expressions": ["자주 쓰는 표현/감탄사"],
    "emojiUsage": "string — 이모지 사용 패턴",
    "structureHabits": "string — 도입/마무리 습관"
  },
  "fewShotSamples": ["대표 문단 발췌 2~3개"]
}
```

## 5. 구현 단계 (리스크 큰 순서로 먼저 검증)

### Phase 1 — Playwright 네이버 임시저장 PoC (최우선)

이 프로젝트의 성패를 가르는 단계. 단독 스크립트(`scripts/poc-naver-draft.ts`)로 먼저 검증한다. Daewooki/naver-bc-automation이 이미지 업로드 포함 자동 포스팅을 실증했으므로 실현 가능성은 확인됨 — 해당 레포의 세션/발행 로직을 참고하되 코드는 우리 구조에 맞게 새로 작성한다.

- [ ] `scripts/login.ts` (`npm run login`): `chromium.launchPersistentContext(userDataDir)`로 브라우저를 열고 사용자가 직접 네이버 로그인(2단계 인증 포함) → 프로필 저장. 로그인 자동화는 구현하지 않는다.
- [ ] 세션 만료 감지: 글쓰기 페이지 진입 시 로그인 페이지로 리다이렉트되면 "세션 만료 — npm run login 재실행" 안내 후 중단 (세션은 통상 7~30일 유지됨을 전제)
- [ ] 네이버 블로그 글쓰기 페이지 진입 (스마트에디터 ONE)
- [ ] 하드코딩 텍스트 2블록 + 사진 1장 입력 성공
  - 텍스트: 타이핑 시뮬레이션 대신 **클립보드 붙여넣기 방식** (블록별 clipboard write → paste 이벤트)
  - 사진: 사진 첨부 버튼 → `setInputFiles`로 파일 주입
- [ ] 임시저장 버튼 클릭 → 저장 확인
- [ ] 각 동작 사이 랜덤 딜레이 1~3초 (사람 속도 모사)
- [ ] 이전에 작성 중이던 글 복구 팝업 등 인터럽트 처리
- [ ] (조건부) 봇 감지로 차단되는 경우에만 playwright-extra + puppeteer-extra-plugin-stealth 도입 검토. 기본은 순정 Playwright persistent context로 시작

스마트에디터 ONE은 가상 에디터라 DOM 셀렉터가 난해하다. 셀렉터는 하드코딩하지 말고 `lib/naver/selectors.ts` 한 파일에 모아 유지보수 가능하게 한다. UI 변경으로 깨질 수 있음을 전제로 각 단계 실패 시 스크린샷 저장 + 명확한 에러 메시지를 남긴다.

### Phase 2 — claude -p 글 생성 파이프라인

- [ ] 문체 프로필 생성기: 블로그 주소 입력 → RSS(`https://rss.blog.naver.com/{id}.xml`)에서 최근 글 수집(순차 처리 — rate limit 회피) → 본문 파싱 → `claude -p`로 문체 분석 → `data/style-profile.json` 캐싱. 재분석은 사용자가 명시적으로 요청할 때만
- [ ] 네이버 지역 검색 API 연동: 업체명+위치로 조회, 결과 목록에서 사용자가 해당 업체 선택. 전화번호 등 누락 필드는 생략, API 실패 시 가게 정보 없이 생성 진행 (graceful degradation)
- [ ] 프롬프트 템플릿 작성 (`prompts/review.md`): 문체 프로필 삽입 슬롯(few-shot 샘플 포함), 가게 공식 정보 삽입 슬롯, 네이버 리뷰 글 구조(도입→방문기→메뉴/제품→총평), 가이드라인 원문 삽입 슬롯, 사진 배치 규칙, JSON 출력 계약
- [ ] 글자수 규칙: 가이드라인에 글자수 조건이 명시되어 있으면 그 조건을 따르고, 없으면 기본값으로 **공백 제외 1,000자 이상(목표 1,500자)** 작성. 프롬프트에 명시하고, 생성 결과가 최소 글자수 미달이면 자동으로 1회 보강 재생성 요청
- [ ] 사진 전처리: sharp로 긴 변 1000px 리사이즈 사본을 temp 디렉터리에 생성 (Claude 분석용 — 토큰 절약). 원본은 임시저장 업로드용으로 보존
- [ ] `claude -p` 실행 래퍼 (`lib/claude/runner.ts`): 프롬프트 + 리사이즈 사진 경로들을 전달, stdout에서 JSON 파싱, 스키마 검증(zod), 실패 시 1회 재시도
- [ ] 검증 로직: 필수 키워드 실제 등장 횟수 카운트, 글자수(공백 제외 기준, 최소치 충족 여부 판정), 공정위 문구 포함 여부, 사진 파일명 매칭 → 검증 결과 객체 반환

### Phase 3 — Next.js UI + API Routes

- [ ] API Routes: `POST /api/style-profile`(문체 분석), `GET /api/place-search`(지역 검색), `POST /api/generate`(초안 생성), `POST /api/upload-draft`(임시저장 실행), `GET /api/status`(환경 체크: claude 설치/로그인, ANTHROPIC_API_KEY 경고, 네이버 세션 존재 여부), `GET /api/history`(작성 이력)
- [ ] 장시간 작업 상태 전달: 생성/임시저장은 1~3분 소요 → SSE(Server-Sent Events) 또는 폴링으로 진행 상태(idle / generating / uploading / done / error)와 단계 텍스트를 프론트에 push
- [ ] 화면 0 (설정): 블로그 주소 입력 + 문체 프로필 카드, 환경 체크 상태 표시(Claude Code 로그인, 네이버 세션, 지역검색 API 키)
  - 문체 프로필 카드: 현재 프로필 상태 표시 — 분석 일시, 분석에 사용한 글 개수, 문체 요약(tone 필드) 미리보기. 프로필이 없으면 "아직 분석 전" 상태와 [프로필 생성] 버튼 표시
  - [프로필 갱신] 버튼: 클릭 시 RSS 재수집 → 문체 재분석 → `data/style-profile.json` 덮어쓰기. 진행 중에는 로딩 오버레이("문체 분석 중...") 표시
  - 갱신 실패 시 기존 프로필 유지 (새 프로필 저장은 분석 성공 후에만 — 임시 파일에 쓰고 성공 시 교체)
  - 프로필이 오래된 경우(예: 분석 후 90일 경과) 카드에 "갱신 권장" 배지 표시 — 자동 재분석은 하지 않음
- [ ] 화면 1 (입력): 업체명/위치/가이드라인 textarea, 지역 검색 결과 선택 UI, 사진 드래그앤드롭 존(썸네일 그리드, 파일별 설명 입력은 선택), 메모, [초안 생성] 버튼
  - 지역 검색은 별도 검색 버튼 없이 **디바운스 자동 검색**(업체명/위치 입력 멈춤 후 ~0.5초): 검색 트리거 시 결과란에 인라인 스피너 + "검색중..." 표시 (전체 화면 오버레이 아님)
  - 결과란 상태 4가지: 대기(입력 안내 문구) / 검색중(인라인 로딩) / 결과 목록(사용자가 해당 업체 클릭 확정 — 동명 업체 오매칭 방지) / 결과 없음·실패("가게 정보 없이 진행" 선택지 + 다시 검색 링크)
  - 사진 첨부: 여러 장을 한 번에 드래그앤드롭 또는 파일 선택(multiple). 초기 상태는 빈 점선 영역("사진을 이곳에 끌어다 놓으세요")이며, 추가 드롭 시 기존 목록을 덮어쓰지 않고 뒤에 이어붙인다. 각 항목은 썸네일 + 파일명 + 한 줄 설명 입력칸(선택) + 삭제(×) 버튼으로 구성하고 순서 변경을 지원한다. 기본 정렬은 파일명/촬영시간 순 (방문 동선을 반영하므로 Claude의 배치 힌트로 사용)
- [ ] 화면 2 (검수): blocks 배열 렌더링 블록 에디터 — 텍스트 블록 인라인 편집, 사진 블록 썸네일 표시 + 드래그로 순서 변경, 우측 검증 패널(키워드 횟수/글자수/공정위 문구 체크리스트), [임시저장 실행] 버튼
- [ ] 화면 3 (진행): Playwright 실행 로그 스트리밍, 성공/실패 표시, 실패 시 스크린샷 표시. 로그 완료 시 [완료 화면으로] 버튼 노출
- [ ] 화면 4 (완료): 임시저장 성공 안내 + "네이버에서 최종 확인 후 직접 발행" 문구, 이번 리뷰 요약(업체/제목/글자수/사진 수/저장 위치), [네이버 임시저장함 열기] · [새 리뷰 작성] 버튼
- [ ] 공통 헤더 — 단계 레일: `입력 › 검수 › 진행 › 완료` 4단계를 화살표로 연결해 표시. 설정 화면은 레일에서 제외하고 우측 상단 [⚙ 설정] 버튼으로 진입한다. 지나온 단계는 체크 표시 + 강조색, 현재 단계는 배경 강조로 구분
- [ ] 로딩 오버레이 (공통 컴포넌트): claude -p 실행 중이거나 Playwright 작업 중일 때 화면 중앙에 스피너 + "작업중..." 문구 표시
  - 스피너 아래에 현재 단계 텍스트 표시: "사진 분석 및 초안 작성 중...", "네이버 블로그 임시저장 중..." 등
  - 경과 시간 표시 (초 단위 카운트업) — 긴 작업에서 멈춤이 아님을 인지시키기 위함
  - 오버레이 표시 중에는 입력/버튼 비활성화 (중복 실행 방지). 서버 측에서도 동시 실행 방지 락 적용
  - [취소] 버튼 제공: 실행 중인 child process / Playwright 작업을 서버에서 kill하고 입력 화면으로 복귀
- [ ] 작성 이력 저장: 완료된 리뷰 JSON을 `data/history/`에 저장 (업체명/날짜 목록 조회)

### Phase 4 — 통합 및 실행 편의

- [ ] Phase 1 PoC 스크립트를 앱 모듈로 이관 (`lib/naver/uploader.ts` — blocks JSON → 순차 입력 엔진)
- [ ] 종단 테스트: 실제 체험단 가이드라인 1건으로 입력→생성→검수→임시저장 전체 흐름
- [ ] `start.bat`: 서버 기동(`npm run start` 또는 dev) + 기본 브라우저에서 localhost:3000 자동 오픈, 창 닫으면 서버 종료 안내
- [ ] 첫 실행 온보딩(화면 0에 통합): Claude Code 설치/로그인 확인, ANTHROPIC_API_KEY 경고, `npm run login` 안내, 네이버 지역검색 API 키 설정 안내(.env)

## 6. 디렉터리 구조 (제안)

```
review-auto/
├── app/                        # Next.js App Router
│   ├── page.tsx                # 화면 1 (입력)
│   ├── review/page.tsx         # 화면 2 (검수)
│   ├── progress/page.tsx       # 화면 3 (진행)
│   ├── done/page.tsx           # 화면 4 (완료)
│   ├── settings/page.tsx       # 화면 0 (설정/온보딩)
│   └── api/
│       ├── style-profile/route.ts
│       ├── place-search/route.ts
│       ├── generate/route.ts
│       ├── upload-draft/route.ts
│       ├── status/route.ts
│       └── history/route.ts
├── lib/
│   ├── claude/runner.ts        # claude -p 실행 래퍼
│   ├── naver/
│   │   ├── uploader.ts         # blocks → 스마트에디터 입력 엔진
│   │   ├── selectors.ts        # 네이버 DOM 셀렉터 모음
│   │   ├── local-search.ts     # 지역 검색 API
│   │   └── rss.ts              # 블로그 RSS 수집/파싱
│   ├── images/resize.ts        # sharp 리사이즈
│   └── validate.ts             # 키워드/글자수/공정위 검증
├── prompts/
│   ├── review.md               # 리뷰 생성 프롬프트
│   └── style-analysis.md       # 문체 분석 프롬프트
├── scripts/
│   ├── login.ts                # npm run login (네이버 세션 저장)
│   └── poc-naver-draft.ts      # Phase 1 검증 스크립트
├── data/                       # style-profile.json, history/ (gitignore)
├── start.bat
├── .env.example                # NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
└── package.json
```

## 7. 범위 제외 (구현하지 말 것)

- 발행 버튼 자동 클릭 (임시저장까지만)
- 네이버 로그인 자동화 (persistent context 세션 재사용만)
- 예약/대량 발행, 다계정 관리
- API 키 기반 Anthropic API 직접 호출 (Pro 구독 claude -p만 사용)
- Vercel 등 클라우드 배포, Electron/exe 패키징
- DB 도입 (Prisma/SQLite 불필요 — 로컬 JSON으로 충분)

## 8. 완료 기준

실제 체험단 1건 기준: 입력 5분 이내 → 가게 정보 자동 반영 + 내 문체로 초안 생성 → 검수/수정 → 임시저장 자동 완료 → 네이버에서 임시저장 글이 사진 포함 정상 상태로 확인되면 완료.
