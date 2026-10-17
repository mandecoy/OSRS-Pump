package com.mandecoy.osrspump;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Offline-capable local UI for OSRS Pump. No hosted application backend.
 * All Wiki data requests pass through a native same-origin API bridge with an
 * identifiable User-Agent, a short TTL cache, and stale-data fallback.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String APP_URL = "https://" + HOST + "/assets/index.html";
    private static final String WIKI_API = "https://prices.runescape.wiki/api/v1/osrs/";
    private static final int OPEN_FILE = 201;
    private static final int SAVE_FILE = 202;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingBackup;

    private static final class CacheEntry {
        final byte[] body;
        final long expiresAt;
        CacheEntry(byte[] body, long expiresAt) {
            this.body = body;
            this.expiresAt = expiresAt;
        }
    }

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setUserAgentString(settings.getUserAgentString() + " OSRSPumpNative/0.2");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equalsIgnoreCase(uri.getScheme()) || !HOST.equalsIgnoreCase(uri.getHost())) {
                    return null;
                }
                String path = uri.getPath();
                if (path == null) return failure(404, "Not Found", "Unknown local path");
                if (path.startsWith("/api/")) return proxyWiki(uri);
                if (path.startsWith("/assets/")) return localAsset(path.substring(8));
                return failure(404, "Not Found", "Unknown local path");
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && HOST.equalsIgnoreCase(uri.getHost())) return false;
                if ("https".equalsIgnoreCase(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (ActivityNotFoundException ignored) { }
                }
                // Never load third-party pages into a WebView with a JavaScript bridge.
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent chooser = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                chooser.addCategory(Intent.CATEGORY_OPENABLE);
                chooser.setType("application/json");
                try {
                    startActivityForResult(chooser, OPEN_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        });
        web.addJavascriptInterface(new BackupBridge(), "OSRSPumpAndroid");
        web.loadUrl(APP_URL);
    }

    private WebResourceResponse localAsset(String name) {
        String mime;
        switch (name) {
            case "index.html": mime = "text/html"; break;
            case "flip-scanner.js":
            case "dashboard.js":
            case "processing.js":
            case "market-intel.js":
            case "history-chart.js":
            case "v03.js":
            case "app.js":
            case "logic.js": mime = "text/javascript"; break;
            case "v03.css":
            case "styles.css": mime = "text/css"; break;
            case "icons/pump.svg": mime = "image/svg+xml"; break;
            case "manifest.webmanifest": mime = "application/manifest+json"; break;
            default: return failure(404, "Not Found", "Asset not packaged");
        }
        try {
            InputStream stream = getAssets().open("web/" + name);
            return new WebResourceResponse(mime, "UTF-8", stream);
        } catch (Exception e) {
            return failure(404, "Not Found", "Asset missing");
        }
    }

    private WebResourceResponse proxyWiki(Uri uri) {
        String path = uri.getPath();
        String endpoint;
        long ttl;
        switch (path) {
            case "/api/mapping": endpoint = "mapping"; ttl = 86_400_000L; break;
            case "/api/latest": endpoint = "latest"; ttl = 60_000L; break;
            case "/api/1h": endpoint = "1h"; ttl = 120_000L; break;
            case "/api/5m": endpoint = "5m"; ttl = 60_000L; break;
            case "/api/24h": endpoint = "24h"; ttl = 1_800_000L; break;
            case "/api/timeseries":
                String id = uri.getQueryParameter("id");
                String step = uri.getQueryParameter("step");
                if (step == null || step.isEmpty()) step = "1h";
                if (id == null || !id.matches("[0-9]{1,8}") ||
                    !(step.equals("5m") || step.equals("1h") || step.equals("6h") || step.equals("24h"))) {
                    return failure(400, "Bad Request", "Invalid history request");
                }
                endpoint = "timeseries?id=" + id + "&timestep=" + step;
                ttl = 180_000L;
                break;
            default: return failure(400, "Bad Request", "Unknown API endpoint");
        }
        final String url = WIKI_API + endpoint;
        CacheEntry old = cache.get(url);
        long now = System.currentTimeMillis();
        if (old != null && old.expiresAt > now) return json(old.body, 200, "OK");
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(12000);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent",
                "OSRS-Pump-Android/0.2 (https://github.com/mandecoy/OSRS-Pump; GitHub issues)");
            int code = connection.getResponseCode();
            if (code < 200 || code >= 300) throw new Exception("Wiki returned " + code);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (InputStream in = connection.getInputStream()) {
                byte[] buffer = new byte[16384];
                int size, total = 0;
                while ((size = in.read(buffer)) != -1) {
                    total += size;
                    if (total > 8 * 1024 * 1024) throw new Exception("Response too large");
                    output.write(buffer, 0, size);
                }
            }
            byte[] body = output.toByteArray();
            // Prevent unlimited memory use from individual item-history lookups.
            if (cache.size() > 70) cache.clear();
            cache.put(url, new CacheEntry(body, now + ttl));
            return json(body, 200, "OK");
        } catch (Exception e) {
            if (old != null) return json(old.body, 200, "OK");
            return failure(502, "Bad Gateway", "Could not retrieve Wiki prices; check your Internet connection");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private WebResourceResponse json(byte[] bytes, int status, String reason) {
        WebResourceResponse response = new WebResourceResponse(
            "application/json", "UTF-8", new ByteArrayInputStream(bytes));
        response.setStatusCodeAndReasonPhrase(status, reason);
        return response;
    }

    private WebResourceResponse failure(int code, String reason, String message) {
        // Fixed messages, never echo user input into JSON.
        return json(("{\"error\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8), code, reason);
    }

    public final class BackupBridge {
        @JavascriptInterface
        public void saveBackup(String json) {
            if (json == null || json.length() > 5_000_000) return;
            runOnUiThread(() -> {
                pendingBackup = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "osrs-pump-backup.json");
                try {
                    startActivityForResult(intent, SAVE_FILE);
                } catch (ActivityNotFoundException ignored) { pendingBackup = null; }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent result) {
        super.onActivityResult(requestCode, resultCode, result);
        if (requestCode == OPEN_FILE) {
            if (fileCallback != null) {
                Uri[] uris = resultCode == RESULT_OK && result != null && result.getData() != null
                    ? new Uri[]{result.getData()} : null;
                fileCallback.onReceiveValue(uris);
                fileCallback = null;
            }
        } else if (requestCode == SAVE_FILE) {
            if (resultCode == RESULT_OK && result != null && result.getData() != null && pendingBackup != null) {
                try (OutputStream out = getContentResolver().openOutputStream(result.getData())) {
                    if (out != null) out.write(pendingBackup.getBytes(StandardCharsets.UTF_8));
                } catch (Exception ignored) { }
            }
            pendingBackup = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        // OSRS Pump is an SPA: WebView.canGoBack() cannot see category/item navigation.
        web.evaluateJavascript(
            "(window.OSRSPumpNavigateBack && window.OSRSPumpNavigateBack()) ? true : false",
            handled -> {
                if ("true".equals(handled)) return;
                new android.app.AlertDialog.Builder(MainActivity.this)
                    .setTitle("Exit OSRS Pump?")
                    .setMessage("Return to your Android home screen?")
                    .setNegativeButton("Stay", (dialog, which) -> dialog.dismiss())
                    .setPositiveButton("Exit", (dialog, which) -> finish())
                    .show();
            }
        );
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
