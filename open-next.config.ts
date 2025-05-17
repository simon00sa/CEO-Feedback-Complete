
// Comment out the problematic import
// import cache from "@opennextjs/cloudflare/kvCache";

const config = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      // Change the incrementalCache to not use the missing module
      // incrementalCache: async () => cache,
      incrementalCache: "dummy", // Using "dummy" as a fallback
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
    },
  },
  dangerous: {
    enableCacheInterception: false,
  },
};

export default config;
