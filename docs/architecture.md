# Architecture

arkham.build is a SPA app that, by default, stores data locally in an IndexedDB database. The SPA has several backend components that it uses to enrich functionality.

## API(s)

The Node.js backend (`./backend`) currently handles recommendations and deck guide lookups.

There is a separate, private Cloudflare Function backend that is being phased out. It currently still serves a few functions:

1. a cached proxy for public ArkhamDB endpoints.
2. a [token-mediating backend](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps#name-token-mediating-backend) for authenticated ArkhamDB endpoints.
3. a CRUD API for public _shares_.
4. a generator for opengraph previews.

## Cloudflare Pages functions

We leverage a few Cloudflare Pages functions for rewriting the HTML we serve to _some_ clients. Currently, this is used to inject OpenGraph tags for social media bots.
