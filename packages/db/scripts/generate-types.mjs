import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../../");

try {
  execSync("pnpm tsc -b packages/db", {
    cwd: projectRoot,
    stdio: "inherit"
  });
  console.log("Generated database type declarations in packages/db/dist");
} catch (error) {
  console.error("Failed to generate database types", error);
  process.exit(1);
}
