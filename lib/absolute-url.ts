/**
 * Builds a redirect target from the request's actual Host header rather than
 * `request.url`'s parsed origin. Needed because `next dev -H 0.0.0.0` can
 * report the request origin as the literal bind address (0.0.0.0) instead of
 * the host the client actually sent, which produces unreachable redirects.
 * Falls back to `request.url`'s own origin if the Host header is absent.
 */
export const absoluteUrl = (request: Request, path: string) => {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}${path}`;
};
