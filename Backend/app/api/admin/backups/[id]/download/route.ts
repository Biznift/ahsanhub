import { requireAdmin } from "@/lib/auth";
import { readBackupFile } from "@/lib/backup";
import { HttpError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const { row, body } = await readBackupFile((await context.params).id);
    return new Response(body, {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${row.name.replace(/[^a-zA-Z0-9._-]/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error instanceof HttpError ? error.message : "Something went wrong on the server." }, { status });
  }
}
