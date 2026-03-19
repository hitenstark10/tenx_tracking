package com.example.myapplication.utils

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import java.text.SimpleDateFormat
import java.util.*

object Helpers {

    fun generateId(): String = UUID.randomUUID().toString().take(12)

    fun getToday(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return sdf.format(Date())
    }

    fun formatMinutesToHHMM(minutes: Int): String {
        val h = minutes / 60
        val m = minutes % 60
        return String.format("%d:%02d", h, m)
    }

    fun formatSeconds(seconds: Int): String {
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        val s = seconds % 60
        return if (h > 0) String.format("%d:%02d:%02d", h, m, s)
        else String.format("%02d:%02d", m, s)
    }

    fun getLast7Days(): List<String> {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val cal = Calendar.getInstance()
        val days = mutableListOf<String>()
        for (i in 6 downTo 0) {
            cal.time = Date()
            cal.add(Calendar.DAY_OF_YEAR, -i)
            days.add(sdf.format(cal.time))
        }
        return days
    }

    fun getLast30Days(): List<String> {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val cal = Calendar.getInstance()
        val days = mutableListOf<String>()
        for (i in 29 downTo 0) {
            cal.time = Date()
            cal.add(Calendar.DAY_OF_YEAR, -i)
            days.add(sdf.format(cal.time))
        }
        return days
    }

    fun formatDateShort(date: String): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val d = sdf.parse(date) ?: return date
            val out = SimpleDateFormat("MM/dd", Locale.US)
            out.format(d)
        } catch (e: Exception) {
            date.takeLast(5)
        }
    }

    fun getCourseProgress(course: JsonObject): Int {
        var total = 0
        var done = 0
        val topics = course.getAsJsonArray("topics") ?: return 0
        for (t in topics) {
            val topic = t.asJsonObject
            total++
            if (topic.has("completed") && topic.get("completed").asBoolean) done++
            val subs = topic.getAsJsonArray("subtopics")
            if (subs != null) {
                for (s in subs) {
                    val sub = s.asJsonObject
                    total++
                    if (sub.has("completed") && sub.get("completed").asBoolean) done++
                }
            }
        }
        return if (total > 0) Math.round(done.toFloat() / total * 100) else 0
    }

    fun getDaysCountdownTo(target: String): Map<String, Any> {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
            val targetDate = sdf.parse(target) ?: return mapOf("expired" to true)
            val diff = targetDate.time - System.currentTimeMillis()
            if (diff <= 0) return mapOf("expired" to true, "days" to 0, "hours" to 0, "minutes" to 0, "seconds" to 0)
            val seconds = (diff / 1000) % 60
            val minutes = (diff / (1000 * 60)) % 60
            val hours = (diff / (1000 * 60 * 60)) % 24
            val days = diff / (1000 * 60 * 60 * 24)
            mapOf("expired" to false, "days" to days.toInt(), "hours" to hours.toInt(), "minutes" to minutes.toInt(), "seconds" to seconds.toInt())
        } catch (e: Exception) {
            mapOf("expired" to true)
        }
    }

    fun calculateStreak(
        tasks: List<JsonObject>,
        currentStreak: JsonObject,
        courses: List<JsonObject>,
        papers: List<JsonObject>,
        newsRead: List<String>
    ): JsonObject {
        val today = getToday()
        val todayTasks = tasks.filter {
            it.has("date") && it.get("date").asString == today
        }
        val todayCompleted = todayTasks.any {
            it.has("completed") && it.get("completed").asBoolean
        }

        // Check if any course topic/subtopic was completed today
        var courseActivity = false
        for (cEl in courses) {
            val topics = cEl.asJsonObject.getAsJsonArray("topics") ?: continue
            for (tEl in topics) {
                val t = tEl.asJsonObject
                if (t.has("completedDate") && t.get("completedDate").asString == today) {
                    courseActivity = true; break
                }
                val subs = t.getAsJsonArray("subtopics") ?: continue
                for (sEl in subs) {
                    val s = sEl.asJsonObject
                    if (s.has("completedDate") && s.get("completedDate").asString == today) {
                        courseActivity = true; break
                    }
                }
                if (courseActivity) break
            }
            if (courseActivity) break
        }

        val hasActivity = todayCompleted || courseActivity
        val lastDate = if (currentStreak.has("lastDate") && !currentStreak.get("lastDate").isJsonNull)
            currentStreak.get("lastDate").asString else null
        val count = if (currentStreak.has("count")) currentStreak.get("count").asInt else 0

        val result = JsonObject()
        if (!hasActivity) {
            result.addProperty("count", count)
            result.addProperty("lastDate", lastDate)
            return result
        }

        if (lastDate == today) {
            result.addProperty("count", count)
            result.addProperty("lastDate", today)
            return result
        }

        // Check if yesterday
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -1)
        val yesterday = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)

        if (lastDate == yesterday) {
            result.addProperty("count", count + 1)
        } else {
            result.addProperty("count", 1)
        }
        result.addProperty("lastDate", today)
        return result
    }

    // Convert JsonArray to list of JsonObject
    fun jsonArrayToList(arr: JsonArray?): List<JsonObject> {
        if (arr == null) return emptyList()
        return (0 until arr.size()).mapNotNull {
            try { arr[it].asJsonObject } catch (e: Exception) { null }
        }
    }

    // Convert list of JsonObject to JsonArray
    fun listToJsonArray(list: List<JsonObject>): JsonArray {
        val arr = JsonArray()
        list.forEach { arr.add(it) }
        return arr
    }

    // Calculate total curriculum items
    fun countCurriculumItems(courses: List<JsonObject>): Pair<Int, Int> {
        var total = 0
        var completed = 0
        for (cObj in courses) {
            val topics = cObj.getAsJsonArray("topics") ?: continue
            for (tEl in topics) {
                val t = tEl.asJsonObject
                total++
                if (t.has("completed") && t.get("completed").asBoolean) completed++
                val subs = t.getAsJsonArray("subtopics") ?: continue
                for (sEl in subs) {
                    val s = sEl.asJsonObject
                    total++
                    if (s.has("completed") && s.get("completed").asBoolean) completed++
                }
            }
        }
        return Pair(total, completed)
    }

    fun calcDuration(startTime: String?, endTime: String?): String? {
        if (startTime.isNullOrEmpty() || endTime.isNullOrEmpty()) return null
        try {
            val startParts = startTime.split(":")
            val endParts = endTime.split(":")
            val sh = startParts[0].toInt(); val sm = startParts[1].toInt()
            val eh = endParts[0].toInt(); val em = endParts[1].toInt()
            var diffMin = (eh * 60 + em) - (sh * 60 + sm)
            if (diffMin < 0) diffMin += 24 * 60
            val hrs = diffMin / 60
            val mins = diffMin % 60
            return when {
                hrs > 0 && mins > 0 -> "${hrs}h ${mins}m"
                hrs > 0 -> "${hrs}h"
                else -> "${mins}m"
            }
        } catch (e: Exception) {
            return null
        }
    }
}
