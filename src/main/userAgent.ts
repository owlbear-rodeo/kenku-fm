import os from "os";

const platformMap: Record<string, string> = {
  darwin: "Macintosh; Intel Mac OS X 10_15_7",
  win32: "Windows NT 10.0; Win64; x64",
  linux: "X11; Linux x86_64",
};

const chromeVersion = "Chrome/98.0.4758.109";

/** Approximate the user agent for this platform */
export function getUserAgent() {
  const platform = platformMap[os.platform()] || platformMap.win32;
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}
