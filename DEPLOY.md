# Deploying the Ekster reader (reader.p83.nl)

`reader.p83.nl` serves `ghcr.io/pstuifzand/ekstereye:master` as one nginx container on the
p83.nl box, behind the host's `jwilder/nginx-proxy`. The deployment is a compose file owned by
`publog`; there is no `docker run` step any more and no compose file under `/root`.

Two halves, every time: publish the image, then recreate the container. The container never
pulls by itself — pushing code changes nothing on the site until step 3 runs.

**Step 3 needs a person present.** Reaching the host requires unlocking 1Password and approving
the SSH key, and that approval is the gate, not an obstacle to route around. Publish whenever you
like; deploy only while the approval can actually happen. When it cannot, stop after step 2, say
which image and revision are ready, and leave the old container running. See "Deploy gate" below.

## Deployed layout

```
repo                    deploy/docker-compose.yml   <- source of truth, edit here
host (publog@p83.nl)    /home/publog/reader         <- installed copy, compose project "reader"
container               reader_web_1
```

The service is named `web`, which becomes the network alias `web` on `nginxproxy_default`, so
routing is `VIRTUAL_HOST=reader.p83.nl` → `web:80`. Nothing binds a host port: the container is
not reachable over plain HTTP on the host IP, and the proxy is the only way in.

## 1. Publish the image

`master` is the build trigger. A push runs two workflows:

- `CI` — `npm ci`, `npm run lint`, `npm run test`, `npm run build`
- `Docker` — builds and pushes `:master`, `:latest` and `:sha-<short>`

```sh
git status --short          # must be empty
npm run lint                # a build alone does not catch a missing import
git push origin master
gh run list --branch master --limit 2
gh run watch <docker-run-id> --exit-status
```

The two workflows are independent: a green *Docker* run can still come from a commit whose CI
run failed. Check both before deploying, and remember the image is what GitHub built, not what
is in your working tree.

Pushing needs the 1Password SSH agent, since `commit.gpgsign` is on with `gpg.format=ssh`:

```sh
export SSH_AUTH_SOCK="$HOME/.1password/agent.sock"
ssh-add -T ~/.ssh/id_rsa_kiwi.pub   # exit 0
```

`communication with agent failed` or `agent refused operation` means 1Password is locked, not
that the key is wrong. Fallback push over HTTPS with the `gh` token, without touching the remote
config:

```sh
git push "https://x-access-token:$(gh auth token)@github.com/pstuifzand/ekstereye.git" master
```

## 2. Check the artifact before deploying it

Trust the image, not the checkmark.

```sh
gh auth token | docker login ghcr.io -u pstuifzand --password-stdin
docker pull ghcr.io/pstuifzand/ekstereye:master
docker rm -f ekstereye_verify 2>/dev/null
docker run -d --name ekstereye_verify -p 8098:80 ghcr.io/pstuifzand/ekstereye:master
curl -s http://127.0.0.1:8098/ | grep -o 'assets/index-[^"]*'
docker inspect ekstereye_verify --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
docker rm -f ekstereye_verify
```

The asset hash must equal `dist/index.html` from a build of the commit you pushed, and the
revision label must be that commit. Rebuild right before comparing: a `dist` from before the last
edit disagrees with a perfectly good image.

## Deploy gate

Deploying stops unless someone is at the keyboard to approve the SSH key. That is deliberate:
the key lives in 1Password, the approval is interactive, and nobody is on call to press it.

- Approve-and-proceed is the only path. When the connection can't be made — `signing failed …
  communication with agent failed`, `agent refused operation`, a prompt that times out, or a
  master that won't open — the run is over. Report the published image tag, digest and OCI
  revision that are ready to go, and stop. Do not come back later and retry on your own; the next
  deploy happens when a person is there for it.
- Do not substitute another route in: no third-party SSH keys, no copying credentials anywhere,
  no `docker` over anything except this SSH connection, no asking for a password in chat, no
  leaving a deploy half-finished.
- Nothing destructive happens before the gate. Steps 1 and 2 are safe on their own — pushing and
  inspecting a published image changes nothing on the site — while step 3, step 4
  ("verify from outside") and the rollback tag all need the host. There is no explicit
  `docker rm` in this flow: `up -d web` replaces the container in one step, which is exactly why a
  run that stops at the gate leaves the site untouched.

## 3. Recreate the container

The host is `p83.nl`. Log in as **`publog`**, who is in the `docker` group. There is no working
key for `root` or for `peter` — both answer `Permission denied (publickey)` — and `peter` is not
in the `docker` group either (`getent group docker` lists `publog` but not `peter`), so be
explicit about the account:

```sh
ssh -M -S /tmp/p83.sock -fN -i "$HOME/.ssh/SSH Key.pub" -o IdentitiesOnly=yes publog@p83.nl
```

Without `IdentitiesOnly=yes` the agent offers all nine of its keys until the server answers
`Too many authentication failures`; the host's fail2ban also dislikes connection bursts, which is
why one master connection is reused for the rest of the session. Add
`-o ControlPersist=8h` if you want the master to outlive a shell.

The connection itself needs 1Password unlocked: with the agent locked, that command fails with
`signing failed ... communication with agent failed` (or hangs on a prompt that never appears),
and `-i` naming a `.pub` file does not help — the signature always comes from the agent. Check a
live master with `ssh -S /tmp/p83.sock -O check publog@p83.nl` rather than reconnecting. If it
won't come up, this is where the deploy ends — report and stop, per the deploy gate above.

Install the compose file if it changed, then pull and recreate only `web`:

```sh
scp -o ControlPath=/tmp/p83.sock deploy/docker-compose.yml \
  publog@p83.nl:/home/publog/reader/docker-compose.yml

ssh -S /tmp/p83.sock publog@p83.nl 'set -e
cd /home/publog/reader
docker-compose config >/dev/null
docker-compose pull web
docker-compose up -d web'
```

`scp` must ride the master connection (`-o ControlPath`) or have the 1Password agent unlocked;
on its own it fails with `Load key ...: invalid format` plus `Permission denied`, because `-i`
only names a `.pub` file and the actual signature comes from the agent.

The host has `docker-compose` 1.28.5 (v1), not the `docker compose` v2 plugin — use the hyphenated
command. Keep the compose file at `version: "3.7"` while that is true: v1 needs a version key
before it accepts an `external: name:` network.

`up -d` recreates the container only when the config or the image changed. Compose 1.28.5 says
`reader_web_1 is up-to-date` when nothing was replaced.

Pulling needs a ghcr credential on the host; `publog`'s `~/.docker/config.json` already has a
`ghcr.io` entry, so no login is part of the deploy. `pull access denied` means that credential
expired: `gh auth token | ssh -S /tmp/p83.sock publog@p83.nl 'docker login ghcr.io -u pstuifzand
--password-stdin'`.

nginx-proxy watches Docker events, so a recreated container is routed immediately — there is no
proxy reload step.

The repo file and the host file should be identical after this. They currently differ only in the
comment header (the host copy predates the repo file), so the first `scp` is a comment refresh;
check with
`diff <(git show HEAD:deploy/docker-compose.yml) <(ssh -S /tmp/p83.sock publog@p83.nl 'cat /home/publog/reader/docker-compose.yml')`.

## 4. Verify from outside

```sh
ssh -S /tmp/p83.sock publog@p83.nl 'docker inspect reader_web_1 \
  --format "status={{.State.Status}} health={{.State.Health.Status}} restart={{.HostConfig.RestartPolicy.Name}} rev={{index .Config.Labels \"org.opencontainers.image.revision\"}}"'

curl -s https://reader.p83.nl/ | grep -o 'assets/index-[^"]*'
curl -s -o /dev/null -w '%{http_code}\n' https://reader.p83.nl/channel/home
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://reader.p83.nl/favicon.svg
```

Expect `status=running`, `health=healthy`, `restart=unless-stopped`, the revision you pushed, and
the asset hash from your local `dist/index.html`. Anything else means the old container is still
up. A health status of `starting` for the first ~10 seconds is normal; `unhealthy` is not.

For a visual change, finish in a browser:

```sh
chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1280,900 \
  --user-data-dir=$TMPDIR/ek-shot --screenshot=$TMPDIR/ek-live.png https://reader.p83.nl/
```

and look at the PNG. `pkill -f` on a debugging flag kills the calling shell when the pattern
appears in that same command line — kill by pid instead.

## Rollback

Tag the running image before pulling, because the tag is about to move:

```sh
ssh -S /tmp/p83.sock publog@p83.nl 'set -e
cd /home/publog/reader
rev=$(docker inspect reader_web_1 --format "{{index .Config.Labels \"org.opencontainers.image.revision\"}}" | cut -c1-7)
docker tag "$(docker inspect reader_web_1 --format "{{.Image}}")" "rollback-$rev"'
```

To roll back, point `web` at that tag instead of `:master` (edit `image:` in the compose file,
`up -d web`), verify the revision label again, then restore the file. Compose only pulls when the
image is missing, so a locally tagged image is used as-is — no registry round trip. Tag before
`pull`: tagging `ghcr.io/pstuifzand/ekstereye:master` after a pull tags the *new* image and
silently destroys the rollback path.

Three exited containers named `reader_web_rollback_<sha>` are left from the older `docker run`
deploy; the tag above is the rollback path now, so those can be pruned with
`docker rm reader_web_rollback_*` whenever it is convenient.

## Configuration notes

- `docker/nginx.conf` and `docker/security-headers.conf` ship inside the image, so header,
  compression or cache changes are a build-and-deploy change. `docker cp`-ing a config into the
  running container is not a deploy.
- The client id is the origin the app is served from, so a localhost checkout signs in to
  IndieAuth as itself; `VITE_CLIENT_ID` overrides it at build time.
- The frontend is static and holds no state; a recreate drops nothing. Feed and read state lives
  in the Ekster server.
- `/root/reader` is the old deployment path and is no longer used. It still holds 2018–2020
  leftovers (`apache/`, `data/`, `index.js`) that the image ignores, and only root can remove it.
- The image tag is mutable. Which build is live is proven by the OCI revision label, never by the
  tag or the image ID. Moving the deployment into the repo was WEB-24; pinning the service to a
  digest instead of `:master` is still open, so until then the revision label is the only honest
  answer to "what is live".
