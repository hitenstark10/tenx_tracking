package com.example.myapplication.widget
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.PrefsManager

class WidgetQuoteProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = PrefsManager(context)
        val qStr = prefs.getQuote()
        var text = "Every expert was once a beginner."
        var author = "AI"
        var label = "INSPIRATION"
        
        try {
            if (qStr != null) {
                text = qStr.get("text")?.asString ?: qStr.get("quote")?.asString ?: text
                author = qStr.get("author")?.asString ?: author
                val type = qStr.get("type")?.asString ?: "quote"
                label = if (type == "fact") "AI/ML FACT" else "DAILY INSPIRATION"
            }
        } catch(e: Exception) {}

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_quote)
            views.setTextViewText(R.id.quoteText, "\"$text\"")
            views.setTextViewText(R.id.quoteAuthor, if (author.isNotEmpty()) "— $author" else "")
            views.setTextViewText(R.id.quoteLabel, label)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
