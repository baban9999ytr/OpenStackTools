const ADSENSE_TOKEN = '__ADSENSE_PUBLISHER_ID__';
const ADSENSE_AUTH_TOKEN = '__ADSENSE_AUTH_LINE__';
const ADSENSE_CERTIFICATION_ID = 'f08c47fec0942fa0';

function adsenseClient(env) {
  const client = env.OST_ADSENSE_CLIENT;
  return typeof client === 'string' && /^ca-pub-\d+$/.test(client) ? client : '';
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (response.status !== 200) {
      return response;
    }

    const isJavaScript = /javascript|ecmascript/i.test(contentType);
    const isPlainText = /^text\/plain(?:;|$)/i.test(contentType);
    if (!isJavaScript && !isPlainText) {
      return response;
    }

    const source = await response.text();
    const token = isJavaScript ? ADSENSE_TOKEN : ADSENSE_AUTH_TOKEN;
    if (!source.includes(token)) return response;

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('content-md5');
    headers.delete('etag');
    headers.set('cache-control', 'no-cache');

    const client = adsenseClient(env);
    const configuredValue = isJavaScript
      ? client
      : client
        ? `google.com, pub-${client.slice('ca-pub-'.length)}, DIRECT, ${ADSENSE_CERTIFICATION_ID}`
        : '';
    return new Response(source.replaceAll(token, configuredValue), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
