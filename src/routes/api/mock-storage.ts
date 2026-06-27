import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs";
import * as path from "path";

export const Route = createFileRoute("/api/mock-storage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentLength = Number(request.headers.get("content-length"));
          if (contentLength > 10 * 1024 * 1024) {
            return new Response("Payload too large", { status: 413 });
          }

          const formData = await request.formData();
          const file = formData.get("file") as File;
          const bucket = formData.get("bucket") as string;
          const filePath = formData.get("path") as string;

          if (!file || !bucket || !filePath) {
            return new Response("Missing parameters", { status: 400 });
          }

          // Path Traversal Mitigation: Validate bucket and filePath format
          if (
            typeof bucket !== "string" ||
            !/^[a-zA-Z0-9_-]+$/.test(bucket) ||
            typeof filePath !== "string" ||
            filePath.includes("..") ||
            filePath.startsWith("/") ||
            filePath.startsWith("\\")
          ) {
            return new Response("Invalid bucket or file path", { status: 400 });
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          
          // Verify resolved paths stay within target base directory
          const baseDir = path.resolve(process.cwd(), "public", "mock-storage");
          const destDir = path.resolve(baseDir, bucket, path.dirname(filePath));
          
          if (!destDir.startsWith(baseDir)) {
            return new Response("Access Denied", { status: 403 });
          }

          fs.mkdirSync(destDir, { recursive: true });

          const destPath = path.resolve(destDir, path.basename(filePath));
          fs.writeFileSync(destPath, buffer);

          return new Response(JSON.stringify({ path: `${bucket}/${filePath}` }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(e.message, { status: 500 });
        }
      },
    },
  },
});
