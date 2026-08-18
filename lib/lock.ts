/**
 * 프로세스 내 단순 동시 실행 방지 락.
 * 이 앱은 단일 사용자 로컬 서버라 프로세스 메모리 수준의 락으로 충분하다 (DB/파일 락 불필요).
 */
const locks = new Set<string>();

export class AlreadyRunningError extends Error {
  constructor(name: string) {
    super(`이미 실행 중인 작업이 있습니다: ${name}`);
    this.name = "AlreadyRunningError";
  }
}

export function acquireLock(name: string): void {
  if (locks.has(name)) {
    throw new AlreadyRunningError(name);
  }
  locks.add(name);
}

export function releaseLock(name: string): void {
  locks.delete(name);
}

export function isLocked(name: string): boolean {
  return locks.has(name);
}
