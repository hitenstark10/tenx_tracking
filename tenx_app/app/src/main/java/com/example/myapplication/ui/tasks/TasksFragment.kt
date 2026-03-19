package com.example.myapplication.ui.tasks

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.app.TimePickerDialog
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
import com.example.myapplication.databinding.FragmentTasksBinding
import com.example.myapplication.utils.Helpers
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.google.gson.JsonObject
import java.util.*

class TasksFragment : Fragment() {

    private var _binding: FragmentTasksBinding? = null
    private val binding get() = _binding!!
    private lateinit var repo: DataRepository
    private lateinit var adapter: TaskAdapter

    private var selectedDate = Helpers.getToday()
    private var searchQuery = ""
    private var statusFilter = "all" // all, completed, pending
    private var priorityFilter = "all" // all, high, medium, low

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTasksBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        repo = DataRepository.getInstance(requireContext())
        
        binding.selectedDateText.text = "Tasks for: ${Helpers.formatDateShort(selectedDate)}"
        
        setupRecycler()
        setupFilters()
        setupListeners()
        setupChartsStyle()

        repo.tasks.observe(viewLifecycleOwner) { 
            applyFilters() 
            updateHeatmap()
        }
    }

    private fun setupChartsStyle() {
        // Removed
    }

    private fun setupRecycler() {
        adapter = TaskAdapter(
            onToggle = { task, isChecked ->
                val id = task.get("id")?.asString ?: return@TaskAdapter
                val updates = JsonObject().apply { addProperty("completed", isChecked) }
                repo.updateTask(id, updates)
            },
            onEdit = { task -> showTaskDialog(task) },
            onDelete = { task ->
                val id = task.get("id")?.asString ?: return@TaskAdapter
                AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
                    .setTitle(getString(R.string.delete))
                    .setMessage("Are you sure you want to delete this task?")
                    .setPositiveButton(getString(R.string.delete)) { _, _ -> repo.deleteTask(id) }
                    .setNegativeButton(getString(R.string.cancel), null)
                    .show()
            }
        )
        binding.tasksRecycler.layoutManager = LinearLayoutManager(requireContext())
        binding.tasksRecycler.adapter = adapter
    }

    private fun setupFilters() {
        // Status filter
        val statuses = arrayOf(getString(R.string.all), getString(R.string.completed), getString(R.string.pending))
        binding.statusFilter.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, statuses)
        binding.statusFilter.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                statusFilter = when(pos) {
                    0 -> "all"
                    1 -> "completed"
                    else -> "pending"
                }
                applyFilters()
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        // Priority filter
        val priorities = arrayOf(getString(R.string.all), getString(R.string.high), getString(R.string.medium), getString(R.string.low))
        binding.priorityFilter.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, priorities)
        binding.priorityFilter.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                priorityFilter = if (pos == 0) "all" else priorities[pos].lowercase()
                applyFilters()
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }
    }

    private fun setupListeners() {
        binding.addTaskBtn.setOnClickListener { showTaskDialog(null) }
        
        binding.searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {
                searchQuery = s.toString().trim().lowercase()
                applyFilters()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        binding.datePickerBtn.setOnClickListener {
            val cal = Calendar.getInstance()
            val y = cal.get(Calendar.YEAR)
            val m = cal.get(Calendar.MONTH)
            val d = cal.get(Calendar.DAY_OF_MONTH)
            
            DatePickerDialog(requireContext(), { _, year, month, day ->
                selectedDate = String.format("%04d-%02d-%02d", year, month + 1, day)
                binding.selectedDateText.text = "Tasks for: ${Helpers.formatDateShort(selectedDate)}"
                applyFilters()
            }, y, m, d).show()
        }
    }

    private fun applyFilters() {
        var list = repo.tasks.value ?: emptyList()
        
        // Date filter
        list = list.filter { it.get("date")?.asString == selectedDate }
        
        // Search filter
        if (searchQuery.isNotEmpty()) {
            list = list.filter {
                (it.get("name")?.asString ?: "").lowercase().contains(searchQuery) ||
                (it.get("description")?.asString ?: "").lowercase().contains(searchQuery)
            }
        }
        
        // Status filter
        if (statusFilter == "completed") {
            list = list.filter { it.get("completed")?.asBoolean == true }
        } else if (statusFilter == "pending") {
            list = list.filter { it.get("completed")?.asBoolean != true }
        }
        
        // Priority filter
        if (priorityFilter != "all") {
            list = list.filter { (it.get("priority")?.asString ?: "medium") == priorityFilter }
        }
        
        adapter.submitList(list)
        binding.emptyState.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        binding.tasksRecycler.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
    }

    private fun updateAnalytics() {
        // Removed
    }


    private fun updateHeatmap() {
        val tasks = repo.tasks.value ?: emptyList()
        val mapData = mutableMapOf<String, Int>()

        tasks.forEach { t ->
            if (t.get("completed")?.asBoolean == true) {
                val date = t.get("date")?.asString ?: return@forEach
                mapData[date] = (mapData[date] ?: 0) + 1
            }
        }

        binding.taskHeatmap.setData(mapData)
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

        var dialogDate = selectedDate
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
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

// ═══ Task Adapter ═══
class TaskAdapter(
    private val onToggle: (JsonObject, Boolean) -> Unit,
    private val onEdit: (JsonObject) -> Unit,
    private val onDelete: (JsonObject) -> Unit
) : RecyclerView.Adapter<TaskAdapter.VH>() {

    private var items = listOf<JsonObject>()

    fun submitList(list: List<JsonObject>) {
        items = list
        notifyDataSetChanged()
    }

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, type: Int): VH {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_task_card, parent, false)
        return VH(view)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        private val cb: CheckBox = view.findViewById(R.id.taskCheckbox)
        private val name: TextView = view.findViewById(R.id.taskName)
        private val desc: TextView = view.findViewById(R.id.taskDesc)
        private val priority: TextView = view.findViewById(R.id.taskPriority)
        private val time: TextView = view.findViewById(R.id.taskTime)
        private val date: TextView = view.findViewById(R.id.taskDate)
        private val editBtn: View = view.findViewById(R.id.editTaskBtn)
        private val deleteBtn: View = view.findViewById(R.id.deleteTaskBtn)

        fun bind(task: JsonObject) {
            cb.setOnCheckedChangeListener(null)
            cb.isChecked = task.get("completed")?.asBoolean ?: false
            name.text = task.get("name")?.asString ?: ""

            if (cb.isChecked) {
                name.paintFlags = name.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                name.setTextColor(ContextCompat.getColor(itemView.context, R.color.text_muted))
            } else {
                name.paintFlags = name.paintFlags and android.graphics.Paint.STRIKE_THRU_TEXT_FLAG.inv()
                name.setTextColor(ContextCompat.getColor(itemView.context, R.color.text_primary))
            }

            val descStr = task.get("description")?.asString ?: ""
            if (descStr.isNotEmpty()) {
                desc.text = descStr
                desc.visibility = View.VISIBLE
            } else desc.visibility = View.GONE

            val p = task.get("priority")?.asString ?: "medium"
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

            val st = task.get("startTime")?.asString ?: ""
            val et = task.get("endTime")?.asString ?: ""
            if (st.isNotEmpty() || et.isNotEmpty()) {
                time.text = "$st - $et"
                time.visibility = View.VISIBLE
            } else {
                time.visibility = View.GONE
            }

            date.text = task.get("date")?.asString ?: ""

            cb.setOnCheckedChangeListener { _, isChecked -> onToggle(task, isChecked) }
            editBtn.setOnClickListener { onEdit(task) }
            deleteBtn.setOnClickListener { onDelete(task) }
        }
    }
}
