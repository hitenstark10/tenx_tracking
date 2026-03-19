package com.example.myapplication.widget
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.PrefsManager

class WidgetStopwatchProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = PrefsManager(context)
        val sw = prefs.getStopwatch()
        val isRunning = sw.get("isRunning")?.asBoolean == true
        val accumSecs = sw.get("accumulatedSeconds")?.asInt ?: 0
        val startTs = sw.get("startTimestamp")?.asLong ?: 0L

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_stopwatch)
            
            if (isRunning) {
                // startTs is Unix timestamp in ms
                val nowTs = System.currentTimeMillis()
                // diff from now in elapsedRealtime
                val elapsedRealtimeStart = android.os.SystemClock.elapsedRealtime() - (nowTs - startTs)
                val base = elapsedRealtimeStart - (accumSecs * 1000L)
                
                views.setViewVisibility(R.id.stopwatchStatic, android.view.View.GONE)
                views.setViewVisibility(R.id.stopwatchChronometer, android.view.View.VISIBLE)
                views.setChronometer(R.id.stopwatchChronometer, base, "%s", true)
            } else {
                val h = accumSecs / 3600
                val m = (accumSecs % 3600) / 60
                val s = accumSecs % 60
                val text = if (h > 0) String.format("%02d:%02d:%02d", h, m, s) else String.format("%02d:%02d", m, s)
                
                views.setViewVisibility(R.id.stopwatchChronometer, android.view.View.GONE)
                views.setViewVisibility(R.id.stopwatchStatic, android.view.View.VISIBLE)
                views.setTextViewText(R.id.stopwatchStatic, text)
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
