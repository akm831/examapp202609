package jp.examapp.offline;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.WebView;
import org.json.JSONObject;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Exercises the real Android WebView/confirmation/SQLite path without third-party test libraries. */
public class ImportInstrumentation extends Instrumentation {
    private WebView web;
    private final String csv = "answeredAt,sourceItemKey,isCorrect,wasUnsure,responseMs\n"
        + "2026-09-29T08:35:11.442Z,local-government-law:標準問題1:1,true,false,100\n";
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }
    @Override public void onStart() {
        Bundle output = new Bundle();
        try {
            Activity activity = startActivitySync(new Intent(getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            runOnMainSync(() -> web = findWeb(activity.getWindow().getDecorView()));
            if (web == null) throw new AssertionError("WebView missing");
            boolean ready = false;
            for(int i=0;i<100;i++) {
                Thread.sleep(300);
                if("true".equals(js("Boolean(window.receiveImport && document.getElementById('app').textContent.includes('スマホだけで'))"))) { ready=true; break; }
            }
            if(!ready)throw new AssertionError("App did not load: "+js("document.body.innerText"));
            receive(); click("キャンセル"); Thread.sleep(500);
            if(attemptCount()!=0)throw new AssertionError("Cancel changed history");
            receive(); click("実行");
            for(int i=0;i<100&&attemptCount()!=1;i++)Thread.sleep(100);
            if(attemptCount()!=1)throw new AssertionError("Confirm did not save history");
            receive(); click("実行"); Thread.sleep(500);
            if(attemptCount()!=1)throw new AssertionError("Duplicate was counted twice");
            output.putString("stream", "\nCSV_IMPORT_TEST_OK: cancel, confirm, SQLite save and duplicate import verified\n");
            finish(Activity.RESULT_OK, output);
        } catch(Throwable error) {
            output.putString("stream", "\nCSV_IMPORT_TEST_FAILED: "+error+"\n");
            finish(Activity.RESULT_CANCELED, output);
        }
    }
    private WebView findWeb(View v) { if(v instanceof WebView)return (WebView)v; if(v instanceof ViewGroup) { ViewGroup g=(ViewGroup)v; for(int i=0;i<g.getChildCount();i++){WebView w=findWeb(g.getChildAt(i));if(w!=null)return w;} }return null; }
    private void receive() { runOnMainSync(() -> web.evaluateJavascript("window.receiveImport("+JSONObject.quote(csv)+")",null)); }
    private String js(String code) throws Exception {
        ArrayBlockingQueue<String> result = new ArrayBlockingQueue<>(1);
        runOnMainSync(() -> web.evaluateJavascript(code, value -> result.offer(value)));
        return result.poll(2, TimeUnit.SECONDS);
    }
    private void click(String text) throws Exception {
        for(int i=0;i<100;i++) {
            AccessibilityNodeInfo root=getUiAutomation().getRootInActiveWindow();
            if(root!=null)for(AccessibilityNodeInfo node:root.findAccessibilityNodeInfosByText(text))if(node.isClickable()&&node.performAction(AccessibilityNodeInfo.ACTION_CLICK))return;
            Thread.sleep(100);
        }
        throw new AssertionError("Confirmation button missing: "+text);
    }
    private int attemptCount() {
        try(SQLiteDatabase db=getTargetContext().openOrCreateDatabase("exam.db",0,null);Cursor c=db.rawQuery("SELECT json FROM state WHERE id=1",null)) {
            return c.moveToFirst()?new JSONObject(c.getString(0)).getJSONArray("attempts").length():0;
        } catch(Exception error) { throw new AssertionError(error); }
    }
}
