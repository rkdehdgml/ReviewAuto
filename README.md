# ReviewAuto (리뷰오토)

체험단 리뷰 글 작성을 반자동화하는 **개인용 로컬 웹앱**입니다.
Claude(`claude -p`)가 사진을 분석해 초안을 작성하고, Playwright가 네이버 블로그 스마트에디터에
**임시저장까지** 자동 입력합니다. **발행은 항상 사용자가 직접** 합니다.

전체 설계는 [`review-auto-implementation-plan.md`](./review-auto-implementation-plan.md)를 참고하세요.

## 처음 설정하기

```bash
npm install          # 의존성 설치 (playwright chromium 자동 설치됨)
cp .env.example .env # 네이버 지역 검색 API 키를 쓰려면 채워넣기 (없어도 동작함)
npm run login        # 브라우저가 열리면 네이버에 직접 로그인 (2단계 인증 포함)
```

`npm run login`은 로그인을 자동화하지 않습니다 — 브라우저 창에서 직접 로그인한 뒤,
세션이 `.naver-session/`에 저장되면 터미널에서 Ctrl+C로 종료하면 됩니다. 세션은 보통 7~30일 유지되며,
만료되면 앱이 알려줍니다.

## Phase 1 PoC 검증 (권장)

전체 앱을 쓰기 전에, 가장 리스크가 큰 "네이버 임시저장 자동 입력"이 실제로 되는지 먼저 확인하세요.

```bash
npm run poc:naver-draft -- "C:\path\to\사진.jpg"
```

성공하면 네이버 블로그에 하드코딩된 테스트 글이 임시저장됩니다. 이 글은 직접 삭제해주세요.
실패하면 `lib/naver/selectors.ts`의 셀렉터를 실제 네이버 에디터 DOM에 맞게 조정해야 할 수 있습니다
(스마트에디터 ONE은 UI가 자주 바뀌는 가상 에디터라 셀렉터가 깨지기 쉽습니다).

## 앱 실행

```bash
npm run dev     # 개발 모드
# 또는
start.bat       # 창을 더블클릭하면 서버 기동 + 브라우저 자동 오픈
```

브라우저에서 `http://localhost:3000`으로 접속합니다. 우측 상단 [⚙ 설정]에서 환경 체크(Claude Code
로그인, 네이버 세션, API 키)와 문체 프로필 생성을 먼저 진행하세요.

## 주의사항

- 실행 환경에 `ANTHROPIC_API_KEY`가 설정되어 있으면 `claude -p`가 Pro 구독 대신 API 과금으로
  동작합니다. 설정 화면에서 경고를 표시합니다.
- 자동화 범위는 **임시저장까지**입니다. 발행 버튼은 절대 자동으로 누르지 않습니다.
- `data/`, `.naver-session/`, `temp/`는 로컬 전용이며 git에 커밋되지 않습니다.
