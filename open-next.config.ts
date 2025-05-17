// Comment out the problematic import
// import cache from "@opennextjs/cloudflare/kvCache";

const config = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: "dummy", // Use "dummy" instead of the async cache function
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
