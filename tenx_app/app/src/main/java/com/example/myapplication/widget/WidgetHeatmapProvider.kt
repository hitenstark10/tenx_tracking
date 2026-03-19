package com.example.myapplication.widget
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R

class WidgetHeatmapProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_heatmap)
            views.setTextViewText(R.id.widgetContent, "🗓️ Activity Heatmap")
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
