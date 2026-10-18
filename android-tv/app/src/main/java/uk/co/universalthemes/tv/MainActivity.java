package uk.co.universalthemes.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.net.URI;

/** Experimental fullscreen Jellyfin web viewer for Android TV and Fire TV. */
public class MainActivity extends Activity {
    private static final String PREF = "server";
    private WebView web;
    private String server;
    private LinearLayout root;
    private final String dpadScript = "(function(){if(window.__utvDpad)return;window.__utvDpad=true;" +
            "document.addEventListener('keydown',function(e){if(!['ArrowLeft','ArrowRight'].includes(e.key))return;" +
            "let a=document.activeElement;if(a&&(['INPUT','TEXTAREA','SELECT'].includes(a.tagName)))return;" +
            "let rail=a&&a.closest&&a.closest('.rail');if(!rail){rail=document.querySelector('.rail')}" +
            "if(rail){rail.scrollBy({left:e.key==='ArrowRight'?420:-420,behavior:'smooth'});" +
            "if(a===document.body||!a){e.preventDefault();}}},false);" +
            "window.open=function(u){if(typeof u==='string'){location.href=u;}return window;};" +
            "})();";

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        server = getPreferences().getString("url", "");
        if (server.isEmpty()) showSettings(); else showViewer();
    }
    private SharedPreferences getPreferences(){return getSharedPreferences(PREF,Context.MODE_PRIVATE);}
    private TextView text(String value,int size){ TextView v=new TextView(this);v.setText(value);v.setTextColor(Color.WHITE);v.setTextSize(size);v.setPadding(0,12,0,12);return v; }
    private void showSettings() {
        if(web!=null){web.destroy();web=null;}
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER);root.setPadding(56,30,56,30);root.setBackgroundColor(Color.rgb(12,16,29));
        root.addView(text("Universal Themes TV",28));
        root.addView(text("Enter the Jellyfin server address reachable from this TV. Example: http://192.168.1.50:8096",17));
        EditText field=new EditText(this);field.setSingleLine(true);field.setText(server);field.setHint("http://192.168.1.50:8096");field.setTextColor(Color.WHITE);field.setHintTextColor(Color.LTGRAY);field.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);root.addView(field,new LinearLayout.LayoutParams(Math.min(getResources().getDisplayMetrics().widthPixels-112,850),ViewGroup.LayoutParams.WRAP_CONTENT));
        Button save=new Button(this);save.setText("Connect");root.addView(save);save.requestFocus();
        save.setOnClickListener(v->{String val=field.getText().toString().trim().replaceAll("/+$","");
            try{ URI uri=new URI(val);if(!(uri.getScheme().equals("http")||uri.getScheme().equals("https"))||uri.getHost()==null)throw new Exception();server=val;
                getPreferences().edit().putString("url",val).apply();showViewer();
            }catch(Exception ex){Toast.makeText(this,"Enter a valid http:// or https:// server URL",Toast.LENGTH_LONG).show();}
        });
        setContentView(root);
    }
    private String homepage(){return server+"/web/universal-themes/index.html";}
    private boolean allowed(String url){
        try {URI home=new URI(server);URI target=new URI(url);return home.getScheme().equalsIgnoreCase(target.getScheme()) && home.getHost().equalsIgnoreCase(target.getHost()) && home.getPort()==target.getPort();}
        catch(Exception e){return false;}
    }
    private void showViewer() {
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.BLACK);
        web=new WebView(this);web.setBackgroundColor(Color.BLACK);web.setFocusable(true);web.setFocusableInTouchMode(true);
        web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.getSettings().setSupportMultipleWindows(false);web.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(allowed(request.getUrl().toString()))return false;
                Toast.makeText(MainActivity.this,"External page blocked in test viewer",Toast.LENGTH_SHORT).show();return true;
            }
            @Override public void onPageFinished(WebView view,String url){
                if(allowed(url) && url.contains("/universal-themes/"))view.evaluateJavascript(dpadScript,null);
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest req,android.webkit.WebResourceError err){
                if(req.isForMainFrame())Toast.makeText(MainActivity.this,"Cannot reach Jellyfin. Hold Back for server settings.",Toast.LENGTH_LONG).show();
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));
        setContentView(root);web.loadUrl(homepage());web.requestFocus();
    }
    @Override public boolean onKeyDown(int keyCode,KeyEvent event){
        if(keyCode==KeyEvent.KEYCODE_MENU){showSettings();return true;}
        if(keyCode==KeyEvent.KEYCODE_BACK && event.getRepeatCount()>0){showSettings();return true;}
        if(keyCode==KeyEvent.KEYCODE_BACK && web!=null && web.canGoBack()){web.goBack();return true;}
        return super.onKeyDown(keyCode,event);
    }
    @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
