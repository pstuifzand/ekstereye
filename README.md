# ekstereye

A Microsub reader for the [Ekster][ekster] server, served at
[reader.p83.nl](https://reader.p83.nl/). The client id is whatever origin it is
served from, so a checkout running on localhost can sign in to an IndieAuth
server without pretending to be reader.p83.nl. Set `VITE_CLIENT_ID` to override
it.

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run dev
```

### Compiles and minifies for production
```
npm run build
```

### Serves the production build
```
npm run preview
```

### Runs the tests
```
npm run test
```

### Lints the sources
```
npm run lint
```

### Runs the published image locally
```
docker run --rm -p 8080:80 ghcr.io/pstuifzand/ekstereye:master
```

## Deploying

`reader.p83.nl` runs the published image behind the host's nginx proxy, from
[`deploy/docker-compose.yml`](deploy/docker-compose.yml). See
[DEPLOY.md](DEPLOY.md) for the publish → verify → recreate steps, rollback, and
the reasoning behind the compose settings. Pushing to `master` builds the image;
it does not deploy it.

[ekster]: https://github.com/pstuifzand/ekster
