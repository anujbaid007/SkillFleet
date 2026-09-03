import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/*
  Almost every page reads the auth cookie and renders per request, so there is
  nothing to cache for them. The handful of marketing pages are prerendered at
  build time and served straight from the static-assets store. That store is
  read-only, so revalidatePath() on one of those pages takes effect at the next
  deploy rather than immediately. This is intentional: it avoids running an R2
  bucket and a D1 tag table for content that only changes with a deploy.
*/
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
