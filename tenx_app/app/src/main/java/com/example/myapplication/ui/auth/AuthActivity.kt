package com.example.myapplication.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.myapplication.MainActivity
import com.example.myapplication.R
import com.example.myapplication.api.RetrofitClient
import com.example.myapplication.data.PrefsManager
import com.example.myapplication.databinding.ActivityAuthBinding
import com.google.gson.JsonObject
import kotlinx.coroutines.launch

class AuthActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAuthBinding
    private lateinit var prefs: PrefsManager
    private val api = RetrofitClient.instance

    private var isSignup = false
    private var isReset = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAuthBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = PrefsManager(this)

        // Check if already logged in
        if (prefs.isLoggedIn()) {
            navigateToMain()
            return
        }

        setupListeners()
    }

    private fun setupListeners() {
        binding.submitBtn.setOnClickListener { handleSubmit() }

        binding.toggleBtn.setOnClickListener {
            isSignup = !isSignup
            isReset = false
            updateUI()
        }

        binding.forgotPasswordBtn.setOnClickListener {
            isReset = true
            isSignup = false
            updateUI()
        }
    }

    private fun updateUI() {
        binding.errorText.visibility = View.GONE
        binding.successText.visibility = View.GONE

        if (isReset) {
            binding.authTitle.text = getString(R.string.reset_password)
            binding.authSubtitle.text = getString(R.string.reset_hint)
            binding.usernameContainer.visibility = View.GONE
            binding.confirmContainer.visibility = View.GONE
            binding.forgotPasswordBtn.visibility = View.GONE
            binding.passwordLabel.text = "New Password"
            binding.submitBtn.text = getString(R.string.reset_password)
            binding.toggleText.text = ""
            binding.toggleBtn.text = getString(R.string.back_to_login)
            binding.toggleBtn.setOnClickListener {
                isReset = false
                updateUI()
                binding.toggleBtn.setOnClickListener {
                    isSignup = !isSignup
                    isReset = false
                    updateUI()
                }
            }
        } else if (isSignup) {
            binding.authTitle.text = getString(R.string.create_account)
            binding.authSubtitle.text = getString(R.string.start_journey)
            binding.usernameContainer.visibility = View.VISIBLE
            binding.confirmContainer.visibility = View.VISIBLE
            binding.forgotPasswordBtn.visibility = View.GONE
            binding.passwordLabel.text = "Password"
            binding.submitBtn.text = getString(R.string.sign_up)
            binding.toggleText.text = getString(R.string.have_account)
            binding.toggleBtn.text = getString(R.string.sign_in)
        } else {
            binding.authTitle.text = getString(R.string.welcome_back)
            binding.authSubtitle.text = getString(R.string.continue_learning)
            binding.usernameContainer.visibility = View.GONE
            binding.confirmContainer.visibility = View.GONE
            binding.forgotPasswordBtn.visibility = View.VISIBLE
            binding.passwordLabel.text = "Password"
            binding.submitBtn.text = getString(R.string.sign_in)
            binding.toggleText.text = getString(R.string.no_account)
            binding.toggleBtn.text = getString(R.string.sign_up)
        }
    }

    private fun handleSubmit() {
        val email = binding.emailInput.text.toString().trim()
        val password = binding.passwordInput.text.toString()
        val username = binding.usernameInput.text.toString().trim()
        val confirmPw = binding.confirmPasswordInput.text.toString()

        binding.errorText.visibility = View.GONE
        binding.successText.visibility = View.GONE

        when {
            isReset -> {
                if (email.isEmpty()) { showError("Email is required"); return }
                if (password.length < 6) { showError("Password must be at least 6 characters"); return }
                performReset(email, password)
            }
            isSignup -> {
                if (username.length < 2) { showError("Username must be at least 2 characters"); return }
                if (email.isEmpty()) { showError("Email is required"); return }
                if (password.length < 6) { showError("Password must be at least 6 characters"); return }
                if (password != confirmPw) { showError("Passwords do not match"); return }
                performSignup(username, email, password)
            }
            else -> {
                if (email.isEmpty()) { showError("Email is required"); return }
                if (password.isEmpty()) { showError("Password is required"); return }
                performLogin(email, password)
            }
        }
    }

    private fun performLogin(email: String, password: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val body = mapOf("email" to email, "password" to password)
                val res = api.login(body)
                if (res.isSuccessful) {
                    val data = res.body()
                    if (data != null && data.has("success") && data.get("success").asBoolean) {
                        val userObj = data.getAsJsonObject("user")
                        val sessionObj = data.getAsJsonObject("session")
                        val user = JsonObject().apply {
                            addProperty("id", userObj.get("id")?.asString ?: "")
                            addProperty("username", userObj.get("username")?.asString ?: "")
                            addProperty("email", userObj.get("email")?.asString ?: "")
                            addProperty("bio", userObj.get("bio")?.asString ?: "")
                            addProperty("profileImage", userObj.get("profileImage")?.asString ?: "")
                            addProperty("createdAt", userObj.get("createdAt")?.asString
                                ?: userObj.get("dateJoined")?.asString ?: "")
                            addProperty("accessToken", sessionObj?.get("access_token")?.asString ?: "")
                        }
                        prefs.saveUser(user)
                        navigateToMain()
                    } else {
                        showError(data?.get("error")?.asString ?: "Login failed")
                    }
                } else {
                    showError("Login failed. Check your credentials.")
                }
            } catch (e: Exception) {
                showError("Connection failed. Please check your internet.")
            }
            setLoading(false)
        }
    }

    private fun performSignup(username: String, email: String, password: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val body = mapOf("username" to username, "email" to email, "password" to password)
                val res = api.register(body)
                if (res.isSuccessful) {
                    val data = res.body()
                    if (data != null && data.has("success") && data.get("success").asBoolean) {
                        showSuccess("Account created! You can now sign in.")
                        isSignup = false
                        updateUI()
                    } else {
                        showError(data?.get("error")?.asString ?: "Signup failed")
                    }
                } else {
                    showError("Signup failed. Try a different email.")
                }
            } catch (e: Exception) {
                showError("Connection failed. Please check your internet.")
            }
            setLoading(false)
        }
    }

    private fun performReset(email: String, newPassword: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val body = mapOf("email" to email, "newPassword" to newPassword)
                val res = api.resetPassword(body)
                if (res.isSuccessful) {
                    val data = res.body()
                    if (data != null && data.has("success") && data.get("success").asBoolean) {
                        showSuccess("Password reset! You can now sign in.")
                        isReset = false
                        updateUI()
                    } else {
                        showError(data?.get("error")?.asString ?: "Reset failed")
                    }
                } else {
                    showError("Reset failed. Check your email.")
                }
            } catch (e: Exception) {
                showError("Connection failed. Please check your internet.")
            }
            setLoading(false)
        }
    }

    private fun showError(msg: String) {
        binding.errorText.text = msg
        binding.errorText.visibility = View.VISIBLE
    }

    private fun showSuccess(msg: String) {
        binding.successText.text = msg
        binding.successText.visibility = View.VISIBLE
    }

    private fun setLoading(loading: Boolean) {
        binding.loadingBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.submitBtn.isEnabled = !loading
        binding.submitBtn.alpha = if (loading) 0.5f else 1f
    }

    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
