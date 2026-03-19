package com.example.myapplication.ui.profile

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.myapplication.R
import com.example.myapplication.api.RetrofitClient
import com.example.myapplication.data.DataRepository
import com.example.myapplication.data.PrefsManager
import com.example.myapplication.ui.auth.AuthActivity
import com.google.gson.JsonObject
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {

    private lateinit var repo: DataRepository
    private lateinit var prefs: PrefsManager

    // ═══ Milestone System (ported from web Profile.jsx) ═══
    data class Milestone(val key: String, val icon: String, val label: String, val desc: String, val check: (Stats) -> Boolean)
    data class Stats(val tasksCompleted: Int, val courses: Int, val studyHours: Int, val streak: Int, val papers: Int, val topicsCompleted: Int)

    companion object {
        val TIER_NAMES = listOf("🌱 Getting Started", "🔥 Building Momentum", "⚡ Gaining Expertise", "👑 Expert Level", "🏆 Legendary")

        val MILESTONE_TIERS = listOf(
            // Tier 1: Getting Started
            listOf(
                Milestone("task_first", "✅", "First Step", "Complete your first task") { s -> s.tasksCompleted >= 1 },
                Milestone("course_first", "📖", "Student", "Start your first course") { s -> s.courses >= 1 },
                Milestone("study_1h", "⏰", "60 Minutes", "Study for 1 hour total") { s -> s.studyHours >= 1 },
                Milestone("streak_3", "🔥", "Warm Up", "Maintain a 3-day streak") { s -> s.streak >= 3 },
                Milestone("task_5", "🎯", "Getting Going", "Complete 5 tasks") { s -> s.tasksCompleted >= 5 },
                Milestone("topic_first", "✨", "Explorer", "Complete a course topic") { s -> s.topicsCompleted >= 1 },
                Milestone("paper_first", "📄", "Reader", "Add your first research paper") { s -> s.papers >= 1 },
                Milestone("study_5h", "☕", "Dedicated", "Study for 5 hours total") { s -> s.studyHours >= 5 },
                Milestone("task_10", "⭐", "Ten Down", "Complete 10 tasks") { s -> s.tasksCompleted >= 10 },
                Milestone("streak_7", "⚡", "Week Warrior", "Maintain a 7-day streak") { s -> s.streak >= 7 }
            ),
            // Tier 2: Building Momentum
            listOf(
                Milestone("task_25", "🎯", "25 Tasks", "Complete 25 tasks") { s -> s.tasksCompleted >= 25 },
                Milestone("course_3", "📖", "Multi-Learner", "Start 3 courses") { s -> s.courses >= 3 },
                Milestone("study_10h", "⏰", "10 Hours", "Study for 10 hours total") { s -> s.studyHours >= 10 },
                Milestone("streak_14", "🔥", "Two Weeks", "Maintain a 14-day streak") { s -> s.streak >= 14 },
                Milestone("topic_5", "🧠", "Deep Diver", "Complete 5 course topics") { s -> s.topicsCompleted >= 5 },
                Milestone("paper_3", "📄", "Scholar", "Track 3 research papers") { s -> s.papers >= 3 },
                Milestone("task_50", "⭐", "Fifty Strong", "Complete 50 tasks") { s -> s.tasksCompleted >= 50 },
                Milestone("study_25h", "☕", "25 Hours", "Study for 25 hours") { s -> s.studyHours >= 25 },
                Milestone("course_5", "📖", "Course Collector", "Start 5 courses") { s -> s.courses >= 5 },
                Milestone("topic_10", "🏆", "10 Topics Done", "Complete 10 course topics") { s -> s.topicsCompleted >= 10 }
            ),
            // Tier 3: Gaining Expertise
            listOf(
                Milestone("task_100", "🎯", "Centurion", "Complete 100 tasks") { s -> s.tasksCompleted >= 100 },
                Milestone("streak_30", "🔥", "Month Master", "Maintain a 30-day streak") { s -> s.streak >= 30 },
                Milestone("study_50h", "⏰", "50 Hours", "Study for 50 hours") { s -> s.studyHours >= 50 },
                Milestone("paper_5", "📄", "Researcher", "Track 5 research papers") { s -> s.papers >= 5 },
                Milestone("course_10", "📖", "Curriculum King", "Start 10 courses") { s -> s.courses >= 10 },
                Milestone("topic_25", "🧠", "25 Topics", "Complete 25 course topics") { s -> s.topicsCompleted >= 25 },
                Milestone("task_200", "⭐", "Task Machine", "Complete 200 tasks") { s -> s.tasksCompleted >= 200 },
                Milestone("study_100h", "☕", "100 Hours", "Study for 100 hours") { s -> s.studyHours >= 100 },
                Milestone("streak_60", "⚡", "60 Day Streak", "Maintain a 60-day streak") { s -> s.streak >= 60 },
                Milestone("paper_10", "📄", "10 Papers", "Track 10 research papers") { s -> s.papers >= 10 }
            ),
            // Tier 4: Expert Level
            listOf(
                Milestone("task_500", "👑", "500 Tasks", "Complete 500 tasks") { s -> s.tasksCompleted >= 500 },
                Milestone("streak_90", "🔥", "90 Day Streak", "3-month streak!") { s -> s.streak >= 90 },
                Milestone("study_250h", "⏰", "250 Hours", "Study for 250 hours") { s -> s.studyHours >= 250 },
                Milestone("topic_50", "🏆", "50 Topics", "Complete 50 topics") { s -> s.topicsCompleted >= 50 },
                Milestone("course_20", "📖", "20 Courses", "Start 20 courses") { s -> s.courses >= 20 },
                Milestone("paper_25", "📄", "25 Papers", "Track 25 research papers") { s -> s.papers >= 25 },
                Milestone("task_1000", "🏅", "1000 Tasks", "Complete 1000 tasks!") { s -> s.tasksCompleted >= 1000 },
                Milestone("study_500h", "🚀", "500 Hours", "Study for 500 hours") { s -> s.studyHours >= 500 },
                Milestone("streak_180", "🎁", "180 Day Streak", "6-month streak!") { s -> s.streak >= 180 },
                Milestone("topic_100", "👑", "100 Topics", "Complete 100 topics") { s -> s.topicsCompleted >= 100 }
            ),
            // Tier 5: Legendary
            listOf(
                Milestone("streak_365", "👑", "Year Streak", "Maintain a 365-day streak!") { s -> s.streak >= 365 },
                Milestone("task_2500", "🏅", "2500 Tasks", "Complete 2500 tasks") { s -> s.tasksCompleted >= 2500 },
                Milestone("study_1000h", "🚀", "1000 Hours", "Study for 1000 hours") { s -> s.studyHours >= 1000 },
                Milestone("topic_250", "🏆", "250 Topics", "Complete 250 topics") { s -> s.topicsCompleted >= 250 },
                Milestone("paper_50", "📄", "50 Papers", "Track 50 research papers") { s -> s.papers >= 50 },
                Milestone("course_50", "📖", "50 Courses", "Start 50 courses") { s -> s.courses >= 50 },
                Milestone("task_5000", "👑", "5000 Tasks", "Complete 5000 tasks!") { s -> s.tasksCompleted >= 5000 },
                Milestone("study_2500h", "⭐", "2500 Hours", "2500 hours of study!") { s -> s.studyHours >= 2500 },
                Milestone("topic_500", "🧠", "500 Topics", "Complete 500 topics") { s -> s.topicsCompleted >= 500 },
                Milestone("paper_100", "🏅", "100 Papers", "Track 100 research papers") { s -> s.papers >= 100 }
            )
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        repo = DataRepository.getInstance(applicationContext)
        prefs = PrefsManager(this)

        setupViews()
        setupObservers()
        setupListeners()
    }

    private fun setupViews() {
        findViewById<ImageView>(R.id.backBtn).setOnClickListener { finish() }
    }

    private fun setupObservers() {
        repo.profile.observe(this) { profile ->
            val name = profile.get("displayName")?.asString
                ?: profile.get("username")?.asString
                ?: prefs.getUsername() ?: "User"
            findViewById<TextView>(R.id.profileName).text = name
            
            val bio = profile.get("bio")?.asString ?: ""
            val bioView = findViewById<TextView>(R.id.profileBio)
            if (bio.isNotEmpty()) {
                bioView.text = bio
                bioView.visibility = View.VISIBLE
            } else {
                bioView.text = "Add a bio to your profile"
                bioView.visibility = View.VISIBLE
            }

            findViewById<TextView>(R.id.profileEmail).text = prefs.getEmail() ?: ""
            findViewById<TextView>(R.id.profileAvatar).text = name.take(1).uppercase()

            val joined = prefs.getCreatedAt()
            if (!joined.isNullOrEmpty()) {
                findViewById<TextView>(R.id.profileJoined).text = "Joined $joined"
            }
        }

        repo.tasks.observe(this) { updateStats() }
        repo.sessions.observe(this) { updateStats() }
        repo.streak.observe(this) { updateStats() }
        repo.courses.observe(this) { updateStats() }
        repo.papers.observe(this) { updateStats() }
    }

    private fun updateStats() {
        val tasks = repo.tasks.value ?: emptyList()
        val totalDone = tasks.count { it.get("completed")?.asBoolean == true }
        findViewById<TextView>(R.id.statTasks).text = "$totalDone"

        val totalMin = repo.getTotalStudyMinutes()
        val hrs = totalMin / 60
        findViewById<TextView>(R.id.statHours).text = "${hrs}h"

        val streak = repo.streak.value
        val streakCount = streak?.get("count")?.asInt ?: 0
        findViewById<TextView>(R.id.statStreak).text = "$streakCount"

        // Calculate topics completed
        val courses = repo.courses.value ?: emptyList()
        var topicsCompleted = 0
        courses.forEach { c ->
            val topics = c.getAsJsonArray("topics") ?: return@forEach
            for (tEl in topics) {
                val t = tEl.asJsonObject
                if (t.get("completed")?.asBoolean == true) topicsCompleted++
                val subs = t.getAsJsonArray("subtopics") ?: continue
                for (sEl in subs) {
                    if (sEl.asJsonObject.get("completed")?.asBoolean == true) topicsCompleted++
                }
            }
        }

        val papers = repo.papers.value ?: emptyList()
        val stats = Stats(
            tasksCompleted = totalDone,
            courses = courses.size,
            studyHours = hrs,
            streak = streakCount,
            papers = papers.size,
            topicsCompleted = topicsCompleted
        )

        updateMilestones(stats)
    }

    private fun updateMilestones(stats: Stats) {
        // Determine current tier
        var currentTierIdx = 0
        for (i in MILESTONE_TIERS.indices) {
            val allDone = MILESTONE_TIERS[i].all { m -> m.check(stats) }
            if (allDone && i < MILESTONE_TIERS.size - 1) {
                currentTierIdx = i + 1
            } else {
                currentTierIdx = i
                break
            }
        }

        val currentMilestones = MILESTONE_TIERS[currentTierIdx]
        val achievedCount = currentMilestones.count { m -> m.check(stats) }
        val totalMilestones = currentMilestones.size

        findViewById<TextView>(R.id.milestoneTierTitle).text = TIER_NAMES[currentTierIdx]
        findViewById<TextView>(R.id.milestoneCount).text = "$achievedCount/$totalMilestones"

        val progressBar = findViewById<ProgressBar>(R.id.milestoneProgress)
        progressBar.max = totalMilestones
        progressBar.progress = achievedCount

        // Setup milestones recycler
        val recycler = findViewById<RecyclerView>(R.id.milestonesRecycler)
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = MilestoneAdapter(currentMilestones, stats)
    }

    private fun setupListeners() {
        findViewById<View>(R.id.btnEditProfile).setOnClickListener { showEditNameDialog() }
        findViewById<View>(R.id.btnChangePassword).setOnClickListener { showPasswordDialog() }
        findViewById<View>(R.id.btnLogout).setOnClickListener {
            AlertDialog.Builder(this, R.style.TenxBottomSheet)
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out") { _, _ ->
                    repo.clearAll()
                    prefs.clearAllData()
                    startActivity(Intent(this, AuthActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                    finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun showEditNameDialog() {
        val profile = repo.profile.value ?: JsonObject()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }

        val nameInput = EditText(this).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@ProfileActivity, R.color.text_primary))
            hint = "Display Name"
            setText(profile.get("displayName")?.asString
                ?: profile.get("username")?.asString ?: "")
            setPadding(24, 18, 24, 18)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.bottomMargin = 24
            layoutParams = lp
        }

        val bioInput = EditText(this).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@ProfileActivity, R.color.text_primary))
            hint = "Bio"
            setText(profile.get("bio")?.asString ?: "")
            setPadding(24, 18, 24, 18)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.bottomMargin = 24
            layoutParams = lp
        }

        val imageInput = EditText(this).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@ProfileActivity, R.color.text_primary))
            hint = "Profile Image URL (Optional)"
            setText(profile.get("profileImage")?.asString ?: "")
            setPadding(24, 18, 24, 18)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.bottomMargin = 24
            layoutParams = lp
        }

        layout.addView(nameInput)
        layout.addView(bioInput)
        layout.addView(imageInput)

        AlertDialog.Builder(this, R.style.TenxBottomSheet)
            .setTitle("Edit Profile")
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val updates = JsonObject().apply {
                    addProperty("displayName", nameInput.text.toString().trim())
                    addProperty("username", nameInput.text.toString().trim())
                    addProperty("bio", bioInput.text.toString().trim())
                    addProperty("profileImage", imageInput.text.toString().trim())
                }
                repo.updateProfile(updates)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showPasswordDialog() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }

        val newPwInput = EditText(this).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@ProfileActivity, R.color.text_primary))
            hint = "New Password"
            setPadding(24, 18, 24, 18)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        layout.addView(newPwInput)

        AlertDialog.Builder(this, R.style.TenxBottomSheet)
            .setTitle("Change Password")
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val newPw = newPwInput.text.toString()
                if (newPw.length >= 6) {
                    lifecycleScope.launch {
                        try {
                            val token = prefs.getAccessToken()
                            RetrofitClient.instance.updatePassword(
                                "Bearer $token", mapOf("password" to newPw)
                            )
                        } catch (_: Exception) {}
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ═══ Milestone Adapter ═══
    inner class MilestoneAdapter(
        private val milestones: List<Milestone>,
        private val stats: Stats
    ) : RecyclerView.Adapter<MilestoneAdapter.VH>() {

        inner class VH(view: View) : RecyclerView.ViewHolder(view) {
            val icon: TextView = view.findViewById(R.id.milestoneIcon)
            val label: TextView = view.findViewById(R.id.milestoneLabel)
            val desc: TextView = view.findViewById(R.id.milestoneDesc)
            val check: ImageView = view.findViewById(R.id.milestoneCheck)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_milestone, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val m = milestones[position]
            val achieved = m.check(stats)
            holder.icon.text = m.icon
            holder.label.text = m.label
            holder.desc.text = m.desc
            holder.check.visibility = if (achieved) View.VISIBLE else View.GONE
            holder.itemView.alpha = if (achieved) 1f else 0.5f
        }

        override fun getItemCount() = milestones.size
    }
}
