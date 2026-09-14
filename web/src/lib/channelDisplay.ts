export function displayChannelName(name: string) {
  return name.replace(/^(novaeworld|kuaipao)[-_]/i, "").replace(/-stable$/i, "") || "-";
}
