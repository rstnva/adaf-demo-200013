export async function getTVL(): Promise<number> {
  await new Promise((r) => setTimeout(r, 400))
  return 2847328
}
