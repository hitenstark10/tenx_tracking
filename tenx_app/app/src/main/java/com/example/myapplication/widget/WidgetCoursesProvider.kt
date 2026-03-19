package com.example.myapplication.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.utils.Helpers

class WidgetCoursesProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val repo = DataRepository.getInstance(context)
        val today = Helpers.getToday()
        val allCourses = com.example.myapplication.data.PrefsManager(context).getCourses()
        
        val sb = StringBuilder()
        var topicFound = false
        for (i in 0 until allCourses.size()) {
            val c = allCourses[i].asJsonObject
            val topics = c.getAsJsonArray("topics") ?: continue
            for (j in 0 until topics.size()) {
                val t = topics[j].asJsonObject
                if (t.get("date")?.asString == today) {
                    topicFound = true
                    val cb = if (t.get("completed")?.asBoolean == true) "✅" else "📘"
                    sb.append("$cb ${t.get("name")?.asString}\n")
                }
            }
        }
        if (!topicFound) sb.append("No curriculum topics scheduled today.")

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_courses)
            views.setTextViewText(R.id.widgetCoursesContent, sb.toString().trimEnd())
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
