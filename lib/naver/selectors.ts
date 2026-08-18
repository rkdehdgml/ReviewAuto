/**
 * 네이버 블로그 스마트에디터 ONE DOM 셀렉터 모음.
 *
 * 스마트에디터 ONE은 iframe 기반 가상 에디터라 셀렉터가 UI 업데이트로 쉽게 깨진다.
 * 코드 곳곳에 하드코딩하지 않고 이 파일에 모아 유지보수 지점을 하나로 좁힌다.
 * 값이 실제와 달라졌다면 여기만 고치면 된다.
 */
export const naverSelectors = {
  /** 로그인 여부 판별: 로그인 페이지로 리다이렉트되면 이 셀렉터가 나타난다 */
  loginPageIdInput: "#id",

  /** 블로그 글쓰기 진입 iframe (mainFrame) */
  mainFrame: "iframe#mainFrame",

  /** "이전에 작성 중이던 글이 있습니다" 복구 팝업 */
  restorePopup: {
    dialog: ".se-popup-dim-white",
    cancelButton: ".se-popup-button-cancel", // 새 글로 시작 (취소 = 복구 안 함)
    confirmButton: ".se-popup-button-confirm", // 이어 쓰기
  },

  /** 에디터 본문 영역 (contenteditable 최상위 컨테이너) */
  editorBody: ".se-main-container",

  /** 제목 입력 영역 */
  titleArea: ".se-title-text .se-text-paragraph",

  /** 본문 첫 번째 텍스트 컴포넌트 (글 시작 지점) */
  firstParagraph: ".se-component.se-text .se-text-paragraph",

  /** 사진 첨부 툴바 버튼 */
  photoToolbarButton: "button.se-image-toolbar-button",

  /** 사진 첨부 시 열리는 파일 input (setInputFiles 대상) */
  photoFileInput: "input[type=file].se-file-input",

  /** 임시저장 버튼 */
  saveDraftButton: "button.save_btn__M6EbE, .se-save-button",

  /** 임시저장 완료 토스트/안내 */
  saveDraftToast: ".se-toolbar-save-complete-message, .se-alert-toast",
} as const;
