export function canDisconnectExternalIdentity(
  provider: string,
  usableLoginIdentityCount: number,
) {
  return isUsableLoginProvider(provider)
    ? usableLoginIdentityCount > 1
    : usableLoginIdentityCount > 0;
}

function isUsableLoginProvider(provider: string) {
  return provider !== "steam";
}
