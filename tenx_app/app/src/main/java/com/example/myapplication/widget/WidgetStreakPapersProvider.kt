package com.example.myapplication.widget
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.PrefsManager

class WidgetStreakPapersProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = PrefsManager(context)
        val streak = prefs.getStreak().get("count")?.asInt ?: 0
        val papers = prefs.getPapers()
        var c = 0
        for(i in 0 until papers.size()) { 
            if((papers[i].asJsonObject.get("completionPercentage")?.asInt ?: 0) >= 100) c++ 
        }
        
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_streakpapers)
            views.setTextViewText(R.id.streakValue, streak.toString())
            views.setTextViewText(R.id.papersValue, "$c/${papers.size()}")
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
