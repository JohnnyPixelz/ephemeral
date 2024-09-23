import { read } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: { uuid: string } }) {
  let file;

  try {
    file = await read(params.uuid);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    console.log(error);
    console.log(`[Download] uuid: ${params.uuid}, not found.`)
    return Response.json({ error: "No file found." });
  }

  console.log(`[Download] name: ${file.fileName}, size: ${file.buffer.length}, uuid: ${params.uuid}`)

  return new Response(file.buffer, {
    status: 200,
    headers: {
      "Content-Length": `${file.buffer.length}`,
      "Content-Disposition": `attachment; filename="${file.fileName}"` // Suggest filename for download
    }
  })
}