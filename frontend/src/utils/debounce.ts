export function debounce<T extends unknown[]>(
  cb: (...args: T) => void,
  wait: number,
) {
  let h: ReturnType<typeof setTimeout>;

  const callable = (...args: T) => {
    clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };

  return callable;
}
