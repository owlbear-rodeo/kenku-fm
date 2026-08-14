## Contributing to Dungeon Jockey

Dungeon Jockey is under active development. Please keep proposals focused and discuss substantial changes before investing in an implementation.


#### **Local development workflow**

Use Node.js `22.23.1` and Yarn Classic `1.22.22`. The root `.node-version` file can be consumed by `fnm` and compatible version managers.

Install dependencies without changing the committed lockfile:

```sh
yarn install --frozen-lockfile
```

Before submitting a change, run the fast verification entrypoint:

```sh
yarn verify
```

This runs the toolchain and Phase 0 boundary checks, lint, typechecking, and the deterministic unit, component, and integration tests.

On Windows x64, run the slower packaged browser-audio smoke separately:

```sh
yarn test:e2e
```

The smoke creates an unsigned package and isolated application data beneath the operating system temporary directory, serves a loopback-only audio fixture, and requires no real account or external service. It cleans its own package and profile after the run. Application startup and other package/build commands (`yarn start`, `yarn package`, and `yarn make`) remain separate.

GitHub Actions runs fast verification on `ubuntu-24.04` and the packaged smoke on `windows-2025`.


#### **Did you find a bug?**

* **Ensure the bug was not already reported** by searching the current repository's [issues](https://github.com/ProbablyRyan/kenku-fm/issues).

* If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/ProbablyRyan/kenku-fm/issues/new). Include a clear title, reproduction steps, relevant environment details, and the smallest useful example.


#### **Did you write a patch that fixes a bug?**

* Open a new GitHub pull request with the patch.

* Ensure the PR description clearly describes the problem and solution. Include the relevant issue number if applicable.


#### **Did you fix whitespace, format code, or make a purely cosmetic patch?**

Changes that are cosmetic in nature and do not add anything substantial to the stability, functionality, or testability will generally not be accepted


#### **Do you intend to add a new feature or change an existing one?**

Discuss feature proposals with the maintainer before opening a pull request so work stays aligned with the active architecture phases.
