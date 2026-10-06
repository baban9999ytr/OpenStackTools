const ADSENSE_TOKEN = '__ADSENSE_PUBLISHER_ID__';
const ADSENSE_AUTH_TOKEN = '__ADSENSE_AUTH_LINE__';
const ADSENSE_CERTIFICATION_ID = 'f08c47fec0942fa0';

function adsenseClient(env) {
  const client = env.OST_ADSENSE_CLIENT;
  return typeof client === 'string' && /^ca-pub-\d+$/.test(client)
    ? client
    : '';
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);

    if (response.status !== 200) {
      return response;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJavaScript = /javascript|ecmascript/i.test(contentType);
    const isPlainText = /^text\/plain(?:;|$)/i.test(contentType);

    // Only transform JS files and ads.txt-style plain-text files.
    if (!isJavaScript && !isPlainText) {
      return response;
    }

    const source = await response.text();
    const token = isJavaScript ? ADSENSE_TOKEN : ADSENSE_AUTH_TOKEN;

    if (!source.includes(token)) {
      return response;
    }

    const client = adsenseClient(env);

    const replacement = isJavaScript
      ? client
      : client
        ? `google.com, pub-${client.slice('ca-pub-'.length)}, DIRECT, ${ADSENSE_CERTIFICATION_ID}`
        : '';

    const transformed = source.replaceAll(token, replacement);

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('content-md5');
    headers.delete('etag');
    headers.set('cache-control', 'no-cache');

    return new Response(transformed, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};