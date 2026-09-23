# Calapres design service. Runtime has zero npm dependencies (Node built-ins only).
# Build context: services/design. Not built in the authoring workspace (no registry access there);
# pin the base image by digest when building on the host: docker pull node:24.21.0-bookworm-slim.
FROM node:24.21.0-bookworm-slim
ENV NODE_ENV=production DATA_DIR=/data PORT=8787 HOST=0.0.0.0
WORKDIR /app
COPY package.json app.mjs config.mjs cost.mjs ledger.mjs png.mjs provider.mjs screen.mjs security.mjs server.mjs store.mjs verify.mjs verify-order.mjs worker.mjs maintenance.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["node", "server.mjs"]
