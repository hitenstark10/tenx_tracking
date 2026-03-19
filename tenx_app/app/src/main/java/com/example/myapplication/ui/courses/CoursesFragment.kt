package com.example.myapplication.ui.courses

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.Intent
import android.graphics.Color
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
import androidx.recyclerview.widget.RecyclerView
import com.example.myapplication.R
import com.example.myapplication.data.DataRepository
import com.example.myapplication.databinding.FragmentCoursesBinding
import com.example.myapplication.utils.Helpers
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.google.gson.JsonObject
import java.util.*

class CoursesFragment : Fragment() {

    private var _binding: FragmentCoursesBinding? = null
    private val binding get() = _binding!!
    private lateinit var repo: DataRepository
    private lateinit var adapter: CourseAdapter

    private var searchQuery = ""
    private var statusFilter = "all"
    private var priorityFilter = "all"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentCoursesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        repo = DataRepository.getInstance(requireContext())
        setupRecycler()
        setupListeners()
        setupChartsStyle()

        repo.courses.observe(viewLifecycleOwner) { 
            applyFilters() 
            updateAnalytics()
        }
        repo.activityLog.observe(viewLifecycleOwner) {
            updateHeatmap()
        }
    }

    private fun setupChartsStyle() {
        val donut = binding.courseDonutChart
        donut.setUsePercentValues(true)
        donut.description.isEnabled = false
        donut.legend.isEnabled = false
        donut.isDrawHoleEnabled = true
        donut.holeRadius = 70f
        donut.setHoleColor(Color.TRANSPARENT)
        donut.setDrawEntryLabels(false)

    }

    private fun updateAnalytics() {
        val courses = repo.courses.value ?: emptyList()
        val (total, done) = Helpers.countCurriculumItems(courses)
        val pending = total - done
        
        val pct = if (total > 0) Math.round(done.toFloat() / total * 100) else 0
        binding.courseProgressRate.text = "$pct%"

        if (total == 0) {
            binding.courseDonutChart.data = null
            binding.courseDonutChart.invalidate()
            return
        }

        val entries = listOf(
            PieEntry(done.toFloat(), "Completed"),
            PieEntry(pending.toFloat(), "Pending")
        )
        val dataSet = PieDataSet(entries, "").apply {
            colors = listOf(
                ContextCompat.getColor(requireContext(), R.color.accent_primary),
                ContextCompat.getColor(requireContext(), R.color.bg_tertiary)
            )
            setDrawValues(false)
            sliceSpace = 2f
            selectionShift = 2f
        }
        binding.courseDonutChart.data = PieData(dataSet)
        binding.courseDonutChart.invalidate()
    }
    


    private fun updateHeatmap() {
        val activityLog = repo.activityLog.value ?: emptyList()
        val mapData = mutableMapOf<String, Int>()

        activityLog.forEach { entry ->
            val date = entry.get("date")?.asString ?: return@forEach
            mapData[date] = entry.get("curriculum")?.asInt ?: 0
        }

        binding.courseHeatmap.setData(mapData)
    }

    private fun setupRecycler() {
        adapter = CourseAdapter(
            onOpen = { course ->
                val intent = Intent(requireContext(), CourseDetailActivity::class.java)
                intent.putExtra("courseId", course.get("id")?.asString)
                startActivity(intent)
            },
            onEdit = { course -> showCourseDialog(course) },
            onDelete = { course ->
                val id = course.get("id")?.asString ?: return@CourseAdapter
                AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
                    .setTitle("Delete Course")
                    .setMessage("This will delete all topics and subtopics. Are you sure?")
                    .setPositiveButton("Delete") { _, _ -> repo.deleteCourse(id) }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        )
        binding.coursesRecycler.layoutManager = LinearLayoutManager(requireContext())
        binding.coursesRecycler.adapter = adapter
    }

    private fun setupListeners() {
        binding.addCourseBtn.setOnClickListener { showCourseDialog(null) }
        binding.searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {
                searchQuery = s.toString().trim().lowercase()
                applyFilters()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // Setup status filter spinner
        val statuses = arrayOf("All Status", "Completed", "In Progress", "Not Started")
        binding.statusFilter.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, statuses)
        binding.statusFilter.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                statusFilter = statuses[pos].lowercase().replace(" ", "-")
                applyFilters()
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        // Setup priority filter spinner
        val priorities = arrayOf("All Priority", "High", "Medium", "Low")
        binding.priorityFilter.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, priorities)
        binding.priorityFilter.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                priorityFilter = if (pos == 0) "all" else priorities[pos].lowercase()
                applyFilters()
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }
    }

    private fun applyFilters() {
        var list = repo.courses.value ?: emptyList()
        if (searchQuery.isNotEmpty()) {
            list = list.filter {
                (it.get("name")?.asString ?: "").lowercase().contains(searchQuery) ||
                (it.get("description")?.asString ?: "").lowercase().contains(searchQuery)
            }
        }

        // Status filter
        when (statusFilter) {
            "completed" -> list = list.filter { Helpers.getCourseProgress(it) >= 100 }
            "in-progress" -> list = list.filter { 
                val p = Helpers.getCourseProgress(it)
                p > 0 && p < 100 
            }
            "not-started" -> list = list.filter { Helpers.getCourseProgress(it) == 0 }
        }

        // Priority filter
        if (priorityFilter != "all") {
            list = list.filter {
                (it.get("priority")?.asString ?: "medium").lowercase() == priorityFilter
            }
        }

        adapter.submitList(list)
        binding.emptyState.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        binding.coursesRecycler.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
    }

    private fun showCourseDialog(existing: JsonObject?) {
        val isEdit = existing != null
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_add_course, null)
        val nameInput = dialogView.findViewById<EditText>(R.id.courseNameInput)
        val descInput = dialogView.findViewById<EditText>(R.id.courseDescInput)
        val prioritySpinner = dialogView.findViewById<Spinner>(R.id.prioritySpinner)
        val startBtn = dialogView.findViewById<Button>(R.id.startDateBtn)
        val endBtn = dialogView.findViewById<Button>(R.id.endDateBtn)

        val priorities = arrayOf("High", "Medium", "Low")
        prioritySpinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, priorities)

        var startDate = ""
        var endDate = ""

        startBtn.setOnClickListener {
            val cal = Calendar.getInstance()
            DatePickerDialog(requireContext(), { _, y, m, d ->
                startDate = String.format("%04d-%02d-%02d", y, m + 1, d)
                startBtn.text = startDate
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }

        endBtn.setOnClickListener {
            val cal = Calendar.getInstance()
            DatePickerDialog(requireContext(), { _, y, m, d ->
                endDate = String.format("%04d-%02d-%02d", y, m + 1, d)
                endBtn.text = endDate
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }

        if (isEdit) {
            nameInput.setText(existing!!.get("name")?.asString ?: "")
            descInput.setText(existing.get("description")?.asString ?: "")
            val p = existing.get("priority")?.asString ?: "medium"
            prioritySpinner.setSelection(priorities.indexOfFirst { it.lowercase() == p }.coerceAtLeast(0))
            startDate = existing.get("startDate")?.asString ?: ""
            endDate = existing.get("endDate")?.asString ?: ""
            if (startDate.isNotEmpty()) startBtn.text = startDate
            if (endDate.isNotEmpty()) endBtn.text = endDate
        }

        AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
            .setTitle(if (isEdit) getString(R.string.edit_course) else getString(R.string.add_course))
            .setView(dialogView)
            .setPositiveButton(getString(R.string.save)) { _, _ ->
                val name = nameInput.text.toString().trim()
                if (name.isEmpty()) return@setPositiveButton

                if (isEdit) {
                    val updates = JsonObject().apply {
                        addProperty("name", name)
                        addProperty("description", descInput.text.toString().trim())
                        addProperty("priority", priorities[prioritySpinner.selectedItemPosition].lowercase())
                        if (startDate.isNotEmpty()) addProperty("startDate", startDate)
                        if (endDate.isNotEmpty()) addProperty("endDate", endDate)
                    }
                    repo.updateCourse(existing!!.get("id").asString, updates)
                } else {
                    val course = JsonObject().apply {
                        addProperty("name", name)
                        addProperty("description", descInput.text.toString().trim())
                        addProperty("priority", priorities[prioritySpinner.selectedItemPosition].lowercase())
                        if (startDate.isNotEmpty()) addProperty("startDate", startDate)
                        if (endDate.isNotEmpty()) addProperty("endDate", endDate)
                    }
                    repo.addCourse(course)
                }
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

// ═══ Course Adapter ═══
class CourseAdapter(
    private val onOpen: (JsonObject) -> Unit,
    private val onEdit: (JsonObject) -> Unit,
    private val onDelete: (JsonObject) -> Unit
) : RecyclerView.Adapter<CourseAdapter.VH>() {

    private var items = listOf<JsonObject>()

    fun submitList(list: List<JsonObject>) {
        items = list
        notifyDataSetChanged()
    }

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, type: Int): VH {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_course_card, parent, false)
        return VH(view)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        private val name: TextView = view.findViewById(R.id.courseName)
        private val desc: TextView = view.findViewById(R.id.courseDesc)
        private val priority: TextView = view.findViewById(R.id.coursePriority)
        private val topicCount: TextView = view.findViewById(R.id.topicCount)
        private val subtopicCount: TextView = view.findViewById(R.id.subtopicCount)
        private val progress: ProgressBar = view.findViewById(R.id.courseProgress)
        private val progressPct: TextView = view.findViewById(R.id.courseProgressPct)
        private val dates: TextView = view.findViewById(R.id.courseDates)
        private val editBtn: View = view.findViewById(R.id.editCourseBtn)
        private val deleteBtn: View = view.findViewById(R.id.deleteCourseBtn)

        fun bind(course: JsonObject) {
            name.text = course.get("name")?.asString ?: ""

            val descStr = course.get("description")?.asString ?: ""
            if (descStr.isNotEmpty()) {
                desc.text = descStr
                desc.visibility = View.VISIBLE
            } else desc.visibility = View.GONE

            val p = course.get("priority")?.asString ?: "medium"
            priority.text = p.uppercase()
            when (p) {
                "high" -> {
                    priority.setBackgroundResource(R.drawable.bg_badge_high)
                    priority.setTextColor(ContextCompat.getColor(itemView.context, R.color.priority_high))
                }
                "medium" -> {
                    priority.setBackgroundResource(R.drawable.bg_badge_medium)
                    priority.setTextColor(ContextCompat.getColor(itemView.context, R.color.priority_medium))
                }
                else -> {
                    priority.setBackgroundResource(R.drawable.bg_badge_low)
                    priority.setTextColor(ContextCompat.getColor(itemView.context, R.color.priority_low))
                }
            }

            val topics = course.getAsJsonArray("topics")
            val tCount = topics?.size() ?: 0
            var sCount = 0
            topics?.forEach { t ->
                sCount += (t.asJsonObject.getAsJsonArray("subtopics")?.size() ?: 0)
            }
            topicCount.text = "$tCount topics"
            subtopicCount.text = "$sCount subtopics"

            val pct = Helpers.getCourseProgress(course)
            progress.progress = pct
            progressPct.text = "$pct%"

            val sd = course.get("startDate")?.asString ?: ""
            val ed = course.get("endDate")?.asString ?: ""
            dates.text = if (sd.isNotEmpty() || ed.isNotEmpty()) "$sd → $ed" else ""

            itemView.setOnClickListener { onOpen(course) }
            editBtn.setOnClickListener { onEdit(course) }
            deleteBtn.setOnClickListener { onDelete(course) }
        }
    }
}
