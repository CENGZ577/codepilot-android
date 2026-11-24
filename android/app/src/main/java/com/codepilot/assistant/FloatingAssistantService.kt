package com.codepilot.assistant

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.*
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.*

class FloatingAssistantService : Service() {
    private lateinit var wm: WindowManager
    private var bubble: View? = null
    private var panel: View? = null
    private val channelId = "codepilot_floating"
    private fun layoutType() = if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE

    override fun onCreate() {
        super.onCreate()
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return }
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotification()
        showBubble()
    }

    private fun createNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(channelId, "CodePilot Floating", NotificationManager.IMPORTANCE_LOW))
        val notification = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, channelId) else Notification.Builder(this)
        startForeground(7, notification.setContentTitle("CodePilot AI aktif").setContentText("Floating assistant siap digunakan").setSmallIcon(android.R.drawable.ic_dialog_info).build())
    }

    private fun bubbleBackground() = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.rgb(35, 112, 190)); setStroke(3, Color.rgb(130, 220, 255)) }

    private fun showBubble() {
        if (bubble != null) return
        val view = TextView(this).apply { text = "✦"; textSize = 27f; gravity = Gravity.CENTER; setTextColor(Color.WHITE); background = bubbleBackground(); elevation = 12f }
        val params = WindowManager.LayoutParams(58, 58, layoutType(), WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START; x = 18; y = 220 }
        var sx = 0f; var sy = 0f; var ox = 0; var oy = 0
        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> { sx = event.rawX; sy = event.rawY; ox = params.x; oy = params.y; true }
                MotionEvent.ACTION_MOVE -> { params.x = ox + (event.rawX - sx).toInt(); params.y = oy + (event.rawY - sy).toInt(); wm.updateViewLayout(view, params); true }
                MotionEvent.ACTION_UP -> { if (kotlin.math.abs(event.rawX-sx) < 8 && kotlin.math.abs(event.rawY-sy) < 8) togglePanel(); true }
                else -> true
            }
        }
        bubble = view; wm.addView(view, params)
    }

    private fun togglePanel() { if (panel == null) showPanel() else hidePanel() }
    private fun showPanel() {
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; background = GradientDrawable().apply { setColor(Color.rgb(255,246,251)); cornerRadius = 28f; setStroke(3, Color.rgb(92,190,255)) }; elevation = 18f }
        val header = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(14,8,8,8) }
        val title = TextView(this).apply { text = "CodePilot AI  ♡"; textSize = 16f; setTextColor(Color.rgb(28,72,125)); setTypeface(null, 1) }
        val close = Button(this).apply { text = "—"; setOnClickListener { hidePanel() } }
        header.addView(title, LinearLayout.LayoutParams(0,48,1f)); header.addView(close)
        val web = WebView(this).apply { settings.javaScriptEnabled = true; settings.domStorageEnabled = true; webViewClient = WebViewClient(); webChromeClient = WebChromeClient(); loadUrl("file:///android_asset/public/index.html") }
        root.addView(header); root.addView(web, LinearLayout.LayoutParams(-1,0,1f))
        val p = WindowManager.LayoutParams((resources.displayMetrics.widthPixels * .92f).toInt(), (resources.displayMetrics.heightPixels * .72f).toInt(), layoutType(), WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.CENTER }
        panel = root; wm.addView(root,p)
    }
    private fun hidePanel() { panel?.let { try { wm.removeView(it) } catch (_: Exception) {} }; panel = null }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY
    override fun onDestroy() { hidePanel(); bubble?.let { try { wm.removeView(it) } catch (_: Exception) {} }; bubble = null; super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
}
