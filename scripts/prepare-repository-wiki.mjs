import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { stdout } from "node:process";

const sourceDirectory = "docs/wiki";
const outputDirectory = "dist/wiki";

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function rewriteWikiLinks(markdown) {
  return markdown.replace(/\(([^)]+)\.md(#[^)]+)?\)/g, (_match, page, anchor = "") => {
    const target = basename(page) === "index" ? "Home" : basename(page);
    return `(${target}${anchor})`;
  });
}

rmSync(outputDirectory, { force: true, recursive: true });
mkdirSync(outputDirectory, { recursive: true });

const sourcePages = readdirSync(sourceDirectory)
  .filter((filename) => filename.endsWith(".md"))
  .sort();

for (const filename of sourcePages) {
  const outputFilename = filename === "index.md" ? "Home.md" : filename;
  const source = readFileSync(join(sourceDirectory, filename), "utf8");
  const prepared = rewriteWikiLinks(stripFrontmatter(source));
  writeFileSync(join(outputDirectory, outputFilename), prepared, "utf8");
}

const sidebar = [
  "## Documentation",
  "",
  "- [Home](Home)",
  "- [Start here](getting-started)",
  "- [System architecture](architecture)",
  "- [Denshi runtime isolation](runtime-isolation)",
  "- [Provider development](providers)",
  "- [Development and testing](development-testing)",
  "- [Manifests and releases](manifests-deployment)",
  "",
].join("\n");

writeFileSync(join(outputDirectory, "_Sidebar.md"), sidebar, "utf8");
stdout.write(`Prepared ${sourcePages.length} repository Wiki pages in ${outputDirectory}.\n`);
