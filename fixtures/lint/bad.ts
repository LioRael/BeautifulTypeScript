export function floating(): void {
  Promise.resolve(1);
}
export function misuse(): void {
  [1].forEach(() => Promise.resolve());
}
export function voidIsNotHandling(): void {
  void Promise.resolve();
}
