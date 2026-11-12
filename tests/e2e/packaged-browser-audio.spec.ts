import fs from "fs";
import http from "http";
import path from "path";
import childProcess from "child_process";
import { AddressInfo } from "net";
import {
  _electron as electron,
  ElectronApplication,
  expect,
  test,
} from "@playwright/test";

import productIdentity from "../../product-identity.json";
import packageMetadata from "../../package.json";

type ProbeFacts = {
  pcmFrameCount: number;
  peakAbsoluteSample: number;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function serveFixture(): Promise<{
  close: () => Promise<void>;
  url: string;
}> {
  const fixture = fs.readFileSync(
    path.resolve(__dirname, "../fixtures/browser-audio.html"),
  );
  const server = http.createServer((request, response) => {
    if (request.url !== "/browser-audio.html") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    });
    response.end(fixture);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${address.port}/browser-audio.html`,
        close: () =>
          new Promise<void>((closeResolve, closeReject) => {
            server.close((error) =>
              error ? closeReject(error) : closeResolve(),
            );
          }),
      });
    });
  });
}

test("packaged app captures non-silent PCM from a loopback browser fixture", async () => {
  test.skip(process.platform !== "win32" || process.arch !== "x64");

  requiredEnvironment("DUNGEON_JOCKEY_E2E_OUTPUT");
  const packageDirectory = requiredEnvironment("DUNGEON_JOCKEY_E2E_PACKAGE");
  const profilePath = requiredEnvironment("DUNGEON_JOCKEY_E2E_PROFILE");
  const executablePath = path.join(
    packageDirectory,
    `${productIdentity.packageName}.exe`,
  );

  expect(fs.statSync(executablePath).isFile()).toBe(true);
  expect(fs.existsSync(`${executablePath}.sig`)).toBe(false);

  const metadataCommand = [
    "$v=(Get-Item -LiteralPath $env:DUNGEON_JOCKEY_METADATA_EXE).VersionInfo;",
    "[Console]::Out.Write(($v | Select-Object ProductName,FileDescription,OriginalFilename | ConvertTo-Json -Compress))",
  ].join("");
  const metadata = JSON.parse(
    childProcessOutput(
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ["-NoProfile", "-Command", metadataCommand],
      { DUNGEON_JOCKEY_METADATA_EXE: executablePath },
    ),
  );
  expect(metadata.ProductName).toBe(productIdentity.displayName);
  expect(metadata.FileDescription).toBe(productIdentity.displayName);
  expect(metadata.OriginalFilename).toBe(`${productIdentity.packageName}.exe`);

  const fixture = await serveFixture();
  const processErrors: string[] = [];
  const rendererErrors: string[] = [];
  let application: ElectronApplication | undefined;
  let cleanExitCode: number | null = null;

  try {
    const launchedApplication = await electron.launch({
      executablePath,
      env: {
        ...process.env,
        DUNGEON_JOCKEY_AUDIO_SMOKE_PROBE: "main-pcm-v1",
        DUNGEON_JOCKEY_TEST_PROFILE: profilePath,
      },
    });
    application = launchedApplication;
    launchedApplication.process().stderr?.on("data", (chunk) => {
      processErrors.push(String(chunk));
    });
    launchedApplication.on("window", (page) => {
      page.on("crash", () => rendererErrors.push("renderer crashed"));
      page.on("pageerror", (error) => rendererErrors.push(error.message));
    });

    const mainWindow = await launchedApplication.firstWindow();
    await expect(mainWindow.getByRole("button", { name: "add tab" })).toBeVisible();
    await expect(mainWindow.getByLabel("Dungeon Jockey temporary mark")).toBeVisible();
    await expect(mainWindow.getByText("Oops, something went wrong..")).toHaveCount(0);

    const runtimeIdentity = await launchedApplication.evaluate(({ app }) => ({
      appName: app.getName(),
      executableName: process.execPath.split(/[\\/]/).pop(),
      isPackaged: app.isPackaged,
      userData: app.getPath("userData"),
    }));
    expect(runtimeIdentity).toEqual({
      appName: productIdentity.displayName,
      executableName: `${productIdentity.packageName}.exe`,
      isPackaged: true,
      userData: profilePath,
    });

    // Exercise the real isolated preload and guarded main handler on both
    // documents, not a main-process shortcut to app.getVersion().
    for (const reload of [false, true]) {
      if (reload) {
        await mainWindow.reload();
        await expect(
          mainWindow.getByRole("button", { name: "add tab" }),
        ).toBeVisible();
      }
      const versionResult = await mainWindow.evaluate(() =>
        window.dungeonJockey.getVersion(),
      );
      expect(versionResult).toEqual({
        ok: true,
        protocolVersion: 1,
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        version: packageMetadata.version,
      });
      expect(
        await mainWindow.evaluate(() => Object.keys(window.dungeonJockey)),
      ).toEqual(["getVersion"]);
      expect(await mainWindow.evaluate(() => "version" in window.kenku)).toBe(
        false,
      );
      await mainWindow.getByTestId("SettingsRoundedIcon").click();
      await expect(
        mainWindow.getByText(`v${packageMetadata.version}`, { exact: true }),
      ).toBeVisible();
      await mainWindow
        .getByRole("button", { name: "Done", exact: true })
        .click();
    }

    await mainWindow.getByRole("button", { name: "add tab" }).click();
    const urlInput = mainWindow.getByRole("textbox", { name: "enter a URL" });
    await expect(urlInput).toBeVisible();
    await urlInput.fill(fixture.url);
    await urlInput.press("Enter");

    await expect
      .poll(() =>
        launchedApplication.evaluate(({ webContents }, fixtureUrl) =>
          webContents
            .getAllWebContents()
            .some((contents) => contents.getURL() === fixtureUrl),
          fixture.url,
        ),
      )
      .toBe(true);

    const fixtureHasOwnedBridge = await launchedApplication.evaluate(
      async ({ webContents }, fixtureUrl) => {
        const contents = webContents
          .getAllWebContents()
          .find((item) => item.getURL() === fixtureUrl);
        if (!contents) throw new Error("loopback fixture tab was not found");
        return contents.executeJavaScript("'dungeonJockey' in window");
      },
      fixture.url,
    );
    expect(fixtureHasOwnedBridge).toBe(false);

    await launchedApplication.evaluate(() => {
      const surface = (
        globalThis as unknown as Record<string, { reset: () => void }>
      )["__DUNGEON_JOCKEY_AUDIO_SMOKE_PROBE__"];
      if (!surface) throw new Error("main-process PCM probe is unavailable");
      surface.reset();
    });

    await expect
      .poll(async () => (await readProbe(launchedApplication)).pcmFrameCount, {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);
    const silentFacts = await readProbe(launchedApplication);
    expect(silentFacts.peakAbsoluteSample).toBe(0);

    const started = await launchedApplication.evaluate(async ({ webContents }, fixtureUrl) => {
      const fixtureContents = webContents
        .getAllWebContents()
        .find((contents) => contents.getURL() === fixtureUrl);
      if (!fixtureContents) throw new Error("loopback fixture tab was not found");
      return fixtureContents.executeJavaScript(
        "window.startDeterministicTone().then(() => document.getElementById('state').textContent)",
        true,
      );
    }, fixture.url);
    expect(started).toBe("tone-started");

    await expect
      .poll(async () => (await readProbe(launchedApplication)).peakAbsoluteSample, {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
    const audibleFacts = await readProbe(launchedApplication);
    expect(audibleFacts.pcmFrameCount).toBeGreaterThan(silentFacts.pcmFrameCount);

    const crashed = await launchedApplication.evaluate(({ webContents }) =>
      webContents.getAllWebContents().some((contents) => contents.isCrashed()),
    );
    expect(crashed).toBe(false);
    expect(rendererErrors).toEqual([]);
    expect(processErrors.join("")).not.toMatch(/fatal|uncaught|unhandled/i);

    console.log(
      JSON.stringify({
        audibleFacts,
        executablePath,
        fixtureUrl: fixture.url,
        packageIdentity: runtimeIdentity,
        silentFacts,
      }),
    );
  } finally {
    if (application) {
      const applicationProcess = application.process();
      await application.close();
      cleanExitCode = applicationProcess.exitCode;
    }
    await fixture.close();
  }

  expect(cleanExitCode).toBe(0);
  expect(fs.existsSync(profilePath)).toBe(true);
  console.log(`Packaged application clean exit verified: ${cleanExitCode}`);
});

async function readProbe(application: Awaited<ReturnType<typeof electron.launch>>) {
  return application.evaluate(() => {
    const surface = (
      globalThis as unknown as Record<
        string,
        { read: () => ProbeFacts } | undefined
      >
    )["__DUNGEON_JOCKEY_AUDIO_SMOKE_PROBE__"];
    if (!surface) throw new Error("main-process PCM probe is unavailable");
    return surface.read();
  });
}

function childProcessOutput(
  command: string,
  args: string[],
  extraEnvironment: NodeJS.ProcessEnv = {},
): string {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, ...extraEnvironment },
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "metadata check failed");
  return result.stdout;
}
