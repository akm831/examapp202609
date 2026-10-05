package jp.examapp.offline;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int IMPORT = 100, EXPORT = 101;
    private static final String ORIGIN = "https://exam.local/";
    private WebView web;
    private SQLiteDatabase db;
    private String pendingExport;
    private final ExecutorService files = Executors.newSingleThreadExecutor();

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        db = openOrCreateDatabase("exam.db", MODE_PRIVATE, null);
        db.execSQL("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)");
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setBackgroundColor(0xfff6f4ec);
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        web = new WebView(this);
        container.addView(web, new LinearLayout.LayoutParams(-1,-1));
        setContentView(container);
        web.setBackgroundColor(0xfff6f4ec);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(false);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.getSettings().setSupportMultipleWindows(false);
        web.addJavascriptInterface(new Storage(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !req.getUrl().toString().equals(ORIGIN + "index.html");
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                if (!url.startsWith(ORIGIN)) return blocked();
                String path = url.substring(ORIGIN.length());
                if (!path.matches("(?:index\\.html|app\\.js|core\\.js|data\\.js|base\\.css|mobile\\.css)")) return blocked();
                try {
                    String type = path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : "text/html";
                    return new WebResourceResponse(type, "UTF-8", getAssets().open(path));
                } catch (Exception e) { return blocked(); }
            }
        });
        if (saved != null) pendingExport = saved.getString("pendingExport");
        web.loadUrl(ORIGIN + "index.html");
    }
    private WebResourceResponse blocked() { return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", null, new ByteArrayInputStream(new byte[0])); }
    private void notice(String msg) { runOnUiThread(() -> web.evaluateJavascript("window.nativeNotice("+JSONObject.quote(msg)+")",null)); }
    private class Storage {
        @JavascriptInterface public synchronized String readState() {
            try (Cursor c = db.rawQuery("SELECT json FROM state WHERE id=1", null)) { return c.moveToFirst() ? c.getString(0) : null; }
        }
        @JavascriptInterface public synchronized boolean saveState(String json) {
            try {
                if (json.length() > 20*1024*1024) return false;
                JSONObject parsed = new JSONObject(json);
                if (parsed.getInt("schemaVersion") != 1 || !parsed.has("attempts")) return false;
                ContentValues values = new ContentValues(); values.put("id",1); values.put("json",json);
                return db.insertWithOnConflict("state",null,values,SQLiteDatabase.CONFLICT_REPLACE) != -1;
            } catch(Exception e) { return false; }
        }
        @JavascriptInterface public void importFile() { runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType("*/*");
            try { startActivityForResult(intent,IMPORT); } catch(Exception e) { notice("ファイル選択を開けませんでした。"); }
        }); }
        @JavascriptInterface public void exportFile(String name, String type, String text) { runOnUiThread(() -> {
            if (pendingExport != null) { notice("前の書き出しが完了するまでお待ちください。"); return; }
            pendingExport = text;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType(type); intent.putExtra(Intent.EXTRA_TITLE,name);
            try { startActivityForResult(intent,EXPORT); } catch(Exception e) { pendingExport=null; notice("保存先の選択を開けませんでした。"); }
        }); }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if (result != RESULT_OK || data == null || data.getData() == null) { if(request==EXPORT)pendingExport=null; return; }
        Uri uri = data.getData();
        if(request==IMPORT) files.execute(() -> {
            try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                byte[] buffer=new byte[8192]; int n;
                while((n=in.read(buffer))!=-1) { if(out.size()+n>20*1024*1024)throw new Exception("too large"); out.write(buffer,0,n); }
                String text=out.toString(StandardCharsets.UTF_8.name());
                runOnUiThread(() -> web.evaluateJavascript("window.receiveImport("+JSONObject.quote(text)+")",null));
            } catch(Exception e) { notice("ファイルを読み込めませんでした。20MB以下のCSV・JSONを選んでください。"); }
        });
        if(request==EXPORT) { final String text=pendingExport; pendingExport=null; files.execute(() -> {
            if(text==null){notice("書き出しを再実行してください。");return;}
            try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")) { out.write(text.getBytes(StandardCharsets.UTF_8)); out.flush(); notice("バックアップを書き出しました。"); }
            catch(Exception e) { notice("書き出しに失敗しました。保存先・空き容量を確認してください。"); }
        }); }
    }
    @Override public void onBackPressed() { web.evaluateJavascript("window.handleBack ? window.handleBack() : false", result -> {
        if(!"true".equals(result))new AlertDialog.Builder(this).setMessage("アプリを終了しますか？履歴は保存されています。").setPositiveButton("終了",(d,w)->finish()).setNegativeButton("戻る",null).show();
    }); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); out.putString("pendingExport",pendingExport); }
    @Override protected void onDestroy() { files.shutdown(); web.removeJavascriptInterface("Android"); web.destroy(); db.close(); super.onDestroy(); }
}
