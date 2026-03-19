package com.example.myapplication.ui.research

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.utils.Helpers
import com.github.mikephil.charting.charts.PieChart
import com.github.mikephil.charting.data.*
import com.google.gson.JsonObject

class ResearchActivity : AppCompatActivity() {

    private lateinit var repo: DataRepository
    private lateinit var adapter: PaperAdapter
    private lateinit var recycler: RecyclerView
    private lateinit var emptyState: View
    private lateinit var pieChart: PieChart
    private lateinit var totalText: TextView
    private lateinit var completedText: TextView
    private lateinit var avgText: TextView
    private var searchQuery = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repo = DataRepository.getInstance(applicationContext)

        val root = ScrollView(this).apply {
            setBackgroundColor(ContextCompat.getColor(this@ResearchActivity, R.color.bg_primary))
            isFillViewport = true
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 32)
        }
        root.addView(content)
        setContentView(root)

        buildHeader(content)
        buildAnalytics(content)
        buildList(content)

        repo.papers.observe(this) { applyFilters() }
    }

    private fun buildHeader(parent: LinearLayout) {
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(32, 32, 32, 16)
        }

        val backBtn = TextView(this).apply {
            text = "←"
            setTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.accent_primary))
            textSize = 22f
            setPadding(0, 0, 24, 0)
            setOnClickListener { finish() }
        }
        header.addView(backBtn)

        val title = TextView(this).apply {
            text = getString(R.string.research_papers)
            setTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.text_primary))
            textSize = 22f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        header.addView(title)

        val addBtn = Button(this).apply {
            text = "+ Add"
            setTextColor(Color.WHITE)
            setBackgroundResource(R.drawable.bg_btn_primary)
            textSize = 13f
            setPadding(32, 12, 32, 12)
            setOnClickListener { showPaperDialog(null) }
        }
        header.addView(addBtn)
        parent.addView(header)

        // Search
        val searchWrap = LinearLayout(this).apply {
            setPadding(32, 0, 32, 16)
        }
        val searchInput = EditText(this).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.text_primary))
            setHintTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.text_muted))
            hint = getString(R.string.search_papers)
            textSize = 13f
            setPadding(24, 16, 24, 16)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {
                    searchQuery = s.toString().trim().lowercase()
                    applyFilters()
                }
                override fun afterTextChanged(s: Editable?) {}
            })
        }
        searchWrap.addView(searchInput)
        parent.addView(searchWrap)
    }

    private fun buildAnalytics(parent: LinearLayout) {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundResource(R.drawable.bg_card_glass)
            setPadding(24, 20, 24, 20)
            gravity = android.view.Gravity.CENTER_VERTICAL
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.setMargins(32, 0, 32, 20)
            layoutParams = lp
        }

        // Pie Chart
        pieChart = PieChart(this).apply {
            layoutParams = LinearLayout.LayoutParams(180, 180)
            setUsePercentValues(false)
            description.isEnabled = false
            legend.isEnabled = false
            setDrawEntryLabels(false)
            isDrawHoleEnabled = true
            holeRadius = 65f
            setHoleColor(Color.TRANSPARENT)
            setTransparentCircleAlpha(0)
            setEntryLabelColor(Color.WHITE)
        }
        card.addView(pieChart)

        // Stats
        val statsCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 0, 0, 0)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        totalText = TextView(this).apply {
            setTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.text_primary))
            textSize = 14f
        }
        completedText = TextView(this).apply {
            setTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.success))
            textSize = 14f
        }
        avgText = TextView(this).apply {
            setTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.accent_primary))
            textSize = 14f
        }
        statsCol.addView(totalText)
        statsCol.addView(completedText)
        statsCol.addView(avgText)
        card.addView(statsCol)
        parent.addView(card)
    }

    private fun buildList(parent: LinearLayout) {
        adapter = PaperAdapter(
            onEdit = { showPaperDialog(it) },
            onDelete = { paper ->
                val id = paper.get("id")?.asString ?: return@PaperAdapter
                AlertDialog.Builder(this)
                    .setTitle("Delete Paper")
                    .setMessage("Are you sure?")
                    .setPositiveButton("Delete") { _, _ -> repo.deletePaper(id) }
                    .setNegativeButton("Cancel", null)
                    .show()
            },
            onOpenUrl = { paper ->
                val url = paper.get("url")?.asString ?: return@PaperAdapter
                if (url.isNotEmpty()) {
                    try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                }
            }
        )

        recycler = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@ResearchActivity)
            this.adapter = this@ResearchActivity.adapter
            setPadding(32, 0, 32, 0)
            clipToPadding = false
            isNestedScrollingEnabled = false
        }
        parent.addView(recycler)

        // Empty state
        emptyState = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 64, 0, 64)
            visibility = View.GONE
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            layoutParams = lp
        }
        val emptyIcon = TextView(this).apply {
            text = "📄"
            textSize = 44f
            gravity = android.view.Gravity.CENTER
        }
        val emptyText = TextView(this).apply {
            text = getString(R.string.no_papers_found)
            setTextColor(ContextCompat.getColor(this@ResearchActivity, R.color.text_secondary))
            textSize = 16f
            gravity = android.view.Gravity.CENTER
        }
        (emptyState as LinearLayout).addView(emptyIcon)
        (emptyState as LinearLayout).addView(emptyText)
        parent.addView(emptyState)
    }

    private fun applyFilters() {
        var list = repo.papers.value ?: emptyList()
        if (searchQuery.isNotEmpty()) {
            list = list.filter {
                (it.get("name")?.asString ?: "").lowercase().contains(searchQuery) ||
                (it.get("author")?.asString ?: "").lowercase().contains(searchQuery)
            }
        }
        adapter.submitList(list)
        emptyState.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        recycler.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
        updateAnalytics()
    }

    private fun updateAnalytics() {
        val papers = repo.papers.value ?: emptyList()
        val total = papers.size
        val completed = papers.count { (it.get("completionPercentage")?.asInt ?: 0) >= 100 }
        val avg = if (total > 0) papers.sumOf { it.get("completionPercentage")?.asInt ?: 0 } / total else 0

        totalText.text = "📊 Total: $total papers"
        completedText.text = "✅ Completed: $completed"
        avgText.text = "📈 Avg Progress: $avg%"

        // Pie chart
        val entries = listOf(
            PieEntry(completed.toFloat(), "Done"),
            PieEntry((total - completed).toFloat(), "In Progress")
        )
        val dataSet = PieDataSet(entries, "").apply {
            colors = listOf(
                ContextCompat.getColor(this@ResearchActivity, R.color.success),
                ContextCompat.getColor(this@ResearchActivity, R.color.bg_tertiary)
            )
            setDrawValues(false)
        }
        pieChart.data = PieData(dataSet)
        pieChart.centerText = "$completed/$total"
        pieChart.setCenterTextColor(ContextCompat.getColor(this, R.color.text_primary))
        pieChart.setCenterTextSize(14f)
        pieChart.invalidate()
    }

    private fun showPaperDialog(existing: JsonObject?) {
        val isEdit = existing != null
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_paper, null)
        val nameInput = dialogView.findViewById<EditText>(R.id.paperNameInput)
        val authorInput = dialogView.findViewById<EditText>(R.id.authorInput)
        val urlInput = dialogView.findViewById<EditText>(R.id.paperUrlInput)
        val notesInput = dialogView.findViewById<EditText>(R.id.notesInput)
        val slider = dialogView.findViewById<SeekBar>(R.id.completionSlider)
        val label = dialogView.findViewById<TextView>(R.id.completionLabel)

        slider.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(s: SeekBar?, p: Int, u: Boolean) { label.text = "$p%" }
            override fun onStartTrackingTouch(s: SeekBar?) {}
            override fun onStopTrackingTouch(s: SeekBar?) {}
        })

        if (isEdit) {
            nameInput.setText(existing!!.get("name")?.asString ?: "")
            authorInput.setText(existing.get("author")?.asString ?: "")
            urlInput.setText(existing.get("url")?.asString ?: "")
            notesInput.setText(existing.get("notes")?.asString ?: "")
            val pct = existing.get("completionPercentage")?.asInt ?: 0
            slider.progress = pct
            label.text = "$pct%"
        }

        AlertDialog.Builder(this)
            .setTitle(if (isEdit) getString(R.string.edit_paper) else getString(R.string.add_paper))
            .setView(dialogView)
            .setPositiveButton(getString(R.string.save)) { _, _ ->
                val name = nameInput.text.toString().trim()
                if (name.isEmpty()) return@setPositiveButton
                if (isEdit) {
                    val updates = JsonObject().apply {
                        addProperty("name", name)
                        addProperty("author", authorInput.text.toString().trim())
                        addProperty("url", urlInput.text.toString().trim())
                        addProperty("notes", notesInput.text.toString().trim())
                        addProperty("completionPercentage", slider.progress)
                        addProperty("lastUpdated", Helpers.getToday())
                    }
                    repo.updatePaper(existing!!.get("id").asString, updates)
                } else {
                    val paper = JsonObject().apply {
                        addProperty("name", name)
                        addProperty("author", authorInput.text.toString().trim())
                        addProperty("url", urlInput.text.toString().trim())
                        addProperty("notes", notesInput.text.toString().trim())
                        addProperty("completionPercentage", slider.progress)
                    }
                    repo.addPaper(paper)
                }
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }
}

// ═══ Paper Adapter ═══
class PaperAdapter(
    private val onEdit: (JsonObject) -> Unit,
    private val onDelete: (JsonObject) -> Unit,
    private val onOpenUrl: (JsonObject) -> Unit
) : RecyclerView.Adapter<PaperAdapter.VH>() {

    private var items = listOf<JsonObject>()

    fun submitList(list: List<JsonObject>) {
        items = list
        notifyDataSetChanged()
    }

    override fun getItemCount() = items.size
    override fun onCreateViewHolder(parent: android.view.ViewGroup, type: Int): VH {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_paper_card, parent, false)
        return VH(view)
    }
    override fun onBindViewHolder(holder: VH, pos: Int) = holder.bind(items[pos])

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        private val name: TextView = view.findViewById(R.id.paperName)
        private val author: TextView = view.findViewById(R.id.paperAuthor)
        private val pct: TextView = view.findViewById(R.id.paperPct)
        private val progress: ProgressBar = view.findViewById(R.id.paperProgress)
        private val notes: TextView = view.findViewById(R.id.paperNotes)
        private val date: TextView = view.findViewById(R.id.paperDate)
        private val openUrl: View = view.findViewById(R.id.openUrlBtn)
        private val editBtn: View = view.findViewById(R.id.editPaperBtn)
        private val deleteBtn: View = view.findViewById(R.id.deletePaperBtn)

        fun bind(paper: JsonObject) {
            name.text = paper.get("name")?.asString ?: ""
            val authorStr = paper.get("author")?.asString ?: ""
            if (authorStr.isNotEmpty()) {
                author.text = "by $authorStr"
                author.visibility = View.VISIBLE
            } else author.visibility = View.GONE

            val p = paper.get("completionPercentage")?.asInt ?: 0
            pct.text = "$p%"
            progress.progress = p
            if (p >= 100) {
                pct.setTextColor(ContextCompat.getColor(itemView.context, R.color.success))
            } else {
                pct.setTextColor(ContextCompat.getColor(itemView.context, R.color.accent_primary))
            }

            val notesStr = paper.get("notes")?.asString ?: ""
            if (notesStr.isNotEmpty()) {
                notes.text = notesStr
                notes.visibility = View.VISIBLE
            } else notes.visibility = View.GONE

            date.text = paper.get("lastUpdated")?.asString ?: paper.get("createdDate")?.asString ?: ""

            val url = paper.get("url")?.asString ?: ""
            openUrl.visibility = if (url.isNotEmpty()) View.VISIBLE else View.GONE
            openUrl.setOnClickListener { onOpenUrl(paper) }
            editBtn.setOnClickListener { onEdit(paper) }
            deleteBtn.setOnClickListener { onDelete(paper) }
        }
    }
}
