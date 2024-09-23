import { write } from "@/lib/storage";

export async function POST(request: Request) {
  const fileName = request.headers.get("X-Filename");
  if (fileName == null) {
    return Response.json({error: "No X-Filename header present."});
  }

  const arrayBuffer = await request.arrayBuffer();

  const uuid = await write(fileName, Buffer.from(arrayBuffer));

  console.log(`[Upload] name: ${fileName}, size: ${arrayBuffer.byteLength}, uuid: ${uuid}`)

  return Response.json({ url: `/download/${uuid}` });
}
