import { describe, expect, it } from "vitest";
import { createManifest } from "../../scripts/manifest-shared";

describe("release manifest hosting", () => {
  it.each([
    {
      rawBaseUrl: "https://git.example.test/team/notifier/raw/branch/main",
      repositoryUrl: "https://git.example.test/team/notifier",
    },
    {
      rawBaseUrl: "https://github.com/team/notifier/raw/refs/heads/main",
      repositoryUrl: "https://github.com/team/notifier",
    },
    {
      rawBaseUrl: "https://raw.githubusercontent.com/team/notifier/main",
      repositoryUrl: "https://github.com/team/notifier",
    },
  ])("keeps install assets on the selected raw host", ({ rawBaseUrl, repositoryUrl }) => {
    const manifest = createManifest({ rawBaseUrl });

    expect(manifest).toMatchObject({
      manifestURI: `${rawBaseUrl}/seanime-download-notifier.json`,
      payloadURI: `${rawBaseUrl}/dist/plugin.js`,
      icon: `${rawBaseUrl}/assets/logo.png`,
      website: repositoryUrl,
      readme: `${repositoryUrl}/wiki`,
    });
    expect(new Set([manifest.manifestURI, manifest.payloadURI, manifest.icon]
      .map((value) => new URL(value).origin))).toEqual(new Set([new URL(rawBaseUrl).origin]));
  });

  it("rejects a base URL that cannot identify its repository page", () => {
    expect(() => createManifest({ rawBaseUrl: "https://cdn.example.test/notifier/main" }))
      .toThrow("rawBaseUrl must identify a repository raw-content path");
  });

  it("supports immutable release assets distinct from the raw asset host", () => {
    const rawBaseUrl = "https://raw.githubusercontent.com/team/notifier/main";
    const manifestURI = "https://github.com/team/notifier/releases/download/v1.2.3/seanime-download-notifier.json";
    const payloadURI = "https://github.com/team/notifier/releases/download/v1.2.3/plugin.js";
    const manifest = createManifest({ rawBaseUrl, manifestURI, payloadURI });

    expect(manifest.manifestURI).toBe(manifestURI);
    expect(manifest.payloadURI).toBe(payloadURI);
    expect(manifest.icon).toBe(`${rawBaseUrl}/assets/logo.png`);
    expect(new URL(manifest.payloadURI).origin).toBe("https://github.com");
    expect(new URL(manifest.icon).origin).toBe("https://raw.githubusercontent.com");
  });

  it("keeps release manifest and payload on release assets when configured", () => {
    const rawBaseUrl = "https://git.example.test/team/notifier/raw/branch/main";
    const manifestURI = "https://git.example.test/team/notifier/releases/download/v1.2.3/seanime-download-notifier.json";
    const payloadURI = "https://git.example.test/team/notifier/releases/download/v1.2.3/plugin.js";
    const manifest = createManifest({ rawBaseUrl, manifestURI, payloadURI });

    expect(manifest.manifestURI).toContain("/releases/download/");
    expect(manifest.payloadURI).toContain("/releases/download/");
  });

  it("allows generators to use the package version", () => {
    const manifest = createManifest({
      rawBaseUrl: "https://raw.githubusercontent.com/team/notifier/main",
      version: "9.8.7",
    });

    expect(manifest.version).toBe("9.8.7");
  });

  it("uses a hosted icon and local payload for development manifests", () => {
    const manifest = createManifest({
      rawBaseUrl: "",
      development: true,
      payloadURI: "C:\\repo\\dist\\plugin.dev.js",
      developmentIconURI: "https://git.example.test/team/notifier/raw/branch/main/assets/logo.png",
    });

    expect(manifest).toMatchObject({
      manifestURI: "",
      icon: "https://git.example.test/team/notifier/raw/branch/main/assets/logo.png",
      readme: "",
      payloadURI: "C:\\repo\\dist\\plugin.dev.js",
    });
  });

  it("rejects development manifests without an icon URL", () => {
    expect(() => createManifest({ rawBaseUrl: "", development: true, payloadURI: "plugin.dev.js" }))
      .toThrow("Development manifests require an icon URI");
  });
});
