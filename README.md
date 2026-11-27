# Tezgah

Tezgah is a Windows desktop workspace for Codex, Claude Code, and Google Antigravity. Run agents side by side, edit their projects, review Git changes, and preview a running web app in the same window.

![Terminal layout with the True Dark theme, an agent, and the code editor](docs/screenshots/terminal-true-dark.png)

## What you can do

- Split the workspace into up to eight agent panels. Agents can work in the same folder or in different projects. Review a reply before handing it off to another agent, and queue the handoff if the target agent is busy.
- Open **Orchestrator**, choose a lead agent and its workers, then send the lead a task. The lead can delegate independent work across the selected agents. The worker panel shows their tasks, progress, and results.
- Use one model picker for all three providers. Tezgah remembers reasoning effort, work mode, approval preferences, and tool settings per model. Claude Code also exposes Ultracode for supported models.
- Browse and search project files, edit code, and compare saved changes in the **Diff** panel. Open a running HTTP or HTTPS address, such as `http://localhost:3000`, in the **Web** panel.
- Use the composer’s **+** menu to add file or folder context, attach a sketch, set a goal, or enable browser and Windows computer tools. Tezgah asks before performing each browser or computer action.
- Switch between **Terminal** and **Classic** in **Settings**. Each layout remembers its palette, including True Dark, Darcula, [Dracula](https://draculatheme.com/spec), and [Nord](https://www.nordtheme.com/docs/colors-and-palettes/). English is the default interface language. Select **Türkçe** to switch to Turkish.

![Classic layout with the Darcula theme, split agent panels, and a Git diff](docs/screenshots/classic-darcula-diff.png)

![Orchestrator chat with a worker task panel and completed results](docs/screenshots/orchestrator.png)

The screenshots show the bundled sample project and example conversations.

## Run locally

Install **Node.js 22.12 or later** and **Git** on Windows. Clone the repository and run these commands:

```powershell
npm ci
npm start
```

Tezgah uses the provider CLI installed on your machine and its existing login session. Sign in to the providers you use.

| Provider | Sign-in command |
| --- | --- |
| [Codex](https://learn.chatgpt.com/docs/app-server) | `codex login` |
| [Claude Code](https://code.claude.com/docs/en/cli-reference) | `claude auth login` |
| [Google Antigravity](https://antigravity.google/docs/ide/extensions/acp/) | `agy` |

Check **Connections** to see which CLIs Tezgah can reach. Available models, reasoning levels, and automatic approval options depend on the provider and your account.

For **Attach Google Chrome**, open `chrome://inspect/#remote-debugging` in Chrome, allow remote debugging, and select a tab in Tezgah. Tezgah also has a separate browser window for agent tools. Windows computer use operates on the primary display.

## Development

- `npm run check` checks JavaScript syntax.
- `node --test example/src/format.test.js` runs the sample project’s tests.
- `npm run serve` starts the browser-based development interface. Desktop tools and the embedded preview use the Electron app.
- `npm run dist:win` builds an unsigned Windows x64 installer in `dist/`.

Tezgah stores workspace settings, project paths, and its chat view on your machine. On Windows, the default location is `%LOCALAPPDATA%\Tezgah`.
