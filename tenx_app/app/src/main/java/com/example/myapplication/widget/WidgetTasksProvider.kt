package com.example.myapplication.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.utils.Helpers

class WidgetTasksProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val repo = DataRepository.getInstance(context)
        val today = Helpers.getToday()
        val allTasks = com.example.myapplication.data.PrefsManager(context).getTasks()
        
        val sb = StringBuilder()
        var tasksFound = 0
        for (i in 0 until allTasks.size()) {
            val t = allTasks[i].asJsonObject
            if (t.get("date")?.asString == today) {
                tasksFound++
                if (tasksFound <= 4) {
                    val name = t.get("name")?.asString ?: "Task"
                    val cb = if (t.get("completed")?.asBoolean == true) "✅" else "⬛"
                    sb.append("$cb  $name\n\n")
                }
            }
        }
        
        if (tasksFound == 0) sb.append("No tasks for today. Rest up!")

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_tasks)
            val textTasks = sb.toString().trimEnd().ifEmpty { "No tasks today!" }
            views.setTextViewText(R.id.widgetTasksContent, textTasks)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
