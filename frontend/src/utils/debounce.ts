export function debounce<T extends unknown[], R = void>(
  cb: (...args: T) => R,
  wait: number,
) {
  let h: ReturnType<typeof setTimeout>;

  const callable = (...args: T) => {
    clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };

  return callable;
}
