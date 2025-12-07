export function cx(...args: unknown[]): string {
  let str = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] && typeof args[i] === "string") {
      str += (str && " ") + args[i];
    }
  }

  return str;
}
