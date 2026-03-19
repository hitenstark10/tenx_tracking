package com.example.myapplication.ui.dashboard

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.data.PrefsManager
import com.example.myapplication.databinding.FragmentDashboardBinding
import com.example.myapplication.ui.research.ResearchActivity
import com.example.myapplication.utils.Helpers
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.google.gson.JsonObject
import java.util.Calendar
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.app.AlertDialog
import android.widget.*
import coil.load

class DashboardFragment : Fragment() {

    private var _binding: FragmentDashboardBinding? = null
    private val binding get() = _binding!!
    private lateinit var repo: DataRepository
    private lateinit var prefs: PrefsManager

    private var swRunning = false
    private var swAccumulated = 0
    private var swStartTime = 0L
    private val handler = Handler(Looper.getMainLooper())
    private val swRunnable = object : Runnable {
        override fun run() {
            if (swRunning) {
                val elapsed = ((System.currentTimeMillis() - swStartTime) / 1000).toInt()
                updateStopwatchDisplay(swAccumulated + elapsed)
                handler.postDelayed(this, 1000)
            }
        }
    }
    private var chartType = "tasks"
    private var chartRange = 7
    private var showOverall = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        repo = DataRepository.getInstance(requireContext())
        prefs = PrefsManager(requireContext())
        setupObservers()
        setupStopwatch()
        setupChartTabs()
        setupOverviewTabs()
        setupResearchCard()
        setupCountdownCard()
        updateCountdown()
        repo.fetchQuote()
        
        binding.dashAddTaskBtn.setOnClickListener { showTaskDialog(null) }
    }

    private fun setupResearchCard() {
        binding.papersCard.setOnClickListener {
            // Using modern android navigation to jump to Research
            try {
                androidx.navigation.fragment.NavHostFragment.findNavController(this).navigate(R.id.nav_research)
            } catch (e: Exception) {
                // Ignore if not in navhost
            }
        }
    }

    private fun setupObservers() {
        repo.quote.observe(viewLifecycleOwner) { q ->
            val text = q.get("text")?.asString ?: q.get("quote")?.asString
            val author = q.get("author")?.asString ?: ""
            val type = q.get("type")?.asString ?: "quote"
            val category = q.get("category")?.asString ?: ""
            val source = q.get("source")?.asString ?: ""
            if (text != null) {
                binding.quoteText.text = if (type == "fact") "\"$text\"" else "\"$text\""
                binding.quoteAuthor.text = if (author.isNotEmpty()) "— $author" else ""
                binding.quoteLabel.text = if (type == "fact") getString(R.string.ai_ml_fact) else getString(R.string.daily_inspiration)
                
                // Category badge (matching web's .dash-quote-cat)
                if (category.isNotEmpty()) {
                    binding.quoteCategoryBadge.text = category.uppercase()
                    binding.quoteCategoryBadge.visibility = View.VISIBLE
                } else {
                    binding.quoteCategoryBadge.visibility = View.GONE
                }
                
                // AI Generated badge (matching web's .dash-quote-ai-badge)
                if (source == "groq_ai") {
                    binding.quoteAiBadge.visibility = View.VISIBLE
                } else {
                    binding.quoteAiBadge.visibility = View.GONE
                }
            }
        }
        repo.tasks.observe(viewLifecycleOwner) { updateStats(); updateTodayTasks(); updateChart(); updateHeatmap() }
        repo.courses.observe(viewLifecycleOwner) { updateStats(); updateTodayTopics(); updateChart(); updateHeatmap() }
        repo.sessions.observe(viewLifecycleOwner) { updateStats(); updateChart(); updateHeatmap() }
        repo.papers.observe(viewLifecycleOwner) { updateStats(); updateChart(); updateHeatmap() }
        repo.streak.observe(viewLifecycleOwner) { updateStats() }
        repo.activityLog.observe(viewLifecycleOwner) { updateChart(); updateHeatmap() }
    }

    private var cdTargetTime = 0L
    private val cdRunnable = object : Runnable {
        override fun run() {
            val diff = cdTargetTime - System.currentTimeMillis()
            if (diff > 0) {
                val sec = (diff / 1000) % 60
                val min = (diff / (1000 * 60)) % 60
                val hrs = (diff / (1000 * 60 * 60)) % 24
                val days = diff / (1000 * 60 * 60 * 24)

                binding.cdDays.text = "$days"
                binding.cdHours.text = String.format("%02d", hrs)
                binding.cdMins.text = String.format("%02d", min)
                binding.cdSecs.text = String.format("%02d", sec)
            } else {
                binding.cdDays.text = "00"
                binding.cdHours.text = "00"
                binding.cdMins.text = "00"
                binding.cdSecs.text = "00"
            }
            handler.postDelayed(this, 1000)
        }
    }

    private fun setupCountdownCard() {
        binding.countdownCard.setOnClickListener {
            val cal = Calendar.getInstance()
            android.app.DatePickerDialog(requireContext(), { _, y, m, d ->
                cal.set(Calendar.YEAR, y)
                cal.set(Calendar.MONTH, m)
                cal.set(Calendar.DAY_OF_MONTH, d)
                
                android.app.TimePickerDialog(requireContext(), { _, h, min ->
                    cal.set(Calendar.HOUR_OF_DAY, h)
                    cal.set(Calendar.MINUTE, min)
                    cal.set(Calendar.SECOND, 0)
                    
                    repo.saveCountdown(cal.timeInMillis.toString())
                    updateCountdown()
                }, cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE), false).show()
                
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }
    }

    private fun updateCountdown() {
        val saved = repo.getCountdown()
        if (saved.isNotEmpty()) {
            try {
                cdTargetTime = saved.toLong()
                val sdf = java.text.SimpleDateFormat("MMM dd, yyyy HH:mm", java.util.Locale.getDefault())
                binding.countdownTargetText.text = "Target: ${sdf.format(java.util.Date(cdTargetTime))}"
            } catch (e: Exception) {
                fallbackCountdown()
            }
        } else {
            fallbackCountdown()
        }
        
        handler.removeCallbacks(cdRunnable)
        handler.post(cdRunnable)
    }

    private fun fallbackCountdown() {
        val endOfYear = Calendar.getInstance().apply {
            set(Calendar.MONTH, Calendar.DECEMBER)
            set(Calendar.DAY_OF_MONTH, 31)
            set(Calendar.HOUR_OF_DAY, 23)
            set(Calendar.MINUTE, 59)
            set(Calendar.SECOND, 59)
        }
        cdTargetTime = endOfYear.timeInMillis
        binding.countdownTargetText.text = "End of Year"
    }

    private fun setupOverviewTabs() {
        binding.tabToday.setOnClickListener {
            showOverall = false
            binding.tabToday.setBackgroundResource(R.drawable.bg_chip_active)
            binding.tabToday.setTextColor(Color.WHITE)
            binding.tabOverall.setBackgroundResource(R.drawable.bg_chip)
            binding.tabOverall.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
            updateStats()
        }
        binding.tabOverall.setOnClickListener {
            showOverall = true
            binding.tabOverall.setBackgroundResource(R.drawable.bg_chip_active)
            binding.tabOverall.setTextColor(Color.WHITE)
            binding.tabToday.setBackgroundResource(R.drawable.bg_chip)
            binding.tabToday.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
            updateStats()
        }
    }

    private fun updateStats() {
        val tasks = repo.tasks.value ?: emptyList()
        val sessions = repo.sessions.value ?: emptyList()
        val courses = repo.courses.value ?: emptyList()
        val papers = repo.papers.value ?: emptyList()
        val streak = repo.streak.value

        val today = Helpers.getToday()
        
        // Overall curriculum stats
        val (totalCurr, doneCurr) = Helpers.countCurriculumItems(courses)
        val overallProgression = if (totalCurr > 0) Math.round(doneCurr.toFloat() / totalCurr * 100) else 0

        if (showOverall) {
            val totalDone = tasks.count { it.get("completed")?.asBoolean == true }
            binding.statTasks.text = "$totalDone/${tasks.size}"
            val totalMin = sessions.sumOf { it.get("totalMinutes")?.asInt ?: 0 }
            binding.statStudy.text = Helpers.formatMinutesToHHMM(totalMin)
            binding.statCurriculum.text = "$doneCurr/$totalCurr"
            binding.statProgression.text = "$overallProgression%"
        } else {
            val todayTasks = tasks.filter { it.get("date")?.asString == today }
            val todayDone = todayTasks.count { it.get("completed")?.asBoolean == true }
            binding.statTasks.text = "$todayDone/${todayTasks.size}"
            val todayMin = sessions.filter { it.get("date")?.asString == today }
                .sumOf { it.get("totalMinutes")?.asInt ?: 0 }
            binding.statStudy.text = Helpers.formatMinutesToHHMM(todayMin)
            
            // Today curriculum: items with date === today OR completedDate === today (matching web)
            var todayCurrTotal = 0
            var todayCurrDone = 0
            courses.forEach { c ->
                val topics = c.getAsJsonArray("topics") ?: return@forEach
                for (tEl in topics) {
                    val t = tEl.asJsonObject
                    val tDate = t.get("date")?.asString
                    val tCompDate = t.get("completedDate")?.asString
                    if (tDate == today || tCompDate == today) {
                        todayCurrTotal++
                        if (t.get("completed")?.asBoolean == true) todayCurrDone++
                    }
                    val subs = t.getAsJsonArray("subtopics") ?: continue
                    for (sEl in subs) {
                        val s = sEl.asJsonObject
                        val sDate = s.get("date")?.asString
                        val sCompDate = s.get("completedDate")?.asString
                        if (sDate == today || sCompDate == today) {
                            todayCurrTotal++
                            if (s.get("completed")?.asBoolean == true) todayCurrDone++
                        }
                    }
                }
            }
            binding.statCurriculum.text = if (todayCurrTotal == 0) "0/0" else "$todayCurrDone/$todayCurrTotal"
            val todayProgression = if (todayCurrTotal > 0) Math.round(todayCurrDone.toFloat() / todayCurrTotal * 100) else 0
            binding.statProgression.text = "$todayProgression%"
        }

        binding.streakValue.text = "${streak?.get("count")?.asInt ?: 0}"
        val completedPapers = papers.count { (it.get("completionPercentage")?.asInt ?: 0) >= 100 }
        binding.papersValue.text = "$completedPapers/${papers.size}"
        
        // Update Milestone Grid
        val streakDays = repo.streak.value?.get("count")?.asInt ?: 0
        val totalTasks = tasks.count { it.get("completed")?.asBoolean == true }
        val totalStudyHrs = sessions.sumOf { it.get("totalMinutes")?.asInt ?: 0 } / 60
        val totalPapers = completedPapers
        val totalCurriculum = Helpers.countCurriculumItems(courses).second

        val milestonesList = listOf(
            Triple("10 Tasks Done", totalTasks, 10),
            Triple("50 Tasks Done", totalTasks, 50),
            Triple("100 Tasks Done", totalTasks, 100),
            Triple("10 Hours Study", totalStudyHrs, 10),
            Triple("50 Hours Study", totalStudyHrs, 50),
            Triple("7-Day Streak", streakDays, 7),
            Triple("30-Day Streak", streakDays, 30),
            Triple("3 Papers 100%", totalPapers, 3),
            Triple("20 Topics Done", totalCurriculum, 20),
            Triple("100 Topics Done", totalCurriculum, 100)
        )

        try {
            binding.dashMilestoneGrid.removeAllViews()
            var achieved = 0
            val dp10 = (10 * resources.displayMetrics.density).toInt()
            val dp6 = (6 * resources.displayMetrics.density).toInt()

            milestonesList.forEach { (label, current, goal) ->
                val isCompleted = current >= goal
                if (isCompleted) achieved++

                val progressPercent = Math.min(100, Math.round((current.toFloat() / goal) * 100))

                val itemLayout = LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(16, 16, 16, 16)
                    setBackgroundResource(if (isCompleted) R.drawable.bg_stat_item else R.drawable.bg_mini_card)
                    
                    val params = android.widget.GridLayout.LayoutParams().apply {
                        width = 0
                        height = android.widget.GridLayout.LayoutParams.WRAP_CONTENT
                        columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1f)
                        setMargins(dp6, dp6, dp6, dp6)
                    }
                    layoutParams = params
                }

                val titleLevelLayout = LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.HORIZONTAL
                    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp6 }
                    layoutParams = lp
                }

                val title = TextView(requireContext()).apply {
                    text = label
                    setTextColor(if (isCompleted) Color.WHITE else ContextCompat.getColor(requireContext(), R.color.text_primary))
                    textSize = 11f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }
                titleLevelLayout.addView(title)
                
                if (isCompleted) {
                    val checkmark = TextView(requireContext()).apply {
                        text = "✓"
                        setTextColor(ContextCompat.getColor(requireContext(), R.color.success))
                        textSize = 12f
                        setTypeface(null, android.graphics.Typeface.BOLD)
                    }
                    titleLevelLayout.addView(checkmark)
                }
                itemLayout.addView(titleLevelLayout)

                val progressBar = ProgressBar(requireContext(), null, android.R.attr.progressBarStyleHorizontal).apply {
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp10).apply {
                        bottomMargin = dp6
                    }
                    max = 100
                    progress = progressPercent
                    progressDrawable = ContextCompat.getDrawable(requireContext(), if (isCompleted) R.drawable.bg_progress_accent else R.drawable.bg_chip_active)
                }
                itemLayout.addView(progressBar)

                val progText = TextView(requireContext()).apply {
                    text = "$current / $goal"
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.text_tertiary))
                    textSize = 9f
                }
                itemLayout.addView(progText)

                binding.dashMilestoneGrid.addView(itemLayout)
            }
            binding.milestoneSummaryText.text = "$achieved/${milestonesList.size} Achieved"
        } catch(e: Exception) {}

        // Update News List
        try {
            val cachedNews = prefs.getNewsCache()
            binding.dashNewsList.removeAllViews()
            binding.noNewsText.visibility = if (cachedNews.size() == 0) View.VISIBLE else View.GONE
            
            val maxItems = Math.min(8, cachedNews.size())
            val dp8 = (8 * resources.displayMetrics.density).toInt()
            for (i in 0 until maxItems) {
                val article = cachedNews[i].asJsonObject
                val title = article.get("title")?.asString ?: "News"
                val source = article.get("source")?.asString ?: "Unknown Source"
                val category = article.get("category")?.asString ?: "Tech"
                val imageUrl = article.get("imageUrl")?.asString ?: article.get("image")?.asString ?: article.get("urlToImage")?.asString
                
                val itemLayout = LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(16, 16, 16, 16)
                    setBackgroundResource(R.drawable.bg_stat_item)
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp8 }
                }

                if (!imageUrl.isNullOrEmpty()) {
                    val img = ImageView(requireContext()).apply {
                        layoutParams = LinearLayout.LayoutParams((55 * resources.displayMetrics.density).toInt(), (55 * resources.displayMetrics.density).toInt()).apply { marginEnd = 16 }
                        scaleType = ImageView.ScaleType.CENTER_CROP
                        setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.bg_tertiary))
                        clipToOutline = true
                        background = ContextCompat.getDrawable(requireContext(), R.drawable.bg_avatar_circle)
                        load(imageUrl) { crossfade(true); error(R.color.bg_tertiary) }
                    }
                    itemLayout.addView(img)
                }

                val textLayout = LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }
                
                val titleView = TextView(requireContext()).apply {
                    text = title
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
                    textSize = 12f
                    maxLines = 2
                    ellipsize = android.text.TextUtils.TruncateAt.END
                }
                textLayout.addView(titleView)
                
                val metaLayout = LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp8/2 }
                }
                
                val catView = TextView(requireContext()).apply {
                    text = category.uppercase()
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.accent_primary))
                    textSize = 8f
                    setPadding(12, 4, 12, 4)
                    setBackgroundResource(R.drawable.bg_chip)
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { marginEnd = 16 }
                }
                metaLayout.addView(catView)
                
                val sourceView = TextView(requireContext()).apply {
                    text = source
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.text_tertiary))
                    textSize = 9f
                }
                metaLayout.addView(sourceView)
                
                textLayout.addView(metaLayout)
                itemLayout.addView(textLayout)

                val actionsLayout = LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                }

                val bookmarkBtn = TextView(requireContext()).apply {
                    text = "🔖"
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.text_tertiary))
                    textSize = 14f
                    setPadding(16, 16, 8, 16)
                    setOnClickListener {
                        android.widget.Toast.makeText(requireContext(), "Bookmarked!", android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
                actionsLayout.addView(bookmarkBtn)

                val shareBtn = TextView(requireContext()).apply {
                    text = "🔗"
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.text_tertiary))
                    textSize = 14f
                    setPadding(8, 16, 16, 16)
                    setOnClickListener {
                        val sendIntent = Intent().apply {
                            action = Intent.ACTION_SEND
                            putExtra(Intent.EXTRA_TEXT, "Check out this news: $title\n${article.get("url")?.asString}")
                            type = "text/plain"
                        }
                        startActivity(Intent.createChooser(sendIntent, "Share News"))
                    }
                }
                actionsLayout.addView(shareBtn)

                itemLayout.addView(actionsLayout)

                itemLayout.setOnClickListener {
                    val url = article.get("url")?.asString
                    if (!url.isNullOrEmpty()) {
                        startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)))
                    }
                }

                binding.dashNewsList.addView(itemLayout)
            }
            
            binding.dashNewsViewAll.setOnClickListener {
                try { androidx.navigation.fragment.NavHostFragment.findNavController(this).navigate(R.id.nav_news) } catch(e: Exception) {}
            }
        } catch(e: Exception) {}
    }

    private fun updateTodayTasks() {
        val todayTasks = repo.getTodayTasks()
        binding.todayTasksList.removeAllViews()
        binding.noTasksText.visibility = if (todayTasks.isEmpty()) View.VISIBLE else View.GONE

        todayTasks.take(6).forEach { task ->
            val completed = task.get("completed")?.asBoolean ?: false
            val priority = task.get("priority")?.asString ?: "medium"
            val startTime = task.get("startTime")?.asString ?: ""
            val endTime = task.get("endTime")?.asString ?: ""
            val taskId = task.get("id")?.asString ?: ""

            val row = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(10, 8, 10, 8)
                setBackgroundResource(R.drawable.bg_stat_item)
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.bottomMargin = 8
                layoutParams = lp
                if (completed) alpha = 0.5f
            }

            // Checkbox
            val checkbox = CheckBox(requireContext()).apply {
                isChecked = completed
                buttonTintList = android.content.res.ColorStateList.valueOf(ContextCompat.getColor(requireContext(), R.color.text_secondary))
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                setOnCheckedChangeListener { _, isChecked ->
                    val updates = JsonObject().apply { addProperty("completed", isChecked) }
                    repo.updateTask(taskId, updates)
                }
            }
            row.addView(checkbox)

            // Priority dot
            val dotColor = when (priority) {
                "high" -> ContextCompat.getColor(requireContext(), R.color.priority_high)
                "low" -> ContextCompat.getColor(requireContext(), R.color.priority_low)
                else -> ContextCompat.getColor(requireContext(), R.color.priority_medium)
            }
            val dot = View(requireContext()).apply {
                val dp7 = (7 * resources.displayMetrics.density).toInt()
                layoutParams = LinearLayout.LayoutParams(dp7, dp7).apply { marginEnd = (8 * resources.displayMetrics.density).toInt() }
                background = android.graphics.drawable.GradientDrawable().apply {
                    shape = android.graphics.drawable.GradientDrawable.OVAL
                    setColor(dotColor)
                }
            }
            row.addView(dot)

            // Task name
            val name = TextView(requireContext()).apply {
                text = task.get("name")?.asString ?: "Task"
                setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
                textSize = 12f
                if (completed) paintFlags = paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
            }
            row.addView(name)

            // Time badge
            if (startTime.isNotEmpty() || endTime.isNotEmpty()) {
                val timeBadge = TextView(requireContext()).apply {
                    val timeStr = if (startTime.isNotEmpty() && endTime.isNotEmpty()) "$startTime–$endTime"
                        else startTime + endTime
                    text = timeStr
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
                    textSize = 9f
                    setBackgroundResource(R.drawable.bg_chip)
                    setPadding(12, 4, 12, 4)
                    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                    lp.marginStart = (4 * resources.displayMetrics.density).toInt()
                    layoutParams = lp
                }
                row.addView(timeBadge)
            }

            // Actions Layout
            val actionsLayout = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

            val editBtn = TextView(requireContext()).apply {
                text = "✎"
                setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
                textSize = 14f
                setPadding(16, 4, 8, 4)
                setOnClickListener { showTaskDialog(task) }
            }
            actionsLayout.addView(editBtn)

            val delBtn = TextView(requireContext()).apply {
                text = "🗑"
                setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
                textSize = 14f
                setPadding(8, 4, 16, 4)
                setOnClickListener { repo.deleteTask(taskId) }
            }
            actionsLayout.addView(delBtn)

            row.addView(actionsLayout)

            if (completed) {
                val check = TextView(requireContext()).apply {
                    text = "✓"
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.success))
                    textSize = 14f
                    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                    layoutParams = lp
                }
                row.addView(check)
            }

            binding.todayTasksList.addView(row)
        }
    }

    private fun updateTodayTopics() {
        val topics = repo.getTodayCourseItems()
        binding.todayTopicsList.removeAllViews()
        binding.noTopicsText.visibility = if (topics.isEmpty()) View.VISIBLE else View.GONE

        topics.take(6).forEach { item ->
            val completed = item.get("completed")?.asBoolean ?: false
            val priority = item.get("priority")?.asString ?: "medium"
            val isSubtopic = item.get("type")?.asString == "subtopic"
            val startTime = item.get("startTime")?.asString ?: ""
            val endTime = item.get("endTime")?.asString ?: ""

            val row = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(10, 8, 10, 8)
                setBackgroundResource(R.drawable.bg_stat_item)
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                lp.bottomMargin = 4
                layoutParams = lp
                if (completed) alpha = 0.5f
            }

            // Priority dot
            val dotColor = when (priority) {
                "high" -> ContextCompat.getColor(requireContext(), R.color.priority_high)
                "low" -> ContextCompat.getColor(requireContext(), R.color.priority_low)
                else -> ContextCompat.getColor(requireContext(), R.color.priority_medium)
            }
            val dot = View(requireContext()).apply {
                val dp7 = (7 * resources.displayMetrics.density).toInt()
                layoutParams = LinearLayout.LayoutParams(dp7, dp7).apply { marginEnd = (8 * resources.displayMetrics.density).toInt() }
                background = android.graphics.drawable.GradientDrawable().apply {
                    shape = android.graphics.drawable.GradientDrawable.OVAL
                    setColor(dotColor)
                }
            }
            row.addView(dot)

            // Name (with subtopic indent arrow matching web's "↳")
            val prefix = if (isSubtopic) "  ↳ " else ""
            val nameText = TextView(requireContext()).apply {
                text = "${prefix}${item.get("name")?.asString ?: ""}"
                setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
                textSize = 12f
                if (completed) paintFlags = paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
            }
            row.addView(nameText)

            // Course tag badge (matching web's .dash-course-tag: accent-glow bg + accent-primary text)
            val courseName = item.get("course")?.asString ?: ""
            if (courseName.isNotEmpty()) {
                val courseTag = TextView(requireContext()).apply {
                    text = courseName
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.accent_primary))
                    textSize = 9f
                    setBackgroundResource(R.drawable.bg_chip)
                    setPadding(8, 3, 8, 3)
                    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                    lp.marginStart = (4 * resources.displayMetrics.density).toInt()
                    layoutParams = lp
                    maxLines = 1
                    ellipsize = android.text.TextUtils.TruncateAt.END
                }
                row.addView(courseTag)
            }

            // Time badge
            if (startTime.isNotEmpty() || endTime.isNotEmpty()) {
                val timeBadge = TextView(requireContext()).apply {
                    val timeStr = if (startTime.isNotEmpty() && endTime.isNotEmpty()) "$startTime–$endTime"
                        else startTime + endTime
                    text = timeStr
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
                    textSize = 9f
                    setBackgroundResource(R.drawable.bg_stat_item)
                    setPadding(8, 3, 8, 3)
                    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                    lp.marginStart = (4 * resources.displayMetrics.density).toInt()
                    layoutParams = lp
                }
                row.addView(timeBadge)
            }

            // Green check for completed
            if (completed) {
                val check = TextView(requireContext()).apply {
                    text = "✓"
                    setTextColor(ContextCompat.getColor(requireContext(), R.color.success))
                    textSize = 14f
                    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                    lp.marginStart = (4 * resources.displayMetrics.density).toInt()
                    layoutParams = lp
                }
                row.addView(check)
            }

            binding.todayTopicsList.addView(row)
        }
    }

    // ═══ Heatmap ═══
    private fun updateHeatmap() {
        val activityLog = repo.activityLog.value ?: emptyList()
        val tasks = repo.tasks.value ?: emptyList()
        val courses = repo.courses.value ?: emptyList()
        val papers = repo.papers.value ?: emptyList()
        val sessions = repo.sessions.value ?: emptyList()
        val mapData = mutableMapOf<String, Int>()

        // 1. Tasks completed on each date (matches web: dailyTasks.filter(t => t.date === date && t.completed))
        tasks.forEach { t ->
            if (t.get("completed")?.asBoolean == true) {
                val date = t.get("date")?.asString ?: return@forEach
                mapData[date] = (mapData[date] ?: 0) + 1
            }
        }

        // 2. Curriculum items (topics + subtopics) completed on each date by completedDate
        courses.forEach { c ->
            val topics = c.getAsJsonArray("topics") ?: return@forEach
            for (tEl in topics) {
                val t = tEl.asJsonObject
                val tCompDate = t.get("completedDate")?.asString
                if (t.get("completed")?.asBoolean == true && !tCompDate.isNullOrEmpty()) {
                    mapData[tCompDate] = (mapData[tCompDate] ?: 0) + 1
                }
                val subs = t.getAsJsonArray("subtopics") ?: continue
                for (sEl in subs) {
                    val s = sEl.asJsonObject
                    val sCompDate = s.get("completedDate")?.asString
                    if (s.get("completed")?.asBoolean == true && !sCompDate.isNullOrEmpty()) {
                        mapData[sCompDate] = (mapData[sCompDate] ?: 0) + 1
                    }
                }
            }
        }

        // 3. Research papers updated on each date (matches web: researchPapers.filter(p => p.lastUpdated === date))
        papers.forEach { p ->
            val date = p.get("lastUpdated")?.asString ?: return@forEach
            mapData[date] = (mapData[date] ?: 0) + 1
        }

        // 4. Study sessions per date
        sessions.forEach { s ->
            val date = s.get("date")?.asString ?: return@forEach
            mapData[date] = (mapData[date] ?: 0) + 1
        }

        // 5. From activityLog - resources and articlesRead (matches web)
        activityLog.forEach { entry ->
            val date = entry.get("date")?.asString ?: return@forEach
            val resources = entry.get("resources")?.asInt ?: 0
            val articlesRead = entry.get("articlesRead")?.asInt ?: 0
            if (resources + articlesRead > 0) {
                mapData[date] = (mapData[date] ?: 0) + resources + articlesRead
            }
        }

        binding.heatmapContainer.setData(mapData)
        binding.heatmapContainer.onDateClickListener = { dateStr ->
            val count = mapData[dateStr] ?: 0
            val taskCount = tasks.count { it.get("date")?.asString == dateStr && it.get("completed")?.asBoolean == true }
            var currCount = 0
            courses.forEach { c ->
                val topics = c.getAsJsonArray("topics") ?: return@forEach
                for (tEl in topics) {
                    val t = tEl.asJsonObject
                    if (t.get("completed")?.asBoolean == true && t.get("completedDate")?.asString == dateStr) currCount++
                    val subs = t.getAsJsonArray("subtopics") ?: continue
                    for (sEl in subs) {
                        val s = sEl.asJsonObject
                        if (s.get("completed")?.asBoolean == true && s.get("completedDate")?.asString == dateStr) currCount++
                    }
                }
            }
            val paperCount = papers.count { it.get("lastUpdated")?.asString == dateStr }
            android.widget.Toast.makeText(
                requireContext(),
                "$dateStr: $count total\nTasks: $taskCount | Curriculum: $currCount | Papers: $paperCount",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }

    // ═══ Stopwatch ═══
    private fun setupStopwatch() {
        val state = repo.getStopwatch()
        swAccumulated = state.get("accumulatedSeconds")?.asInt ?: 0
        swRunning = state.get("isRunning")?.asBoolean ?: false
        swStartTime = state.get("startTimestamp")?.asLong ?: 0L
        if (swRunning && swStartTime > 0) handler.post(swRunnable)
        updateStopwatchDisplay(swAccumulated)

        binding.swToggleBtn.setOnClickListener {
            if (swRunning) {
                swRunning = false
                val elapsed = ((System.currentTimeMillis() - swStartTime) / 1000).toInt()
                swAccumulated += elapsed
                handler.removeCallbacks(swRunnable)
                binding.swToggleBtn.text = "▶"
            } else {
                swRunning = true
                swStartTime = System.currentTimeMillis()
                handler.post(swRunnable)
                binding.swToggleBtn.text = "⏸"
            }
            saveStopwatchState()
        }
        binding.swResetBtn.setOnClickListener {
            swRunning = false; swAccumulated = 0; swStartTime = 0L
            handler.removeCallbacks(swRunnable)
            updateStopwatchDisplay(0)
            binding.swToggleBtn.text = "▶"
            saveStopwatchState()
        }
        binding.swSaveBtn.setOnClickListener {
            val total = if (swRunning) {
                swAccumulated + ((System.currentTimeMillis() - swStartTime) / 1000).toInt()
            } else swAccumulated
            if (total >= 60) {
                repo.addStudySession(total / 60)
                swRunning = false; swAccumulated = 0; swStartTime = 0L
                handler.removeCallbacks(swRunnable)
                updateStopwatchDisplay(0)
                binding.swToggleBtn.text = "▶"
                saveStopwatchState()
            }
        }
    }

    private fun updateStopwatchDisplay(seconds: Int) {
        binding.stopwatchValue.text = Helpers.formatSeconds(seconds)
    }

    private fun saveStopwatchState() {
        val state = JsonObject().apply {
            addProperty("isRunning", swRunning)
            addProperty("accumulatedSeconds", swAccumulated)
            addProperty("startTimestamp", swStartTime)
        }
        repo.saveStopwatch(state)
    }

    // ═══ Charts ═══
    private fun setupChartTabs() {
        val tabs = listOf(
            binding.chartTabTasks to "tasks",
            binding.chartTabStudy to "study",
            binding.chartTabCurriculum to "curriculum",
            binding.chartTabPapers to "papers"
        )
        tabs.forEach { (view, type) ->
            view.setOnClickListener {
                chartType = type
                tabs.forEach { (v, _) ->
                    v.setBackgroundResource(R.drawable.bg_chip)
                    v.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
                }
                view.setBackgroundResource(R.drawable.bg_chip_active)
                view.setTextColor(Color.WHITE)
                updateChart()
            }
        }
        binding.range7d.setOnClickListener {
            chartRange = 7
            binding.range7d.setBackgroundResource(R.drawable.bg_chip_active)
            binding.range7d.setTextColor(Color.WHITE)
            binding.range30d.setBackgroundResource(R.drawable.bg_chip)
            binding.range30d.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
            updateChart()
        }
        binding.range30d.setOnClickListener {
            chartRange = 30
            binding.range30d.setBackgroundResource(R.drawable.bg_chip_active)
            binding.range30d.setTextColor(Color.WHITE)
            binding.range7d.setBackgroundResource(R.drawable.bg_chip)
            binding.range7d.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary))
            updateChart()
        }
    }

    private fun updateChart() {
        val chart = binding.lineChart
        val days = if (chartRange == 7) Helpers.getLast7Days() else Helpers.getLast30Days()
        val activity = repo.activityLog.value ?: emptyList()
        val tasks = repo.tasks.value ?: emptyList()
        val sessions = repo.sessions.value ?: emptyList()
        val courses = repo.courses.value ?: emptyList()

        val values = days.mapIndexed { i, date ->
            val count = when (chartType) {
                "tasks" -> tasks.count {
                    it.get("date")?.asString == date && it.get("completed")?.asBoolean == true
                }.toFloat()
                "study" -> sessions.filter { it.get("date")?.asString == date }
                    .sumOf { it.get("totalMinutes")?.asInt ?: 0 }.toFloat()
                "curriculum" -> {
                    var currCount = 0
                    courses.forEach { c ->
                        val topics = c.getAsJsonArray("topics") ?: return@forEach
                        for (t in topics) {
                            val tObj = t.asJsonObject
                            if (tObj.get("completed")?.asBoolean == true && tObj.get("completedDate")?.asString == date) currCount++
                            val subs = tObj.getAsJsonArray("subtopics") ?: continue
                            for (s in subs) {
                                val sObj = s.asJsonObject
                                if (sObj.get("completed")?.asBoolean == true && sObj.get("completedDate")?.asString == date) currCount++
                            }
                        }
                    }
                    currCount.toFloat()
                }
                "papers" -> (repo.papers.value ?: emptyList()).count {
                    it.get("lastUpdated")?.asString == date
                }.toFloat()
                else -> 0f
            }
            Entry(i.toFloat(), count)
        }

        // Use distinct colors per chart type, matching web dashboard
        val chartColor = when (chartType) {
            "tasks" -> ContextCompat.getColor(requireContext(), R.color.chart_indigo)    // #818cf8
            "study" -> ContextCompat.getColor(requireContext(), R.color.chart_emerald)   // #34d399
            "curriculum" -> ContextCompat.getColor(requireContext(), R.color.chart_amber) // #fbbf24
            "papers" -> ContextCompat.getColor(requireContext(), R.color.chart_pink)      // #f472b6
            else -> ContextCompat.getColor(requireContext(), R.color.accent_primary)
        }

        val dataSet = LineDataSet(values, chartType).apply {
            color = chartColor; setCircleColor(chartColor)
            lineWidth = 2.5f; circleRadius = 3f
            setDrawFilled(true); fillColor = chartColor; fillAlpha = 30
            setDrawValues(false); mode = LineDataSet.Mode.CUBIC_BEZIER
        }

        chart.data = LineData(dataSet)
        chart.xAxis.apply {
            position = XAxis.XAxisPosition.BOTTOM
            textColor = ContextCompat.getColor(requireContext(), R.color.text_muted)
            textSize = 9f; setDrawGridLines(false)
            valueFormatter = IndexAxisValueFormatter(days.map { Helpers.formatDateShort(it) })
            granularity = 1f
            labelRotationAngle = if (chartRange > 7) -45f else 0f
        }
        chart.axisLeft.apply {
            textColor = ContextCompat.getColor(requireContext(), R.color.text_muted)
            textSize = 10f
            gridColor = ContextCompat.getColor(requireContext(), R.color.chart_grid)
            axisMinimum = 0f
        }
        chart.axisRight.isEnabled = false
        chart.description.isEnabled = false
        chart.legend.isEnabled = false
        chart.setBackgroundColor(Color.TRANSPARENT)
        chart.setTouchEnabled(true)
        chart.animateX(400)
        chart.invalidate()
    }

    private fun showTaskDialog(existing: JsonObject?) {
        val isEdit = existing != null
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_add_task, null)
        val nameInput = dialogView.findViewById<EditText>(R.id.taskNameInput)
        val descInput = dialogView.findViewById<EditText>(R.id.taskDescInput)
        val prioritySpinner = dialogView.findViewById<Spinner>(R.id.prioritySpinner)
        val dateBtn = dialogView.findViewById<Button>(R.id.dateSelectBtn)
        val startTimeBtn = dialogView.findViewById<Button>(R.id.startTimeBtn)
        val endTimeBtn = dialogView.findViewById<Button>(R.id.endTimeBtn)

        val priorities = arrayOf(getString(R.string.high), getString(R.string.medium), getString(R.string.low))
        prioritySpinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, priorities)

        var dialogDate = Helpers.getToday()
        var startT = ""
        var endT = ""

        dateBtn.text = dialogDate
        dateBtn.setOnClickListener {
            val cal = Calendar.getInstance()
            DatePickerDialog(requireContext(), { _, y, m, d ->
                dialogDate = String.format("%04d-%02d-%02d", y, m + 1, d)
                dateBtn.text = dialogDate
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }

        startTimeBtn.setOnClickListener {
            TimePickerDialog(requireContext(), { _, h, m ->
                startT = String.format("%02d:%02d", h, m)
                startTimeBtn.text = startT
            }, 9, 0, false).show()
        }

        endTimeBtn.setOnClickListener {
            TimePickerDialog(requireContext(), { _, h, m ->
                endT = String.format("%02d:%02d", h, m)
                endTimeBtn.text = endT
            }, 10, 0, false).show()
        }

        if (isEdit) {
            nameInput.setText(existing!!.get("name")?.asString ?: "")
            descInput.setText(existing.get("description")?.asString ?: "")
            val p = existing.get("priority")?.asString ?: "medium"
            prioritySpinner.setSelection(priorities.indexOfFirst { it.lowercase() == p }.coerceAtLeast(0))
            dialogDate = existing.get("date")?.asString ?: Helpers.getToday()
            dateBtn.text = dialogDate
            startT = existing.get("startTime")?.asString ?: ""
            endT = existing.get("endTime")?.asString ?: ""
            if (startT.isNotEmpty()) startTimeBtn.text = startT
            if (endT.isNotEmpty()) endTimeBtn.text = endT
        }

        AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
            .setTitle(if (isEdit) getString(R.string.edit_task) else getString(R.string.add_task))
            .setView(dialogView)
            .setPositiveButton(getString(R.string.save)) { _, _ ->
                val name = nameInput.text.toString().trim()
                if (name.isEmpty()) return@setPositiveButton

                if (isEdit) {
                    val updates = JsonObject().apply {
                        addProperty("name", name)
                        addProperty("description", descInput.text.toString().trim())
                        addProperty("priority", priorities[prioritySpinner.selectedItemPosition].lowercase())
                        addProperty("date", dialogDate)
                        addProperty("startTime", startT)
                        addProperty("endTime", endT)
                    }
                    repo.updateTask(existing!!.get("id").asString, updates)
                } else {
                    val task = JsonObject().apply {
                        addProperty("name", name)
                        addProperty("description", descInput.text.toString().trim())
                        addProperty("priority", priorities[prioritySpinner.selectedItemPosition].lowercase())
                        addProperty("date", dialogDate)
                        addProperty("startTime", startT)
                        addProperty("endTime", endT)
                    }
                    repo.addTask(task)
                }
            }
            .setNeutralButton("Delete") { _, _ ->
                if (isEdit) repo.deleteTask(existing!!.get("id").asString)
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        handler.removeCallbacks(swRunnable)
        handler.removeCallbacks(cdRunnable)
        _binding = null
    }
}
