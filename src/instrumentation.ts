export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const z = await import("zod");
    const storage = await import("./lib/storage");

    const envSchema = z.object({
      MAX_FILE_AGE: z.coerce.number(),
    });
    
    const parse = envSchema.safeParse(process.env);

    if (!parse.success) {
      console.error("instrumentation initialization failed due to invalid MAX_FILE_AGE environment variable");
      return;
    }

    setInterval(() => {
      storage.cleanOldFiles(parse.data.MAX_FILE_AGE);
    }, 1000 * 10);
  }
}