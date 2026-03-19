package com.example.myapplication.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.example.myapplication.MainActivity
import com.example.myapplication.R
import com.example.myapplication.data.PrefsManager

class DashboardWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        internal fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = PrefsManager(context)
            val views = RemoteViews(context.packageName, R.layout.widget_dashboard)
            
            // Retrieve stats from PrefsManager caches
            val streak = prefs.getStreak().get("count")?.asInt ?: 0
            
            // Pending intent to open MainActivity when widget is clicked
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            views.setTextViewText(R.id.widget_streak_val, streak.toString())
            
            val tasksArr = prefs.getTasks()
            val today = com.example.myapplication.utils.Helpers.getToday()
            var comp = 0
            var pend = 0
            for(i in 0 until tasksArr.size()) {
                val t = tasksArr[i].asJsonObject
                if(t.get("date")?.asString == today) {
                    if(t.get("completed")?.asBoolean == true) comp++ else pend++
                }
            }
            views.setTextViewText(R.id.widget_tasks_val, "$comp/${comp+pend}")

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
