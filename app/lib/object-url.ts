const cache = new WeakMap<File, string>();

/** 같은 File에 대해 항상 같은 objectURL을 반환한다 (렌더마다 새로 만들어 누수되는 것을 방지). */
export function getObjectUrl(file: File): string {
  const cached = cache.get(file);
  if (cached) return cached;
  const url = URL.createObjectURL(file);
  cache.set(file, url);
  return url;
}
