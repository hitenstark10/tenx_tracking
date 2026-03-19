package com.example.myapplication.ui.news

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
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.example.myapplication.R
import com.example.myapplication.api.RetrofitClient
import com.example.myapplication.data.DataRepository
import com.example.myapplication.data.PrefsManager
import com.example.myapplication.databinding.FragmentNewsBinding
import com.example.myapplication.utils.Helpers
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import kotlinx.coroutines.launch

class NewsFragment : Fragment() {

    private var _binding: FragmentNewsBinding? = null
    private val binding get() = _binding!!
    private lateinit var repo: DataRepository
    private lateinit var prefs: PrefsManager
    private lateinit var adapter: NewsAdapter

    private var allArticles = listOf<JsonObject>()
    private var searchQuery = ""
    private var categoryFilter = "all"
    private var stateFilter = "all" // all, bookmarked, read, unread

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentNewsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        repo = DataRepository.getInstance(requireContext())
        prefs = PrefsManager(requireContext())
        setupRecycler()
        setupFilters()
        setupListeners()
        loadNews(false)
        setupTabs()
    }
    
    private fun setupTabs() {
        val categories = listOf("All", "AI", "ML", "Deep Learning", "Data Science", "NLP")
        val tabsContainer = binding.newsTabs
        tabsContainer.removeAllViews()
        
        categories.forEachIndexed { i, cat ->
            val tab = TextView(requireContext()).apply {
                text = if(cat == "All") "🌍 All Topics" else cat
                setTextColor(if(i==0) Color.WHITE else ContextCompat.getColor(requireContext(), R.color.text_muted))
                setBackgroundResource(if(i==0) R.drawable.bg_chip_active else R.drawable.bg_chip)
                textSize = 13f
                setPadding(36, 16, 36, 16)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 16, 0)
                }
                
                setOnClickListener {
                    categoryFilter = if (cat == "All") "all" else cat.lowercase()
                    // Update visuals
                    for (i in 0 until tabsContainer.childCount) {
                        val view = tabsContainer.getChildAt(i) as TextView
                        view.setBackgroundResource(R.drawable.bg_chip)
                        view.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_muted))
                    }
                    setBackgroundResource(R.drawable.bg_chip_active)
                    setTextColor(Color.WHITE)
                    applyFilters()
                }
            }
            tabsContainer.addView(tab)
        }
    }

    private fun setupRecycler() {
        adapter = NewsAdapter(
            onOpen = { article ->
                val url = article.get("url")?.asString ?: article.get("link")?.asString ?: return@NewsAdapter
                val id = article.get("id")?.asString ?: return@NewsAdapter
                repo.markArticleRead(id)
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } catch (_: Exception) {}
            },
            onBookmark = { article ->
                repo.toggleBookmark(article)
                applyFilters()
            },
            isBookmarked = { id -> repo.isBookmarked(id) },
            isRead = { id -> repo.isArticleRead(id) }
        )
        binding.newsRecycler.layoutManager = LinearLayoutManager(requireContext())
        binding.newsRecycler.adapter = adapter
    }

    private fun setupFilters() {
        val states = arrayOf("All", "Bookmarked", "Read", "Unread")
        binding.stateFilter.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, states)
        binding.stateFilter.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                stateFilter = states[pos].lowercase()
                applyFilters()
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        binding.searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {
                searchQuery = s.toString().trim().lowercase()
                applyFilters()
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setupListeners() {
        binding.swipeRefresh.setOnRefreshListener {
            loadNews(true)
        }
    }

    private fun loadNews(forceRefresh: Boolean) {
        val cached = prefs.getNewsCache()
        val cacheDate = prefs.getNewsCacheDate()
        val today = Helpers.getToday()

        if (!forceRefresh && cached.size() > 0 && cacheDate == today) {
            allArticles = Helpers.jsonArrayToList(cached)
            applyFilters()
            binding.swipeRefresh.isRefreshing = false
            return
        }

        showLoading(true)
        lifecycleScope.launch {
            try {
                val res = RetrofitClient.instance.getNews()
                if (res.isSuccessful) {
                    val body = res.body()
                    val articles = body?.getAsJsonArray("articles")
                        ?: body?.getAsJsonArray("data")
                        ?: JsonArray()

                    for (i in 0 until articles.size()) {
                        val a = articles[i].asJsonObject
                        if (!a.has("id")) {
                            a.addProperty("id", "news_$i")
                        }
                    }

                    allArticles = Helpers.jsonArrayToList(articles)
                    prefs.saveNewsCache(articles)
                    prefs.saveNewsCacheDate(today)
                }
            } catch (e: Exception) {
                allArticles = Helpers.jsonArrayToList(cached)
            }
            showLoading(false)
            applyFilters()
            binding.swipeRefresh.isRefreshing = false
        }
    }

    private fun showLoading(show: Boolean) {
        binding.loadingIndicator.visibility = if (show) View.VISIBLE else View.GONE
        binding.newsRecycler.visibility = if (show) View.GONE else View.VISIBLE
    }

    private fun applyFilters() {
        var list = allArticles

        if (categoryFilter != "all") {
            list = list.filter { article ->
                val cat = (article.get("category")?.asString ?: "").lowercase()
                val title = (article.get("title")?.asString ?: "").lowercase()
                val summary = (article.get("summary")?.asString ?: "").lowercase()
                cat.contains(categoryFilter) || title.contains(categoryFilter) || summary.contains(categoryFilter)
            }
        }

        when (stateFilter) {
            "bookmarked" -> list = list.filter { repo.isBookmarked(it.get("id")?.asString ?: "") }
            "read" -> list = list.filter { repo.isArticleRead(it.get("id")?.asString ?: "") }
            "unread" -> list = list.filter { !repo.isArticleRead(it.get("id")?.asString ?: "") }
        }

        if (searchQuery.isNotEmpty()) {
            list = list.filter {
                (it.get("title")?.asString ?: "").lowercase().contains(searchQuery) ||
                (it.get("summary")?.asString ?: "").lowercase().contains(searchQuery) ||
                (it.get("source")?.asString ?: "").lowercase().contains(searchQuery)
            }
        }

        adapter.submitList(list)
        val showEmpty = list.isEmpty() && binding.loadingIndicator.visibility != View.VISIBLE
        binding.emptyState.visibility = if (showEmpty) View.VISIBLE else View.GONE
        binding.newsRecycler.visibility = if (showEmpty) View.GONE else View.VISIBLE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

// ═══ News Adapter ═══
class NewsAdapter(
    private val onOpen: (JsonObject) -> Unit,
    private val onBookmark: (JsonObject) -> Unit,
    private val isBookmarked: (String) -> Boolean,
    private val isRead: (String) -> Boolean
) : RecyclerView.Adapter<NewsAdapter.VH>() {

    private var items = listOf<JsonObject>()

    fun submitList(list: List<JsonObject>) {
        items = list
        notifyDataSetChanged()
    }

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, type: Int): VH {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_news_card, parent, false)
        return VH(view)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        private val image: ImageView = view.findViewById(R.id.newsImage)
        private val category: TextView = view.findViewById(R.id.newsCategory)
        private val title: TextView = view.findViewById(R.id.newsTitle)
        private val summary: TextView = view.findViewById(R.id.newsSummary)
        private val source: TextView = view.findViewById(R.id.newsSource)
        private val date: TextView = view.findViewById(R.id.newsDate)
        private val bookmarkBtn: ImageView = view.findViewById(R.id.bookmarkBtn)
        private val shareBtn: ImageView = view.findViewById(R.id.shareBtn)
        private val openBtn: Button = view.findViewById(R.id.openBtn)

        fun bind(article: JsonObject) {
            val id = article.get("id")?.asString ?: ""

            title.text = article.get("title")?.asString ?: ""
            summary.text = article.get("summary")?.asString ?: article.get("description")?.asString ?: ""
            source.text = article.get("source")?.asString ?: ""
            date.text = article.get("publishedAt")?.asString?.take(10) ?: ""
            category.text = (article.get("category")?.asString ?: "AI").uppercase()

            val imageUrl = article.get("imageUrl")?.asString
                ?: article.get("image")?.asString
                ?: article.get("urlToImage")?.asString
            if (!imageUrl.isNullOrEmpty()) {
                image.load(imageUrl) {
                    crossfade(true)
                    error(R.color.bg_tertiary)
                }
                image.visibility = View.VISIBLE
            } else {
                image.visibility = View.GONE
            }

            if (isRead(id)) {
                title.alpha = 0.6f
                itemView.alpha = 0.85f
            } else {
                title.alpha = 1f
                itemView.alpha = 1f
            }

            bookmarkBtn.setImageResource(
                if (isBookmarked(id)) android.R.drawable.btn_star_big_on
                else android.R.drawable.btn_star_big_off
            )

            bookmarkBtn.setOnClickListener { onBookmark(article) }

            shareBtn.setOnClickListener {
                val shareTitle = article.get("title")?.asString ?: ""
                val shareUrl = article.get("url")?.asString ?: article.get("link")?.asString ?: ""
                val shareText = "$shareTitle\n$shareUrl"
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, shareText)
                }
                itemView.context.startActivity(Intent.createChooser(shareIntent, "Share Article"))
            }

            openBtn.setOnClickListener { onOpen(article) }
            itemView.setOnClickListener { onOpen(article) }
        }
    }
}
