package com.example.myapplication.ui.courses

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.utils.Helpers
import com.google.gson.JsonArray
import com.google.gson.JsonObject

class CourseDetailActivity : AppCompatActivity() {

    private lateinit var repo: DataRepository
    private var courseId: String = ""
    private lateinit var container: LinearLayout
    private var currentResourceUrlInput: EditText? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        courseId = intent.getStringExtra("courseId") ?: run {
            finish(); return
        }

        repo = DataRepository.getInstance(applicationContext)

        val scroll = ScrollView(this).apply {
            setBackgroundColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.bg_primary))
        }
        container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }
        scroll.addView(container)
        setContentView(scroll)

        repo.courses.observe(this) { renderCourse() }
    }

    private fun getCourse(): JsonObject? {
        return repo.courses.value?.find { it.get("id")?.asString == courseId }
    }

    private fun renderCourse() {
        val course = getCourse() ?: return
        container.removeAllViews()

        // Back button
        val backBtn = Button(this).apply {
            text = "← Back"
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.accent_primary))
            setBackgroundColor(0)
            textSize = 14f
            setOnClickListener { finish() }
        }
        container.addView(backBtn)

        // Course Title
        val title = TextView(this).apply {
            text = course.get("name")?.asString ?: ""
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.text_primary))
            textSize = 24f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, 16, 0, 8)
        }
        container.addView(title)

        // Progress
        val pct = Helpers.getCourseProgress(course)
        val progressText = TextView(this).apply {
            text = "Progress: $pct%"
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.accent_primary))
            textSize = 14f
            setPadding(0, 0, 0, 24)
        }
        container.addView(progressText)

        // Add Topic Button
        val addTopicBtn = Button(this).apply {
            text = "+ Add Topic"
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.white))
            setBackgroundResource(R.drawable.bg_btn_primary)
            setPadding(32, 16, 32, 16)
            setOnClickListener { showTopicDialog(null) }
        }
        container.addView(addTopicBtn)

        // Spacer
        container.addView(View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 24
            )
        })

        // Topics
        val topics = course.getAsJsonArray("topics") ?: JsonArray()
        for (i in 0 until topics.size()) {
            val topic = topics[i].asJsonObject
            renderTopic(topic)
        }

        if (topics.size() == 0) {
            val empty = TextView(this).apply {
                text = "No topics yet. Add your first topic!"
                setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.text_muted))
                textSize = 14f
                gravity = android.view.Gravity.CENTER
                setPadding(0, 48, 0, 48)
            }
            container.addView(empty)
        }
    }

    private fun renderTopic(topic: JsonObject) {
        val topicId = topic.get("id")?.asString ?: return
        val completed = topic.get("completed")?.asBoolean ?: false

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bg_card)
            setPadding(24, 18, 24, 18)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.bottomMargin = 16
            layoutParams = lp
        }

        // Topic Header
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        val checkbox = CheckBox(this).apply {
            isChecked = completed
            buttonTintList = ContextCompat.getColorStateList(this@CourseDetailActivity, R.color.accent_primary)
            setOnCheckedChangeListener { _, checked ->
                val updates = JsonObject().apply {
                    addProperty("completed", checked)
                    if (checked) addProperty("completedDate", Helpers.getToday())
                }
                repo.updateTopic(courseId, topicId, updates)
            }
        }
        header.addView(checkbox)

        val topicName = TextView(this).apply {
            text = topic.get("name")?.asString ?: ""
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity,
                if (completed) R.color.text_muted else R.color.text_primary))
            textSize = 15f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            if (completed) paintFlags = paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        header.addView(topicName)

        // Edit/Delete/Resource buttons
        val tResBtn = TextView(this).apply {
            text = "🔗"
            textSize = 16f
            setPadding(12, 4, 12, 4)
            setOnClickListener { showResourceDialog(topicId, null) }
        }
        header.addView(tResBtn)

        val editBtn = TextView(this).apply {
            text = "✏️"
            textSize = 16f
            setPadding(12, 4, 12, 4)
            setOnClickListener { showTopicDialog(topic) }
        }
        header.addView(editBtn)

        val deleteBtn = TextView(this).apply {
            text = "🗑️"
            textSize = 16f
            setPadding(12, 4, 0, 4)
            setOnClickListener {
                AlertDialog.Builder(this@CourseDetailActivity)
                    .setTitle("Delete Topic")
                    .setMessage("Delete this topic and all subtopics?")
                    .setPositiveButton("Delete") { _, _ -> repo.deleteTopic(courseId, topicId) }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        }
        header.addView(deleteBtn)

        card.addView(header)

        // Topic Resources
        val tResources = topic.getAsJsonArray("resources") ?: JsonArray()
        for (r in 0 until tResources.size()) {
            val res = tResources[r].asJsonObject
            card.addView(renderResourceRow(topicId, null, res, 40))
        }

        // Subtopics
        val subs = topic.getAsJsonArray("subtopics") ?: JsonArray()
        for (j in 0 until subs.size()) {
            val sub = subs[j].asJsonObject
            val subId = sub.get("id")?.asString ?: continue
            val subCompleted = sub.get("completed")?.asBoolean ?: false

            val subRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                setPadding(40, 8, 0, 8)
            }

            val subCb = CheckBox(this).apply {
                isChecked = subCompleted
                buttonTintList = ContextCompat.getColorStateList(this@CourseDetailActivity, R.color.accent_tertiary)
                setOnCheckedChangeListener { _, checked ->
                    val updates = JsonObject().apply {
                        addProperty("completed", checked)
                        if (checked) addProperty("completedDate", Helpers.getToday())
                    }
                    repo.updateSubtopic(courseId, topicId, subId, updates)
                }
            }
            subRow.addView(subCb)

            val subName = TextView(this).apply {
                text = sub.get("name")?.asString ?: ""
                setTextColor(ContextCompat.getColor(this@CourseDetailActivity,
                    if (subCompleted) R.color.text_muted else R.color.text_secondary))
                textSize = 13f
                if (subCompleted) paintFlags = paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            subRow.addView(subName)

            val sResBtn = TextView(this).apply {
                text = "🔗"
                textSize = 14f
                setPadding(12, 4, 12, 4)
                setOnClickListener { showResourceDialog(topicId, subId) }
            }
            subRow.addView(sResBtn)

            card.addView(subRow)

            // Subtopic Resources
            val sResources = sub.getAsJsonArray("resources") ?: JsonArray()
            for (r in 0 until sResources.size()) {
                val res = sResources[r].asJsonObject
                card.addView(renderResourceRow(topicId, subId, res, 80))
            }
        }

        // Add subtopic button
        val addSubBtn = TextView(this).apply {
            text = "+ Add Subtopic"
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.accent_primary))
            textSize = 12f
            setPadding(40, 12, 0, 4)
            setOnClickListener { showSubtopicDialog(topicId) }
        }
        card.addView(addSubBtn)

        container.addView(card)
    }

    private fun renderResourceRow(topicId: String, subId: String?, res: JsonObject, leftPad: Int): View {
        val resRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(leftPad, 8, 0, 8)
        }
        val type = res.get("type")?.asString ?: "doc"
        val icon = TextView(this).apply {
            text = if (type == "video") "▶️" else "📄"
            textSize = 12f
            setPadding(0, 0, 8, 0)
        }
        resRow.addView(icon)

        val name = TextView(this).apply {
            text = res.get("name")?.asString ?: ""
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.accent_secondary))
            textSize = 12f
            paintFlags = paintFlags or android.graphics.Paint.UNDERLINE_TEXT_FLAG
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            setOnClickListener {
                val url = res.get("url")?.asString ?: return@setOnClickListener
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                try { startActivity(intent) } catch (e: Exception) {}
            }
        }
        resRow.addView(name)

        val delBtn = TextView(this).apply {
            text = "🗑️"
            textSize = 12f
            setPadding(12, 0, 0, 0)
            setOnClickListener {
                repo.deleteResource(courseId, topicId, subId, res.get("id").asString)
            }
        }
        resRow.addView(delBtn)
        return resRow
    }

    private fun showTopicDialog(existing: JsonObject?) {
        val isEdit = existing != null
        val input = EditText(this).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.text_primary))
            hint = "Topic name"
            setPadding(24, 18, 24, 18)
            if (isEdit) setText(existing!!.get("name")?.asString ?: "")
        }

        AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit Topic" else "Add Topic")
            .setView(input)
            .setPositiveButton("Save") { _, _ ->
                val name = input.text.toString().trim()
                if (name.isEmpty()) return@setPositiveButton
                if (isEdit) {
                    val updates = JsonObject().apply { addProperty("name", name) }
                    repo.updateTopic(courseId, existing!!.get("id").asString, updates)
                } else {
                    val topic = JsonObject().apply { addProperty("name", name) }
                    repo.addTopic(courseId, topic)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showSubtopicDialog(topicId: String) {
        val input = EditText(this).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.text_primary))
            hint = "Subtopic name"
            setPadding(24, 18, 24, 18)
        }

        AlertDialog.Builder(this)
            .setTitle("Add Subtopic")
            .setView(input)
            .setPositiveButton("Save") { _, _ ->
                val name = input.text.toString().trim()
                if (name.isEmpty()) return@setPositiveButton
                val sub = JsonObject().apply { addProperty("name", name) }
                repo.addSubtopic(courseId, topicId, sub)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showResourceDialog(topicId: String, subtopicId: String?) {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 20, 40, 20)
        }
        val nameInput = EditText(this).apply {
            hint = "Resource Name (e.g. ML Lecture)"
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.text_primary))
            setPadding(24, 18, 24, 18)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.bottomMargin = 16
            layoutParams = lp
        }
        val typeSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@CourseDetailActivity, android.R.layout.simple_spinner_dropdown_item, arrayOf("Video", "PDF/Doc"))
            setBackgroundResource(R.drawable.bg_input)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 120)
            lp.bottomMargin = 16
            layoutParams = lp
        }
        val urlRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val urlInput = EditText(this).apply {
            hint = "URL or File Path"
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.text_primary))
            setPadding(24, 18, 24, 18)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            id = View.generateViewId()
            currentResourceUrlInput = this // Safe it to a class variable
        }
        val browseBtn = Button(this).apply {
            text = "Browse"
            setTextColor(ContextCompat.getColor(this@CourseDetailActivity, R.color.white))
            setBackgroundResource(R.drawable.bg_btn_primary)
            setPadding(16, 0, 16, 0)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.MATCH_PARENT).apply { marginStart = 16 }
            setOnClickListener {
                val intent = android.content.Intent(android.content.Intent.ACTION_GET_CONTENT).apply { type = "*/*" }
                startActivityForResult(intent, 1001)
            }
        }
        urlRow.addView(urlInput)
        urlRow.addView(browseBtn)

        layout.addView(nameInput)
        layout.addView(typeSpinner)
        layout.addView(urlRow)

        AlertDialog.Builder(this, R.style.TenxBottomSheet)
            .setTitle("Add Resource")
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val name = nameInput.text.toString().trim()
                val url = urlInput.text.toString().trim()
                if (name.isEmpty() || url.isEmpty()) return@setPositiveButton

                val type = if (typeSpinner.selectedItemPosition == 0) "video" else "doc"

                val res = JsonObject().apply {
                    addProperty("name", name)
                    addProperty("type", type)
                    addProperty("url", url)
                }
                repo.addResource(courseId, topicId, subtopicId, res)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1001 && resultCode == RESULT_OK) {
            data?.data?.let { uri ->
                currentResourceUrlInput?.setText(uri.toString())
            }
        }
    }
}
