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
import android.view.ViewGroup
import android.widget.*
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.utils.Helpers
import com.github.mikephil.charting.charts.PieChart
import com.github.mikephil.charting.data.*
import com.google.gson.JsonObject

class ResearchFragment : Fragment() {

    private lateinit var repo: DataRepository
    private lateinit var adapter: PaperAdapter
    private lateinit var recycler: androidx.recyclerview.widget.RecyclerView
    private lateinit var emptyState: View
    private lateinit var pieChart: PieChart
    private lateinit var totalText: TextView
    private lateinit var completedText: TextView
    private lateinit var avgText: TextView
    private var searchQuery = ""

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_research, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        repo = DataRepository.getInstance(requireContext())

        pieChart = view.findViewById(R.id.pieChart)
        totalText = view.findViewById(R.id.totalText)
        completedText = view.findViewById(R.id.completedText)
        avgText = view.findViewById(R.id.avgText)
        recycler = view.findViewById(R.id.papersRecycler)
        emptyState = view.findViewById(R.id.emptyState)

        setupPieChart()
        setupRecycler()
        setupSearch(view)
        setupAddButton(view)

        repo.papers.observe(viewLifecycleOwner) { applyFilters() }
    }

    private fun setupPieChart() {
        pieChart.apply {
            setUsePercentValues(false)
            description.isEnabled = false
            legend.isEnabled = false
            setDrawEntryLabels(false)
            isDrawHoleEnabled = true
            holeRadius = 65f
            setHoleColor(Color.TRANSPARENT)
            setTransparentCircleAlpha(0)
        }
    }

    private fun setupRecycler() {
        adapter = PaperAdapter(
            onEdit = { showPaperDialog(it) },
            onDelete = { paper ->
                val id = paper.get("id")?.asString ?: return@PaperAdapter
                AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
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
        recycler.layoutManager = LinearLayoutManager(requireContext())
        recycler.adapter = adapter
    }

    private fun setupSearch(view: View) {
        view.findViewById<EditText>(R.id.searchInput).addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {
                searchQuery = s.toString().trim().lowercase()
                applyFilters()
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setupAddButton(view: View) {
        view.findViewById<Button>(R.id.addPaperBtn).setOnClickListener {
            showPaperDialog(null)
        }
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

        val entries = listOf(
            PieEntry(completed.toFloat(), "Done"),
            PieEntry((total - completed).toFloat(), "In Progress")
        )
        val dataSet = PieDataSet(entries, "").apply {
            colors = listOf(
                ContextCompat.getColor(requireContext(), R.color.success),
                ContextCompat.getColor(requireContext(), R.color.bg_tertiary)
            )
            setDrawValues(false)
        }
        pieChart.data = PieData(dataSet)
        pieChart.centerText = "$completed/$total"
        pieChart.setCenterTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
        pieChart.setCenterTextSize(14f)
        pieChart.invalidate()
    }

    private fun showPaperDialog(existing: JsonObject?) {
        val isEdit = existing != null
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_add_paper, null)
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

        AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
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
