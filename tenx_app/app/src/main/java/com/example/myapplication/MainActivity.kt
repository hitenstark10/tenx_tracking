package com.example.myapplication

import android.content.Intent
import android.os.Bundle
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.example.myapplication.data.DataRepository
import com.example.myapplication.data.PrefsManager
import com.example.myapplication.ui.auth.AuthActivity
import com.example.myapplication.ui.profile.ProfileActivity
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: PrefsManager
    private lateinit var repo: DataRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        prefs = PrefsManager(this)
        if (!prefs.isLoggedIn()) {
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_main)

        repo = DataRepository.getInstance(applicationContext)
        val userId = prefs.getUserId() ?: ""
        if (userId.isNotEmpty()) {
            repo.initialize(userId)
        }

        setupNavigation()
        setupTopBar()
    }

    private fun setupNavigation() {
        val navHost = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHost.navController
        val bottomNav = findViewById<BottomNavigationView>(R.id.bottom_nav)
        bottomNav.setupWithNavController(navController)

        // Update top bar title on navigation change
        val topBarTitle = findViewById<TextView>(R.id.topBarTitle)
        navController.addOnDestinationChangedListener { _, destination, _ ->
            topBarTitle.text = destination.label ?: "Dashboard"
        }
    }

    private fun setupTopBar() {
        // Set avatar initial
        val avatarText = findViewById<TextView>(R.id.profileAvatarText)
        val username = prefs.getUsername() ?: "U"
        avatarText.text = username.take(1).uppercase()

        // Update avatar from profile data
        repo.profile.observe(this) { profile ->
            val name = profile.get("displayName")?.asString
                ?: profile.get("username")?.asString
                ?: prefs.getUsername() ?: "U"
            avatarText.text = name.take(1).uppercase()
        }

        // Avatar click → Profile Activity
        val avatarContainer = findViewById<FrameLayout>(R.id.profileAvatarContainer)
        avatarContainer.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }
    }
}