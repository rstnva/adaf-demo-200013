import '@prisma/client'

declare module '@prisma/client' {
  // Augment client with dynamic properties for newly added models
  interface PrismaClient {
    limit: unknown
    changeLog: unknown
    rule: unknown
  }
}
