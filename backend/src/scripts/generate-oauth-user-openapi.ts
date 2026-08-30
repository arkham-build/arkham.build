import { mkdir, writeFile } from "node:fs/promises";
import { format } from "oxfmt";
import { serializeOAuthUserOpenApiDocument } from "../openapi/oauth-user-document.ts";

const outputUrl = new URL(
  "../../../docs/openapi/oauth-user-api.json",
  import.meta.url,
);

const result = await format(
  "oauth-user-api.json",
  serializeOAuthUserOpenApiDocument(),
  { printWidth: 80, tabWidth: 2, useTabs: false },
);
if (result.errors.length > 0) {
  throw new Error(
    `OpenAPI formatting failed: ${result.errors
      .map((error) => error.message)
      .join("; ")}`,
  );
}

await mkdir(new URL("./", outputUrl), { recursive: true });
await writeFile(outputUrl, result.code, "utf8");

console.info(`Generated ${outputUrl.pathname}`);
