package com.example.myapplication.widget
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.PrefsManager

class WidgetMilestoneProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = PrefsManager(context)
        val streak = prefs.getStreak().get("count")?.asInt ?: 0
        val tasks = prefs.getTasks()
        var completed = 0
        for(i in 0 until tasks.size()) { if(tasks[i].asJsonObject.get("completed")?.asBoolean == true) completed++ }
        
        val score = (streak * 10) + (completed * 5)
        val text = when {
            score >= 1000 -> "👑 AI Legend"
            score >= 500  -> "🚀 AI Master"
            score >= 250  -> "⭐ AI Scholar"
            score >= 100  -> "✨ Rising Star"
            score >= 50   -> "🗺️ Explorer"
            else          -> "🌱 AI Novice"
        }
        
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_milestone)
            views.setTextViewText(R.id.dashMilestoneText, text)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
