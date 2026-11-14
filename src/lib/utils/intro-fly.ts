const KEY = "fire-atlas:intro-fly";

export function markIntroFly(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    return;
  }
}

export function peekIntroFly(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function clearIntroFly(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    return;
  }
}
