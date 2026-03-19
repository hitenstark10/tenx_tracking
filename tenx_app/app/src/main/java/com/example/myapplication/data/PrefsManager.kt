package com.example.myapplication.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken

class PrefsManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("tenx_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_USER = "current_user"
        private const val KEY_TASKS = "daily_tasks"
        private const val KEY_COURSES = "courses"
        private const val KEY_PAPERS = "research_papers"
        private const val KEY_SESSIONS = "study_sessions"
        private const val KEY_BOOKMARKS = "bookmarks"
        private const val KEY_STREAK = "streak"
        private const val KEY_ACTIVITY = "activity_log"
        private const val KEY_NEWS_READ = "news_read"
        private const val KEY_PROFILE = "profile"
        private const val KEY_NEWS_CACHE = "news_cache"
        private const val KEY_NEWS_CACHE_DATE = "news_cache_date"
        private const val KEY_STOPWATCH = "stopwatch"
        private const val KEY_COUNTDOWN = "countdown_target"
    }

    // ═══ User Session ═══
    fun saveUser(user: JsonObject) {
        prefs.edit().putString(KEY_USER, user.toString()).apply()
    }

    fun getUser(): JsonObject? {
        val json = prefs.getString(KEY_USER, null) ?: return null
        return try { gson.fromJson(json, JsonObject::class.java) } catch (e: Exception) { null }
    }

    fun getUserId(): String? = getUser()?.get("id")?.asString
    fun getUsername(): String? = getUser()?.get("username")?.asString
    fun getAccessToken(): String? = getUser()?.get("accessToken")?.asString
    fun getUserEmail(): String? = getUser()?.get("email")?.asString
    fun getEmail(): String? = getUserEmail()
    fun getCreatedAt(): String? = getUser()?.get("createdAt")?.asString

    fun clearUser() {
        prefs.edit().remove(KEY_USER).apply()
    }

    fun isLoggedIn(): Boolean = getUser() != null

    // ═══ Generic JSON Data ═══
    fun saveJsonData(key: String, data: Any) {
        prefs.edit().putString(key, gson.toJson(data)).apply()
    }

    fun getJsonArray(key: String): JsonArray {
        val json = prefs.getString(key, null) ?: return JsonArray()
        return try { gson.fromJson(json, JsonArray::class.java) } catch (e: Exception) { JsonArray() }
    }

    fun getJsonObject(key: String): JsonObject? {
        val json = prefs.getString(key, null) ?: return null
        return try { gson.fromJson(json, JsonObject::class.java) } catch (e: Exception) { null }
    }

    // ═══ Typed Accessors ═══
    fun saveTasks(tasks: JsonArray) = saveJsonData(KEY_TASKS, tasks)
    fun getTasks(): JsonArray = getJsonArray(KEY_TASKS)

    fun saveCourses(courses: JsonArray) = saveJsonData(KEY_COURSES, courses)
    fun getCourses(): JsonArray = getJsonArray(KEY_COURSES)

    fun savePapers(papers: JsonArray) = saveJsonData(KEY_PAPERS, papers)
    fun getPapers(): JsonArray = getJsonArray(KEY_PAPERS)

    fun saveSessions(sessions: JsonArray) = saveJsonData(KEY_SESSIONS, sessions)
    fun getSessions(): JsonArray = getJsonArray(KEY_SESSIONS)

    fun saveBookmarks(bookmarks: JsonArray) = saveJsonData(KEY_BOOKMARKS, bookmarks)
    fun getBookmarks(): JsonArray = getJsonArray(KEY_BOOKMARKS)

    fun saveStreak(streak: JsonObject) = saveJsonData(KEY_STREAK, streak)
    fun getStreak(): JsonObject {
        val obj = getJsonObject(KEY_STREAK)
        if (obj != null) return obj
        val default = JsonObject()
        default.addProperty("count", 0)
        default.add("lastDate", null)
        return default
    }

    fun saveActivity(activity: JsonArray) = saveJsonData(KEY_ACTIVITY, activity)
    fun getActivity(): JsonArray = getJsonArray(KEY_ACTIVITY)

    fun saveNewsRead(ids: JsonArray) = saveJsonData(KEY_NEWS_READ, ids)
    fun getNewsRead(): JsonArray = getJsonArray(KEY_NEWS_READ)

    fun saveProfile(profile: JsonObject) = saveJsonData(KEY_PROFILE, profile)
    fun getProfile(): JsonObject? = getJsonObject(KEY_PROFILE)

    fun saveNewsCache(articles: JsonArray) = saveJsonData(KEY_NEWS_CACHE, articles)
    fun getNewsCache(): JsonArray = getJsonArray(KEY_NEWS_CACHE)

    fun saveNewsCacheDate(date: String) = prefs.edit().putString(KEY_NEWS_CACHE_DATE, date).apply()
    fun getNewsCacheDate(): String = prefs.getString(KEY_NEWS_CACHE_DATE, "") ?: ""

    // ═══ Quote ═══
    fun saveQuote(quote: JsonObject) = saveJsonData("quote", quote)
    fun getQuote(): JsonObject? = getJsonObject("quote")

    // ═══ Stopwatch State ═══
    fun saveStopwatch(state: JsonObject) = saveJsonData(KEY_STOPWATCH, state)
    fun getStopwatch(): JsonObject {
        val obj = getJsonObject(KEY_STOPWATCH)
        if (obj != null) return obj
        val default = JsonObject()
        default.addProperty("isRunning", false)
        default.addProperty("accumulatedSeconds", 0)
        default.addProperty("startTimestamp", 0L)
        return default
    }

    // ═══ Countdown ═══
    fun saveCountdown(target: String) = prefs.edit().putString(KEY_COUNTDOWN, target).apply()
    fun getCountdown(): String = prefs.getString(KEY_COUNTDOWN, "") ?: ""

    // ═══ Clear All Data (Logout) ═══
    fun clearAllData() {
        prefs.edit().clear().apply()
    }
}
