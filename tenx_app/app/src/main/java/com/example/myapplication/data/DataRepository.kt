package com.example.myapplication.data

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.example.myapplication.api.RetrofitClient
import com.example.myapplication.utils.Helpers
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import kotlinx.coroutines.*

class DataRepository private constructor(context: Context) {

    private val appContext = context.applicationContext
    private val prefs = PrefsManager(appContext)
    private val api = RetrofitClient.instance
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // ═══ LiveData ═══
    private val _tasks = MutableLiveData<List<JsonObject>>(emptyList())
    val tasks: LiveData<List<JsonObject>> = _tasks

    private val _courses = MutableLiveData<List<JsonObject>>(emptyList())
    val courses: LiveData<List<JsonObject>> = _courses

    private val _papers = MutableLiveData<List<JsonObject>>(emptyList())
    val papers: LiveData<List<JsonObject>> = _papers

    private val _sessions = MutableLiveData<List<JsonObject>>(emptyList())
    val sessions: LiveData<List<JsonObject>> = _sessions

    private val _bookmarks = MutableLiveData<List<JsonObject>>(emptyList())
    val bookmarks: LiveData<List<JsonObject>> = _bookmarks

    private val _streak = MutableLiveData(JsonObject().apply {
        addProperty("count", 0); add("lastDate", null)
    })
    val streak: LiveData<JsonObject> = _streak

    private val _activityLog = MutableLiveData<List<JsonObject>>(emptyList())
    val activityLog: LiveData<List<JsonObject>> = _activityLog

    private val _newsRead = MutableLiveData<List<String>>(emptyList())
    val newsRead: LiveData<List<String>> = _newsRead

    private val _profile = MutableLiveData(JsonObject())
    val profile: LiveData<JsonObject> = _profile

    private val _isLoaded = MutableLiveData(false)
    val isLoaded: LiveData<Boolean> = _isLoaded

    private val _quote = MutableLiveData(JsonObject())
    val quote: LiveData<JsonObject> = _quote

    private val syncJobs = mutableMapOf<String, Job>()

    companion object {
        @Volatile
        private var instance: DataRepository? = null
        fun getInstance(context: Context): DataRepository =
            instance ?: synchronized(this) {
                instance ?: DataRepository(context).also { instance = it }
            }
    }

    // ═══ Initialize — Load ALL data from API ═══
    fun initialize(userId: String) {
        _isLoaded.postValue(false)
        scope.launch {
            try {
                val results = listOf(
                    async { fetchType("tasks", userId) },
                    async { fetchType("courses", userId) },
                    async { fetchType("papers", userId) },
                    async { fetchType("sessions", userId) },
                    async { fetchType("bookmarks", userId) },
                    async { fetchType("streak", userId) },
                    async { fetchType("activity", userId) },
                    async { fetchType("newsread", userId) },
                    async { fetchType("profile", userId) },
                ).map { it.await() }

                // tasks
                results[0]?.let { data ->
                    val list = Helpers.jsonArrayToList(data.asJsonArray)
                    _tasks.postValue(list)
                    prefs.saveTasks(data.asJsonArray)
                }
                // courses
                results[1]?.let { data ->
                    val list = Helpers.jsonArrayToList(data.asJsonArray)
                    _courses.postValue(list)
                    prefs.saveCourses(data.asJsonArray)
                }
                // papers
                results[2]?.let { data ->
                    val list = Helpers.jsonArrayToList(data.asJsonArray)
                    _papers.postValue(list)
                    prefs.savePapers(data.asJsonArray)
                }
                // sessions
                results[3]?.let { data ->
                    val list = Helpers.jsonArrayToList(data.asJsonArray)
                    _sessions.postValue(list)
                    prefs.saveSessions(data.asJsonArray)
                }
                // bookmarks
                results[4]?.let { data ->
                    val list = Helpers.jsonArrayToList(data.asJsonArray)
                    _bookmarks.postValue(list)
                    prefs.saveBookmarks(data.asJsonArray)
                }
                // streak
                results[5]?.let { data ->
                    if (data.isJsonObject) {
                        _streak.postValue(data.asJsonObject)
                        prefs.saveStreak(data.asJsonObject)
                    }
                }
                // activity
                results[6]?.let { data ->
                    val list = Helpers.jsonArrayToList(data.asJsonArray)
                    _activityLog.postValue(list)
                    prefs.saveActivity(data.asJsonArray)
                }
                // newsread
                results[7]?.let { data ->
                    val ids = mutableListOf<String>()
                    if (data.isJsonArray) {
                        data.asJsonArray.forEach { ids.add(it.asString) }
                    }
                    _newsRead.postValue(ids)
                    prefs.saveNewsRead(data.asJsonArray)
                }
                // profile
                results[8]?.let { data ->
                    if (data.isJsonObject && data.asJsonObject.entrySet().isNotEmpty()) {
                        _profile.postValue(data.asJsonObject)
                        prefs.saveProfile(data.asJsonObject)
                    }
                }
                
                updateAllAppWidgets()
            } catch (e: Exception) {
                e.printStackTrace()
                loadFromLocal()
            } finally {
                _isLoaded.postValue(true)
            }
        }
    }

    private fun updateAllAppWidgets() {
        val widgetClasses = arrayOf(
            com.example.myapplication.widget.DashboardWidgetProvider::class.java,
            com.example.myapplication.widget.WidgetTasksProvider::class.java,
            com.example.myapplication.widget.WidgetCoursesProvider::class.java,
            com.example.myapplication.widget.WidgetNewsProvider::class.java,
            com.example.myapplication.widget.WidgetQuoteProvider::class.java,
            com.example.myapplication.widget.WidgetStopwatchProvider::class.java,
            com.example.myapplication.widget.WidgetCountdownProvider::class.java,
            com.example.myapplication.widget.WidgetHeatmapProvider::class.java,
            com.example.myapplication.widget.WidgetChartProvider::class.java,
            com.example.myapplication.widget.WidgetMilestoneProvider::class.java,
            com.example.myapplication.widget.WidgetStreakPapersProvider::class.java
        )

        val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(appContext)
        for (widgetClass in widgetClasses) {
            val componentName = android.content.ComponentName(appContext, widgetClass)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isNotEmpty()) {
                val intent = android.content.Intent(appContext, widgetClass).apply {
                    action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                appContext.sendBroadcast(intent)
            }
        }
    }

    private fun updateAppWidget(className: String) {
        try {
            val componentName = android.content.ComponentName(appContext, "com.example.myapplication.widget.$className")
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(appContext)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isNotEmpty()) {
                val intent = android.content.Intent(appContext, Class.forName("com.example.myapplication.widget.$className")).apply {
                    action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                appContext.sendBroadcast(intent)
            }
        } catch (_: Exception) {}
    }

    private fun loadFromLocal() {
        _tasks.postValue(Helpers.jsonArrayToList(prefs.getTasks()))
        _courses.postValue(Helpers.jsonArrayToList(prefs.getCourses()))
        _papers.postValue(Helpers.jsonArrayToList(prefs.getPapers()))
        _sessions.postValue(Helpers.jsonArrayToList(prefs.getSessions()))
        _bookmarks.postValue(Helpers.jsonArrayToList(prefs.getBookmarks()))
        _streak.postValue(prefs.getStreak())
        _activityLog.postValue(Helpers.jsonArrayToList(prefs.getActivity()))
        val newsArr = prefs.getNewsRead()
        _newsRead.postValue((0 until newsArr.size()).map { newsArr[it].asString })
        prefs.getProfile()?.let { _profile.postValue(it) }
    }

    private suspend fun fetchType(type: String, userId: String): com.google.gson.JsonElement? {
        return try {
            val res = api.fetchData(type, userId)
            if (res.isSuccessful) {
                res.body()?.get("data")
            } else null
        } catch (e: Exception) {
            null
        }
    }

    // ═══ Debounced Sync ═══
    private fun debouncedSync(type: String, data: Any) {
        val userId = prefs.getUserId() ?: return
        syncJobs[type]?.cancel()
        syncJobs[type] = scope.launch {
            delay(500)
            try {
                val body = JsonObject()
                body.add("data", gson.toJsonTree(data))
                api.syncData(type, userId, body)
            } catch (e: Exception) {
                // Silent fail — data is saved locally
            }
        }
    }

    // ═══ DAILY TASKS CRUD ═══
    fun addTask(task: JsonObject) {
        val list = (_tasks.value ?: emptyList()).toMutableList()
        if (!task.has("id")) task.addProperty("id", Helpers.generateId())
        if (!task.has("completed")) task.addProperty("completed", false)
        if (!task.has("createdDate")) task.addProperty("createdDate", Helpers.getToday())
        list.add(task)
        _tasks.postValue(list)
        prefs.saveTasks(Helpers.listToJsonArray(list))
        debouncedSync("tasks", list)
    }

    fun updateTask(id: String, updates: JsonObject) {
        val list = (_tasks.value ?: emptyList()).map { t ->
            if (t.has("id") && t.get("id").asString == id) {
                val merged = t.deepCopy()
                updates.entrySet().forEach { (k, v) -> merged.add(k, v) }
                merged
            } else t
        }
        _tasks.postValue(list)
        prefs.saveTasks(Helpers.listToJsonArray(list))
        debouncedSync("tasks", list)

        // Update streak if completing
        if (updates.has("completed") && updates.get("completed").asBoolean) {
            logActivity("tasks", 1)
            val newStreak = Helpers.calculateStreak(
                list, _streak.value ?: JsonObject(),
                _courses.value ?: emptyList(),
                _papers.value ?: emptyList(),
                _newsRead.value ?: emptyList()
            )
            _streak.postValue(newStreak)
            prefs.saveStreak(newStreak)
            debouncedSync("streak", newStreak)
        }
    }

    fun deleteTask(id: String) {
        val list = (_tasks.value ?: emptyList()).filter {
            !(it.has("id") && it.get("id").asString == id)
        }
        _tasks.postValue(list)
        prefs.saveTasks(Helpers.listToJsonArray(list))
        debouncedSync("tasks", list)
    }

    // ═══ COURSES CRUD ═══
    fun addCourse(course: JsonObject) {
        val list = (_courses.value ?: emptyList()).toMutableList()
        if (!course.has("id")) course.addProperty("id", Helpers.generateId())
        if (!course.has("topics")) course.add("topics", JsonArray())
        if (!course.has("createdDate")) course.addProperty("createdDate", Helpers.getToday())
        list.add(course)
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    fun updateCourse(id: String, updates: JsonObject) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == id) {
                val merged = c.deepCopy()
                updates.entrySet().forEach { (k, v) -> merged.add(k, v) }
                merged
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    fun deleteCourse(id: String) {
        val list = (_courses.value ?: emptyList()).filter {
            !(it.has("id") && it.get("id").asString == id)
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    // Topic CRUD
    fun addTopic(courseId: String, topic: JsonObject) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == courseId) {
                val copy = c.deepCopy()
                val topics = copy.getAsJsonArray("topics") ?: JsonArray()
                if (!topic.has("id")) topic.addProperty("id", Helpers.generateId())
                if (!topic.has("completed")) topic.addProperty("completed", false)
                if (!topic.has("subtopics")) topic.add("subtopics", JsonArray())
                if (!topic.has("resources")) topic.add("resources", JsonArray())
                topics.add(topic)
                copy.add("topics", topics)
                copy
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    fun updateTopic(courseId: String, topicId: String, updates: JsonObject) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == courseId) {
                val copy = c.deepCopy()
                val topics = copy.getAsJsonArray("topics") ?: return@map c
                for (i in 0 until topics.size()) {
                    val t = topics[i].asJsonObject
                    if (t.has("id") && t.get("id").asString == topicId) {
                        updates.entrySet().forEach { (k, v) -> t.add(k, v) }
                    }
                }
                copy
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
        if (updates.has("completed") && updates.get("completed").asBoolean) {
            logActivity("curriculum", 1)
        }
    }

    fun deleteTopic(courseId: String, topicId: String) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == courseId) {
                val copy = c.deepCopy()
                val topics = copy.getAsJsonArray("topics") ?: return@map c
                val newTopics = JsonArray()
                for (t in topics) {
                    if (!(t.asJsonObject.has("id") && t.asJsonObject.get("id").asString == topicId))
                        newTopics.add(t)
                }
                copy.add("topics", newTopics)
                copy
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    // Subtopic CRUD
    fun addSubtopic(courseId: String, topicId: String, subtopic: JsonObject) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == courseId) {
                val copy = c.deepCopy()
                val topics = copy.getAsJsonArray("topics") ?: return@map c
                for (t in topics) {
                    val to = t.asJsonObject
                    if (to.has("id") && to.get("id").asString == topicId) {
                        val subs = to.getAsJsonArray("subtopics") ?: JsonArray()
                        if (!subtopic.has("id")) subtopic.addProperty("id", Helpers.generateId())
                        if (!subtopic.has("completed")) subtopic.addProperty("completed", false)
                        if (!subtopic.has("resources")) subtopic.add("resources", JsonArray())
                        subs.add(subtopic)
                        to.add("subtopics", subs)
                    }
                }
                copy
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    fun updateSubtopic(courseId: String, topicId: String, subId: String, updates: JsonObject) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == courseId) {
                val copy = c.deepCopy()
                val topics = copy.getAsJsonArray("topics") ?: return@map c
                for (t in topics) {
                    val to = t.asJsonObject
                    if (to.has("id") && to.get("id").asString == topicId) {
                        val subs = to.getAsJsonArray("subtopics") ?: continue
                        for (s in subs) {
                            val so = s.asJsonObject
                            if (so.has("id") && so.get("id").asString == subId) {
                                updates.entrySet().forEach { (k, v) -> so.add(k, v) }
                            }
                        }
                    }
                }
                copy
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
        if (updates.has("completed") && updates.get("completed").asBoolean) {
            logActivity("curriculum", 1)
        }
    }

    // ═══ RESOURCES CRUD ═══
    fun addResource(courseId: String, topicId: String, subtopicId: String?, resource: JsonObject) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == courseId) {
                val copy = c.deepCopy()
                val topics = copy.getAsJsonArray("topics") ?: return@map c
                for (t in topics) {
                    val to = t.asJsonObject
                    if (to.has("id") && to.get("id").asString == topicId) {
                        if (subtopicId == null) {
                            val resList = to.getAsJsonArray("resources") ?: JsonArray()
                            if (!resource.has("id")) resource.addProperty("id", Helpers.generateId())
                            resList.add(resource)
                            to.add("resources", resList)
                        } else {
                            val subs = to.getAsJsonArray("subtopics") ?: continue
                            for (s in subs) {
                                val so = s.asJsonObject
                                if (so.has("id") && so.get("id").asString == subtopicId) {
                                    val resList = so.getAsJsonArray("resources") ?: JsonArray()
                                    if (!resource.has("id")) resource.addProperty("id", Helpers.generateId())
                                    resList.add(resource)
                                    so.add("resources", resList)
                                }
                            }
                        }
                    }
                }
                copy
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    fun deleteResource(courseId: String, topicId: String, subtopicId: String?, resourceId: String) {
        val list = (_courses.value ?: emptyList()).map { c ->
            if (c.has("id") && c.get("id").asString == courseId) {
                val copy = c.deepCopy()
                val topics = copy.getAsJsonArray("topics") ?: return@map c
                for (t in topics) {
                    val to = t.asJsonObject
                    if (to.has("id") && to.get("id").asString == topicId) {
                        if (subtopicId == null) {
                            val resList = to.getAsJsonArray("resources") ?: JsonArray()
                            val newResList = JsonArray()
                            for (r in resList) {
                                if (!(r.asJsonObject.has("id") && r.asJsonObject.get("id").asString == resourceId)) {
                                    newResList.add(r)
                                }
                            }
                            to.add("resources", newResList)
                        } else {
                            val subs = to.getAsJsonArray("subtopics") ?: continue
                            for (s in subs) {
                                val so = s.asJsonObject
                                if (so.has("id") && so.get("id").asString == subtopicId) {
                                    val resList = so.getAsJsonArray("resources") ?: JsonArray()
                                    val newResList = JsonArray()
                                    for (r in resList) {
                                        if (!(r.asJsonObject.has("id") && r.asJsonObject.get("id").asString == resourceId)) {
                                            newResList.add(r)
                                        }
                                    }
                                    so.add("resources", newResList)
                                }
                            }
                        }
                    }
                }
                copy
            } else c
        }
        _courses.postValue(list)
        prefs.saveCourses(Helpers.listToJsonArray(list))
        debouncedSync("courses", list)
    }

    // ═══ RESEARCH PAPERS CRUD ═══
    fun addPaper(paper: JsonObject) {
        val list = (_papers.value ?: emptyList()).toMutableList()
        if (!paper.has("id")) paper.addProperty("id", Helpers.generateId())
        if (!paper.has("completionPercentage")) paper.addProperty("completionPercentage", 0)
        if (!paper.has("createdDate")) paper.addProperty("createdDate", Helpers.getToday())
        if (!paper.has("lastUpdated")) paper.addProperty("lastUpdated", Helpers.getToday())
        list.add(paper)
        _papers.postValue(list)
        prefs.savePapers(Helpers.listToJsonArray(list))
        debouncedSync("papers", list)
    }

    fun updatePaper(id: String, updates: JsonObject) {
        val list = (_papers.value ?: emptyList()).map { p ->
            if (p.has("id") && p.get("id").asString == id) {
                val merged = p.deepCopy()
                updates.entrySet().forEach { (k, v) -> merged.add(k, v) }
                merged
            } else p
        }
        _papers.postValue(list)
        prefs.savePapers(Helpers.listToJsonArray(list))
        debouncedSync("papers", list)
        if (updates.has("completionPercentage")) logActivity("papers", 1)
    }

    fun deletePaper(id: String) {
        val list = (_papers.value ?: emptyList()).filter {
            !(it.has("id") && it.get("id").asString == id)
        }
        _papers.postValue(list)
        prefs.savePapers(Helpers.listToJsonArray(list))
        debouncedSync("papers", list)
    }

    // ═══ STUDY SESSIONS ═══
    fun addStudySession(totalMinutes: Int) {
        val session = JsonObject().apply {
            addProperty("id", Helpers.generateId())
            addProperty("date", Helpers.getToday())
            addProperty("totalMinutes", totalMinutes)
        }
        val list = (_sessions.value ?: emptyList()).toMutableList()
        list.add(session)
        _sessions.postValue(list)
        prefs.saveSessions(Helpers.listToJsonArray(list))
        debouncedSync("sessions", list)
    }

    // ═══ BOOKMARKS ═══
    fun toggleBookmark(article: JsonObject) {
        val list = (_bookmarks.value ?: emptyList()).toMutableList()
        val id = article.get("id")?.asString ?: return
        val exists = list.any { it.has("id") && it.get("id").asString == id }
        if (exists) {
            list.removeAll { it.has("id") && it.get("id").asString == id }
        } else {
            val bk = article.deepCopy()
            bk.addProperty("bookmarkedDate", Helpers.getToday())
            list.add(bk)
        }
        _bookmarks.postValue(list)
        prefs.saveBookmarks(Helpers.listToJsonArray(list))
        debouncedSync("bookmarks", list)
    }

    fun isBookmarked(articleId: String): Boolean {
        return _bookmarks.value?.any { it.has("id") && it.get("id").asString == articleId } ?: false
    }

    // ═══ NEWS READ ═══
    fun markArticleRead(articleId: String) {
        val list = (_newsRead.value ?: emptyList()).toMutableList()
        if (!list.contains(articleId)) {
            list.add(articleId)
            _newsRead.postValue(list)
            val arr = JsonArray()
            list.forEach { arr.add(it) }
            prefs.saveNewsRead(arr)
            debouncedSync("newsread", list)
            logActivity("articlesRead", 1)
        }
    }

    fun isArticleRead(articleId: String): Boolean {
        return _newsRead.value?.contains(articleId) ?: false
    }

    // ═══ PROFILE ═══
    fun updateProfile(updates: JsonObject) {
        val current = _profile.value?.deepCopy() ?: JsonObject()
        updates.entrySet().forEach { (k, v) -> current.add(k, v) }
        _profile.postValue(current)
        prefs.saveProfile(current)
        debouncedSync("profile", current)

        // Also sync to profiles table
        val userId = prefs.getUserId() ?: return
        scope.launch {
            try {
                val body = mapOf(
                    "username" to (current.get("displayName")?.asString ?: ""),
                    "bio" to (current.get("bio")?.asString ?: ""),
                    "profileImage" to (current.get("profileImage")?.asString ?: "")
                )
                api.updateProfile(userId, body)
            } catch (_: Exception) {}
        }
    }

    // ═══ ACTIVITY LOG ═══
    private fun logActivity(type: String, count: Int) {
        val today = Helpers.getToday()
        val list = (_activityLog.value ?: emptyList()).toMutableList()
        val existing = list.find { it.has("date") && it.get("date").asString == today }
        if (existing != null) {
            val current = if (existing.has(type)) existing.get(type).asInt else 0
            existing.addProperty(type, current + count)
        } else {
            val entry = JsonObject()
            entry.addProperty("date", today)
            entry.addProperty(type, count)
            list.add(entry)
        }
        _activityLog.postValue(list)
        prefs.saveActivity(Helpers.listToJsonArray(list))
        debouncedSync("activity", list)
    }

    // ═══ QUOTE ═══
    fun fetchQuote() {
        scope.launch {
            try {
                val res = api.getRandomQuote()
                if (res.isSuccessful) {
                    res.body()?.let { 
                        _quote.postValue(it) 
                        prefs.saveQuote(it)
                        updateAppWidget("WidgetQuoteProvider")
                    }
                }
            } catch (_: Exception) {
                val fallback = JsonObject().apply {
                    addProperty("text", "Every expert was once a beginner.")
                    addProperty("author", "Helen Hayes")
                    addProperty("category", "AI")
                    addProperty("type", "quote")
                }
                _quote.postValue(fallback)
                prefs.saveQuote(fallback)
                updateAppWidget("WidgetQuoteProvider")
            }
        }
    }

    // ═══ STOPWATCH ═══
    fun getStopwatch(): JsonObject = prefs.getStopwatch()
    fun saveStopwatch(state: JsonObject) = prefs.saveStopwatch(state)
    fun getCountdown(): String = prefs.getCountdown()
    fun saveCountdown(target: String) = prefs.saveCountdown(target)

    // ═══ COMPUTED STATS ═══
    fun getTodayTasks(): List<JsonObject> {
        val today = Helpers.getToday()
        return (_tasks.value ?: emptyList()).filter {
            it.has("date") && it.get("date").asString == today
        }
    }

    fun getTodayCompletedCount(): Int {
        return getTodayTasks().count { it.has("completed") && it.get("completed").asBoolean }
    }

    fun getTotalStudyMinutes(): Int {
        return (_sessions.value ?: emptyList()).sumOf {
            if (it.has("totalMinutes")) it.get("totalMinutes").asInt else 0
        }
    }

    fun getTodayStudyMinutes(): Int {
        val today = Helpers.getToday()
        return (_sessions.value ?: emptyList()).filter {
            it.has("date") && it.get("date").asString == today
        }.sumOf {
            if (it.has("totalMinutes")) it.get("totalMinutes").asInt else 0
        }
    }

    fun getCompletedPapersCount(): Int {
        return (_papers.value ?: emptyList()).count {
            it.has("completionPercentage") && it.get("completionPercentage").asInt >= 100
        }
    }

    fun getTodayCourseItems(): List<JsonObject> {
        val today = Helpers.getToday()
        val items = mutableListOf<JsonObject>()
        (_courses.value ?: emptyList()).forEach { c ->
            val courseName = c.get("name")?.asString ?: ""
            val topics = c.getAsJsonArray("topics") ?: return@forEach
            for (tEl in topics) {
                val t = tEl.asJsonObject
                if ((t.get("date")?.asString == today) || (t.get("completedDate")?.asString == today)) {
                    val item = JsonObject()
                    item.addProperty("type", "topic")
                    item.addProperty("name", t.get("name")?.asString ?: "")
                    item.addProperty("course", courseName)
                    item.addProperty("completed", t.get("completed")?.asBoolean ?: false)
                    item.addProperty("priority", t.get("priority")?.asString ?: "medium")
                    items.add(item)
                }
                val subs = t.getAsJsonArray("subtopics") ?: continue
                for (sEl in subs) {
                    val s = sEl.asJsonObject
                    if ((s.get("date")?.asString == today) || (s.get("completedDate")?.asString == today)) {
                        val item = JsonObject()
                        item.addProperty("type", "subtopic")
                        item.addProperty("name", s.get("name")?.asString ?: "")
                        item.addProperty("course", courseName)
                        item.addProperty("completed", s.get("completed")?.asBoolean ?: false)
                        item.addProperty("priority", s.get("priority")?.asString ?: "medium")
                        items.add(item)
                    }
                }
            }
        }
        return items
    }

    // ═══ CLEAR ALL ═══
    fun clearAll() {
        _tasks.postValue(emptyList())
        _courses.postValue(emptyList())
        _papers.postValue(emptyList())
        _sessions.postValue(emptyList())
        _bookmarks.postValue(emptyList())
        _streak.postValue(JsonObject().apply { addProperty("count", 0); add("lastDate", null) })
        _activityLog.postValue(emptyList())
        _newsRead.postValue(emptyList())
        _profile.postValue(JsonObject())
        prefs.clearAllData()
    }
}
