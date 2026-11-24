package com.codepilot.assistant

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.Color
import android.view.Gravity

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.rgb(255,244,250)) }
        val title = TextView(this).apply { text = "CodePilot AI  ♡"; textSize = 22f; setTextColor(Color.rgb(35,65,105)); gravity = Gravity.CENTER; setPadding(12,18,12,18) }
        val start = Button(this).apply { text = "Aktifkan Floating Assistant"; setOnClickListener { enableFloating() } }
        root.addView(title); root.addView(start)
        val web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient(); webChromeClient = WebChromeClient()
            loadUrl("file:///android_asset/public/index.html")
        }
        root.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
    }

    private fun enableFloating() {
        if (!Settings.canDrawOverlays(this)) {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(Intent(this, FloatingAssistantService::class.java))
        else startService(Intent(this, FloatingAssistantService::class.java))
    }
}
