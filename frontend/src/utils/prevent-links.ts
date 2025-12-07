export function preventLeftClick(evt: React.MouseEvent) {
  if (evt.button === 0 && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey) {
    evt.preventDefault();
    return true;
  }

  return false;
}
