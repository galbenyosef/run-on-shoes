import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { resolveAssetUrls } from '../Method/asset_paths.ts';

const output = fileURLToPath(new URL('../../dist/', import.meta.url));

// Use a plain static server without Vite middleware, SPA fallbacks, SSR or APIs.
void test('The same build serves HTML, JS, CSS, complete glTF buffers and runner at root and project paths', async () => {
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        const relative = path.replace(/^\/run-on-shoes\//, '/');
        const file = resolve(
          output,
          '.' + (relative.endsWith('/') ? relative + 'index.html' : relative),
        );
        assert.ok(file.startsWith(output));
        const mime: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.gltf': 'model/gltf+json',
          '.glb': 'model/gltf-binary',
          '.svg': 'image/svg+xml',
        };
        response.setHeader(
          'Content-Type',
          mime[extname(file)] ?? 'application/octet-stream',
        );
        response.end(await readFile(file));
      } catch {
        response.writeHead(404).end();
      }
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    for (const prefix of ['/', '/run-on-shoes/']) {
      const page: string = `http://127.0.0.1:${address.port}${prefix}`;
      const response: Response = await fetch(page);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /MICROSTRIDE/);
      const links = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(
        (match) => match[1],
      );
      assert.ok(links.some((link) => link.endsWith('.js')));
      assert.ok(links.some((link) => link.endsWith('.css')));
      const chunks = (await readdir(resolve(output, 'assets'))).map(
        (file) => './assets/' + file,
      );
      for (const link of new Set([...links, ...chunks])) {
        const url = new URL(link, page);
        assert.ok(url.pathname.startsWith(prefix));
        const resource = await fetch(url);
        assert.equal(resource.status, 200, url.href);
        if (link.endsWith('.js'))
          assert.match(resource.headers.get('content-type')!, /javascript/);
        await resource.arrayBuffer();
      }
      const urls = resolveAssetUrls('./');
      const shoeUrl = new URL(urls.shoe, page);
      const shoe = await fetch(shoeUrl);
      assert.equal(shoe.status, 200);
      const gltf = (await shoe.json()) as {
        buffers: {
          uri?: string;
          byteLength: number;
          extensions?: { EXT_meshopt_compression?: { fallback?: boolean } };
        }[];
        images: { bufferView?: number; uri?: string }[];
      };
      for (const buffer of gltf.buffers) {
        if (!buffer.uri) {
          assert.equal(
            buffer.extensions?.EXT_meshopt_compression?.fallback,
            true,
            'Only decoder-owned Meshopt fallback buffers may omit URLs',
          );
          continue;
        }
        const url = new URL(buffer.uri, shoeUrl);
        assert.ok(url.pathname.startsWith(prefix));
        const response = await fetch(url);
        assert.equal(response.status, 200, url.href);
        assert.equal(
          (await response.arrayBuffer()).byteLength,
          buffer.byteLength,
        );
      }
      assert.ok(
        gltf.images.every((image) => typeof image.bufferView === 'number'),
        'Textures are packaged in the verified buffers',
      );
      const runner = await fetch(new URL(urls.runner, page));
      assert.equal(runner.status, 200);
      const bytes = new Uint8Array(await runner.arrayBuffer());
      assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'glTF');
      assert.equal(
        bytes.byteLength,
        (await stat(resolve(output, 'models/runner.glb'))).size,
      );
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
