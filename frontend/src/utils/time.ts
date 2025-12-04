export function time(name: string) {
  if (import.meta.env.DEV) {
    console.time(`[perf] ${name}`);
  }
}

export function timeEnd(name: string) {
  if (import.meta.env.DEV) {
    console.timeEnd(`[perf] ${name}`);
  }
}
