FROM node:22.21-trixie-slim@sha256:1ddaeddded05b2edeaf35fac720a18019e1044a6791509c8670c53c2308301bb

RUN mkdir --parents verification-v2/ts-pkgs/peer-client verification-v2/ts-pkgs/peer-lib
COPY .yarn /verification-v2/.yarn
COPY package.json yarn.lock .yarnrc.yml /verification-v2/
COPY ts-pkgs/peer-client/package.json /verification-v2/ts-pkgs/peer-client/
COPY ts-pkgs/peer-lib/package.json /verification-v2/ts-pkgs/peer-lib/
COPY ts-pkgs/tss-definitions/package.json /verification-v2/ts-pkgs/tss-definitions/
WORKDIR /verification-v2
RUN yarnpkg workspaces focus --all

COPY ts-pkgs/config/ ts-pkgs/config/
COPY ts-pkgs/peer-lib/tsconfig.json ts-pkgs/peer-lib/
COPY ts-pkgs/peer-lib/src ts-pkgs/peer-lib/src
COPY ts-pkgs/tss-definitions/tsconfig.json ts-pkgs/tss-definitions/
COPY ts-pkgs/tss-definitions/src ts-pkgs/tss-definitions/src
COPY ts-pkgs/peer-client/tsconfig.json ts-pkgs/peer-client/
COPY ts-pkgs/peer-client/src ts-pkgs/peer-client/src
WORKDIR /verification-v2/ts-pkgs/peer-client
RUN yarnpkg build

# When using AWS KMS, the guardian_pk secret is not required.
# AWS credentials should be assigned to the IAM role running the container.
# The client will then query ephemeral credentials and sign with those.
# When using a raw private key file, the mount should look like this:
# --volume "<src file>:/run/secrets/guardian_pk,ro"
# The cert is not really a secret, but it doesn't hurt to use this mount type.
# --volume "<src file>:/run/secrets/cert.pem,ro"
ENTRYPOINT [ \
  "node", \
  "--enable-source-maps", \
  "--require", "/verification-v2/.pnp.cjs", \
  "--loader", "/verification-v2/.pnp.loader.mjs", \
  "/verification-v2/ts-pkgs/peer-client/ts-build/src/cli.js", \
  "upload" \
]