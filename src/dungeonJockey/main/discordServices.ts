import { DiscordBroadcast } from "../../main/broadcast/DiscordBroadcast";
import { DiscordOutput } from "../adapters/kenku/DiscordOutput";
import { createDiscordSelection } from "../adapters/secrets/discordSelection";
import { DiscordConfigurationService } from "./DiscordConfigurationService";
import { getApplicationSecretStore } from "./secretStore";

export function createDiscordServices(profileRoot: string) {
  const retained = new DiscordBroadcast();
  const output = new DiscordOutput(() => retained.createClient(), retained.audioPlayer);
  const configuration = new DiscordConfigurationService(createDiscordSelection(profileRoot, process.platform),
    () => getApplicationSecretStore(profileRoot), output,
    process.platform === "linux" ? "session-only" : ["win32", "darwin"].includes(process.platform) ? "remembered" : "unsupported");
  return { output, configuration };
}
