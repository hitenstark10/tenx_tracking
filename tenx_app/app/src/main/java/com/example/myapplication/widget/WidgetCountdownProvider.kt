package com.example.myapplication.widget
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.PrefsManager

class WidgetCountdownProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = PrefsManager(context)
        var targetStr = prefs.getCountdown()
        if (targetStr.isNullOrEmpty()) targetStr = "2026-12-31T23:59:59"
        
        var diffSecs = 0L
        try {
            val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
            val d = format.parse(targetStr)
            if (d != null) {
                diffSecs = (d.time - System.currentTimeMillis()) / 1000
            }
        } catch(e: Exception) {}

        if (diffSecs < 0) diffSecs = 0

        val days = diffSecs / (24 * 3600)
        val hours = (diffSecs % (24 * 3600)) / 3600

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_countdown)
            views.setTextViewText(R.id.cdDays, days.toString())
            views.setTextViewText(R.id.cdHours, String.format("%02d", hours))
            views.setTextViewText(R.id.cdTarget, "TARGET: " + targetStr.split("T")[0])
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
