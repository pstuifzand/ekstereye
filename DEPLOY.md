# Deploying the Ekster reader (reader.p83.nl)

The reader is static files. There is no image and no container any more: a push to
`master` builds the bundle and publishes it as a release asset, and the host serves the
extracted `dist/` from Caddy. This file replaced the compose/ghcr flow, which is retired.

## Deployed layout

```
repo                     .github/workflows/build.yml   <- publish
git.p83.nl/peter/ekstereye    origin: Actions run here, releases land here
host (root@p83-new)      /srv/reader/<sha>/dist         <- one directory per build
                         /srv/reader/current            <- symlink to the live build
                         /etc/caddy/sites.d/reader.p83.nl.caddy
                                                       <- root * /srv/reader/current/dist
host script              /srv/bin/state/deploy-reader.sh
```

`github.com/pstuifzand/ekstereye` is a mirror: **pushing there publishes nothing.** The
workflow's publish step talks to Gitea's `/api/v1` releases API, which does not exist on
GitHub, so a GitHub push produces a red run and no asset. Push `origin`.

## 1. Publish

```sh
git status --short          # must be empty
npm run lint
npm test
git push origin master
```

The build workflow runs `npm ci`, `lint`, `test`, `build` inside `node:22-alpine`, tars
`dist`, and publishes `dist.tar.gz` + `SHA256SUMS` to the release `build-<sha7>`. Wait for
both assets before going further:

```sh
sha=$(git rev-parse --short=7 HEAD)
curl -s -H "Authorization: token $(sudo cat /etc/reader/deploy-token)" \
  "https://git.p83.nl/api/v1/repos/peter/ekstereye/releases/tags/build-$sha" |
  jq -r '.assets[].name'
```

Signing needs the 1Password SSH agent (`commit.gpgsign` is on with `gpg.format=ssh`):

```sh
export SSH_AUTH_SOCK="$HOME/.1password/agent.sock"
ssh-add -T ~/.ssh/id_rsa_kiwi.pub   # exit 0
```

`communication with agent failed` or `agent refused operation` means 1Password is locked,
not that the key is wrong.

## 2. Check the artifact, not the checkmark

A green build is not a bundle. Rebuild right before comparing, because a `dist` from before
the last edit disagrees with a correct deploy:

```sh
npm run build
grep -o 'assets/index-[^"]*' dist/index.html
curl -sL https://git.p83.nl/peter/ekstereye/releases/download/build-<sha>/dist.tar.gz |
  tar -xzO dist/index.html | grep -o 'assets/index-[^"]*'
```

The two hashes must match.

## 3. Deploy

```sh
ssh root@p83-new 'sudo /srv/bin/state/deploy-reader.sh <sha>'
```

The script downloads both assets with the deploy token, verifies `SHA256SUMS`, extracts into
`/srv/reader/<sha>/`, swaps the `current` symlink, then `caddy validate` and
`systemctl reload caddy`. Static files mean there is nothing to restart; the reload is the
whole switch.

## 4. Verify from outside

```sh
ssh root@p83-new 'readlink -f /srv/reader/current'
curl -s https://reader.p83.nl/ | grep -o 'assets/index-[^"]*'
curl -s -o /dev/null -w '%{http_code}\n' https://reader.p83.nl/
curl -s -o /dev/null -w '%{http_code}\n' https://reader.p83.nl/channel/home
curl -sSI https://reader.p83.nl/ | grep -i content-security-policy
```

The asset hash must equal the one in `dist/index.html`, and `/channel/home` must answer 200
(the History-mode fallback). Then finish in a browser: headless Chromium against the live
site with a fresh profile renders the login screen, and a CSP that breaks the app fails on
first paint — assert zero console and exception entries, not just a 200.

## Rollback

Every build stays on disk, so a rollback is the same script with the previous sha:

```sh
ssh root@p83-new 'ls /srv/reader/'
ssh root@p83-new 'sudo /srv/bin/state/deploy-reader.sh <previous-sha>'
```

## The bundle inside `ek`

`cmd/ek/reader/dist` in the ekster repo is a copy of this build, embedded so that `ek reader`
works with no network. Refresh it after a release and deploy it through ekster's own script:

```sh
npm run build
rsync -a --delete dist/ ~/work/ekster/cmd/ek/reader/dist/
# then commit the dist, push ekster's dev, deploy build-<ekster sha>
```

## Deploy gate

Reaching the host is the gate: `root@p83-new` needs a key that has to be present, and a
host-key change is a decision for a person, not a prompt to click through. Publish whenever
you like — steps 1 and 2 change nothing on the site. If step 3 cannot run, report the
release tag that is ready and stop; do not route around it.

## Configuration notes

- Headers, caching and compression live in `/etc/caddy/sites.d/reader.p83.nl.caddy` on the
  host, so a change there is a host change, not a build. Vite fingerprints the assets, which
  is why `/assets/*` is cached for a year and `index.html` is not.
- The client id is the origin the app is served from, so a localhost checkout signs in to
  IndieAuth as itself; `VITE_CLIENT_ID` overrides it at build time.
- The frontend holds no state; feed and read state lives in the Ekster server, so swapping
  builds drops nothing.
- Which build is live is answered by `/srv/reader/current` and the asset hash, never by a
  tag or a timestamp.
