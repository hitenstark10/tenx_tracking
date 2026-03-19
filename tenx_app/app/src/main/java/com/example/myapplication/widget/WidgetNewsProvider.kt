package com.example.myapplication.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.utils.Helpers

class WidgetNewsProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val cache = com.example.myapplication.data.PrefsManager(context).getNewsCache()
        val articles = Helpers.jsonArrayToList(cache)
        
        val text = if (articles.isNotEmpty()) {
            val a = articles[0]
            val title = a.get("title")?.asString ?: ""
            val src = a.get("source")?.asString ?: "Tech Source"
            "$title"
        } else "Connect to fetch latest news!"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_news)
            views.setTextViewText(R.id.widgetNewsContent, text)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
