/**
 * npm run login
 *
 * 브라우저를 열어 사용자가 직접 네이버에 로그인(2단계 인증 포함)하도록 한다.
 * 로그인 자동화는 하지 않는다 — persistent context(userDataDir)에 세션을 저장해
 * 이후 스크립트/앱이 재사용할 수 있게 하는 것이 이 스크립트의 유일한 목적이다.
 */
import { launchNaverContext } from "../lib/naver/uploader";

async function main() {
  console.log("브라우저를 여는 중...");
  const context = await launchNaverContext({ headless: false });
  const page = await context.newPage();
  await page.goto("https://nid.naver.com/nidlogin.login");

  console.log("\n브라우저 창에서 네이버에 로그인해주세요 (2단계 인증 포함).");
  console.log("로그인이 끝나면 이 터미널에서 Ctrl+C를 눌러 종료하세요.");
  console.log("세션은 이 창을 닫아도 .naver-session/ 에 저장되어 있습니다 (통상 7~30일 유지).\n");

  // 사용자가 로그인을 마치고 Ctrl+C로 종료할 때까지 대기.
  await new Promise(() => {
    /* 무한 대기 — 사용자가 수동으로 종료 */
  });
}

main().catch((err) => {
  console.error("로그인 스크립트 실행 중 오류:", err);
  process.exit(1);
});
