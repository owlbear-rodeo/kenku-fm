[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

# Dungeon Jockey

**Tabletop Audio for Game Masters**

Dungeon Jockey is a desktop tabletop-audio application under active development. The current codebase retains proven browser, capture, local-playback, Discord-output, and CastLabs/Widevine foundations while the Dungeon Jockey product architecture is built in isolated phases. Features described by future plans should not be treated as complete or released.

No official Dungeon Jockey binaries or automatic update service are currently provided by this repository.

## Development

The project uses Yarn Classic and Electron Forge. From a compatible development environment:

```text
yarn install --frozen-lockfile
yarn verify:phase0-boundaries
yarn start
yarn package -- --platform=win32 --arch=x64
yarn make
```

Local packages are unsigned.

## Protected media

The application uses [CastLabs Electron for Content Security](https://github.com/castlabs/electron-releases) for the inherited Widevine component startup path. Component readiness alone does not establish that a particular protected service will play. Platform and service limitations must be verified against a packaged build.

## Project Structure

Application source is in the `src` folder. Product identity metadata is centralized in `product-identity.json`.

Within `src`, `index.ts` and the `main` folder contain the Electron main-process code, including Discord transport, local control, and browser-view management.

The `renderer.ts` file and `renderer` folder contain the React/Redux renderer.

The `preload.ts` file and `preload` folder contain the transitional preload bridge.

The `player` folder contains the transitional built-in audio player, loaded as a separate Forge entry point.

## Lineage, attribution, and license

Dungeon Jockey is derived from [Kenku FM](https://github.com/owlbear-rodeo/kenku-fm), originally developed by Owlbear Rodeo. The repository preserves Kenku's Git history and retains Kenku-derived implementation while Dungeon Jockey-owned boundaries are introduced. This attribution describes project lineage; Owlbear services and release infrastructure are not Dungeon Jockey distribution or support channels.

Dungeon Jockey and its Kenku-derived source are licensed under the [GNU General Public License v3.0](./LICENSE). Copyright remains with the respective contributors and original copyright holders.

## Contributing

See the [contribution guide](./.github/CONTRIBUTING.md) before proposing a change.
