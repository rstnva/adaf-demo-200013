export async function getAPY(): Promise<number> {
  // mock async
  await new Promise((r) => setTimeout(r, 400))
  return 7.2
}
