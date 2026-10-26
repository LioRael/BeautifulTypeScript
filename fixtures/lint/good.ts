export async function owned(): Promise<number> {
  return await Promise.resolve(1);
}
export async function sequential(): Promise<void> {
  for (const value of [1]) await Promise.resolve(value);
}
