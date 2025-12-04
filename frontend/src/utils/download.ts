export function download(data: string, fileName: string, type: string) {
  const blob = new Blob([data], {
    type,
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
}
