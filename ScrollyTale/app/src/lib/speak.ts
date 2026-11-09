/** Listen, using the device voice the reader already relies on. */

export function speakSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (speakSupported()) window.speechSynthesis.cancel();
}

export function speak(text: string, onDone?: () => void): void {
  if (!speakSupported()) return;
  window.speechSynthesis.cancel();

  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.speak(utterance);
}
