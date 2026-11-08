# ekstereye

A Microsub reader for the [Ekster][ekster] server. The client id is whatever
origin it is served from, so a checkout running on localhost can sign in to an
IndieAuth server without pretending to be reader.p83.nl. Set `VITE_CLIENT_ID` to
override it.

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

### Runs the published image
```
docker run --rm -p 8080:80 ghcr.io/pstuifzand/ekstereye:master
```

### Lints the sources
```
npm run lint
```

[ekster]: https://github.com/pstuifzand/ekster
