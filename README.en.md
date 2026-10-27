# DSH Minimal Free Search

DSH Minimal Free Search is a minimal-permission web search plugin for DeepSeek Harness (DSH). It registers a single native `WebSearchProvider` so that DSH's built-in `web_search` tool can return candidate web pages via Bing or DuckDuckGo Lite, with no search service API key required.

This version targets DSH Desktop `0.2.1-rc.3`. The project is not published to npm; install it from the GitHub repository.

## First-version scope

The plugin provides:

- Two fixed public search backends: Bing and DuckDuckGo Lite;
- Bing by default, with serial fallback to DuckDuckGo on failure;
- Title, HTTP(S) URL, and a short snippet;
- Limits on query, result count, timeout, response body, and redirects;
- Native DSH provider registration, selection, rollback, and lifecycle cleanup;
- An "enable search takeover" switch in the Desktop plugin settings.

The plugin does not provide or modify:

- A `web_fetch` provider or page-content fetching;
- A third search engine, custom endpoints, proxies, cookies, or request headers;
- API keys, credential reads, file I/O, subprocesses, browsers, or HTTP servers;
- Custom agent tools, global prompts, telemetry, auto-update, or caching.

`web_search` only returns candidate pages. Whether the current profile's `web_fetch` is available is decided by DSH's existing fetch provider, and an agent may use PowerShell under its existing terminal permissions; none of that is provided by this plugin.

## Why no DeepSeek API key is needed

The plugin queries Bing's or DuckDuckGo's public HTML search entry points directly and never calls the DeepSeek Search API. Free does not mean local or private: the query text, market, safe-search parameters, and a generic plugin User-Agent are sent to the search engine actually used. The plugin sends no cookies, DSH session data, workspace paths, or local credentials.

## Installation

### GitHub URL (recommended)

From the default branch:

```powershell
dsh plugin --profile desktop add "https://github.com/Flaaax/dsh-freesearch-plugin.git"
```

From a specific release (tag):

```powershell
dsh plugin --profile desktop add "https://github.com/Flaaax/dsh-freesearch-plugin.git#v0.1.0"
```

### Local directory

After cloning the repository locally, install it from the local directory path. Use an isolated profile for development and integration verification:

```powershell
dsh plugin --profile plugin-dev add "<path-to-local-repository>"
```

After installing a Desktop plugin, you must fully quit and restart DeepSeek Harness; reloading the page is not enough.

## Configuration

In Desktop, open "Plugins", find the `dsh-minimal-free-search-plugin` package, expand the `web-search-minimal-free` row, and click through to its settings. The form is provided by the plugin's client face (`src/client/settings-card.jsx`, built into `lib/client.js`), and its fields come from the native DSH `Config` schema.

| Field | Default | Limits | Meaning |
|---|---|---|---|
| `takeover` | `true` | boolean | Enable or roll back this plugin's search-provider takeover |
| `preferredEngine` | `bing` | `bing` / `duckduckgo` | Preferred search engine |
| `fallback` | `true` | boolean | Whether to try the other fixed engine when the preferred one fails |
| `market` | `zh-CN` | `zh-CN` / `en-US` | Market and request language |
| `safeSearch` | `moderate` | `off` / `moderate` / `strict` | Safe-search filtering level |
| `timeoutMs` | `10000` | 1000–20000 | Total per-engine request timeout, in milliseconds |
| `maxResults` | `5` | 1–10 | Maximum results returned per query |

Settings are saved through DSH's official configuration mechanism. The plugin provides no arbitrary fallback chain and never queries two engines concurrently.

## Provider takeover rules

Once loaded, the plugin registers `minimal-free-search`:

- If the current search provider is unset or still the official default `deepseek-official`: switch to this plugin;
- If it is `deepseek-search-api` or another third-party provider: do not take over;
- When `takeover` is turned off and saved: restore `deepseek-official` only if the current provider still points to this plugin;
- On plugin dispose: attempt the same conditional restore, but do not treat process exit order as an uninstall guarantee;
- `fetchProvider` is never changed.

The Desktop "enable the new Web Search API" switch is not a generic provider selector; it toggles the official search/fetch providers together. To uninstall this plugin, use the `takeover` switch in the plugin's own settings.

## Verification

List the plugin entry:

```powershell
dsh plugin --profile plugin-dev list --depth 0
```

Check that the profile composes successfully:

```powershell
dsh --profile plugin-dev --dump-config
```

Real verification must go through the official `web_search` tool path and confirm that the log contains the provider takeover and the engine actually used. Merely mentioning `web_search` in text does not count as integration verification. See [docs/verification.md](docs/verification.md).

## Safe disable and uninstall

### Recommended Desktop flow

1. Open the `web-search-minimal-free` entry in "Plugins".
2. Turn off `takeover` ("enable search takeover") and save.
3. Confirm the search provider has been restored; fully quit Desktop.
4. Then uninstall:

```powershell
dsh plugin --profile desktop remove dsh-minimal-free-search-plugin
```

The plugin also attempts restore on normal shutdown, but DSH's service stop order does not guarantee the durable write succeeds. The reliable flow is to turn off `takeover` in a running Desktop, confirm restore, then uninstall. Do not delete the plugin's files offline while it is still taking over.

### Recommended plugin-dev flow

Turn off `takeover` through the plugin settings, start the profile once and confirm the official provider is restored, then run:

```powershell
dsh plugin --profile plugin-dev remove dsh-minimal-free-search-plugin
```

### Recovery after accidental uninstall

If the plugin has been deleted while the profile still contains `searchProvider: minimal-free-search`, `web_search` reports the provider as unregistered. The preferred recovery is:

1. Reinstall the same plugin version;
2. Start Desktop, turn off `takeover` in the plugin settings, and save;
3. Fully quit Desktop;
4. Uninstall the plugin again.

If reinstallation is impossible, fully quit Desktop, back up the profile's `cordis.patch.yml`, and change only the following line in the `web` entry:

```yaml
searchProvider: minimal-free-search
```

to:

```yaml
searchProvider: deepseek-official
```

Keep the `fetchProvider` and all other fields in the same `web` entry, and do not remove other plugins or profile content. The Desktop file is usually at:

```text
C:\Users\<user>\.dsh\profiles\desktop\cordis.patch.yml
```

Then restart Desktop fully. You can also open the built-in "Web Search" settings and switch to the official mode, but that switch also changes the fetch provider and is not the preferred recovery path.

## Known limitations

- Bing's and DuckDuckGo's HTML pages are not stable APIs; they may rate-limit, show anti-bot pages, or change structure.
- The plugin does not fetch search-result content; snippets may be incomplete or stale.
- Each engine is queried at most once; fallback sends the same query to the second engine.
- After an abnormal crash followed by offline uninstall, the provider selection may not be restored in time; follow the recovery flow above.
- The first version provides no custom endpoints or SearXNG; see [docs/roadmap.md](docs/roadmap.md) for candidates.

## Development

```powershell
npm install --ignore-scripts
npm test
$env:DSH_MINIMAL_SEARCH_LIVE='1'
npm run test:live
$env:DSH_MINIMAL_SEARCH_HOST_LIVE='1'
npm run test:host-live
```

By default, tests use fixtures and a controlled fake transport. `test:live` verifies the network provider directly; `test:host-live` uses the official DSH Host, Web service, and the official `web_search` tool path. Both search only for the fixed term `DeepSeek Harness` and never open result pages.

## License and sources

This project is licensed under the MIT License. The interfaces follow the DSH `0.2.1-rc.3` official source; some HTML parsing approaches are adapted from the MIT-licensed `dsh-free-search v0.9.16`, whose MIT notice is retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). See [docs/references.md](docs/references.md) for details.
