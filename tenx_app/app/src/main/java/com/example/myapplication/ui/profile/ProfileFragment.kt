package com.example.myapplication.ui.profile

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.myapplication.R
import com.example.myapplication.api.RetrofitClient
import com.example.myapplication.data.DataRepository
import com.example.myapplication.data.PrefsManager
import com.example.myapplication.databinding.FragmentProfileBinding
import com.example.myapplication.ui.auth.AuthActivity
import com.example.myapplication.utils.Helpers
import com.google.gson.JsonObject
import kotlinx.coroutines.launch

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private lateinit var repo: DataRepository
    private lateinit var prefs: PrefsManager

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        repo = DataRepository.getInstance(requireContext())
        prefs = PrefsManager(requireContext())

        setupObservers()
        setupListeners()
    }

    private fun setupObservers() {
        repo.profile.observe(viewLifecycleOwner) { profile ->
            val name = profile.get("displayName")?.asString
                ?: profile.get("username")?.asString
                ?: prefs.getUsername() ?: "User"
            binding.profileName.text = name

            val email = prefs.getEmail() ?: ""
            binding.profileEmail.text = email

            binding.profileAvatar.text = name.take(1).uppercase()
        }

        repo.tasks.observe(viewLifecycleOwner) { updateStats() }
        repo.sessions.observe(viewLifecycleOwner) { updateStats() }
        repo.streak.observe(viewLifecycleOwner) { updateStats() }
    }

    private fun updateStats() {
        val tasks = repo.tasks.value ?: emptyList()
        val totalDone = tasks.count { it.get("completed")?.asBoolean == true }
        binding.statTasks.text = "$totalDone"

        val totalMin = repo.getTotalStudyMinutes()
        val hrs = totalMin / 60
        binding.statHours.text = "${hrs}h"

        val streak = repo.streak.value
        binding.statStreak.text = "${streak?.get("count")?.asInt ?: 0}"
    }

    private fun setupListeners() {
        binding.btnEditProfile.setOnClickListener { showEditProfileDialog() }
        binding.btnChangePassword.setOnClickListener { handlePasswordUpdateDialog() }
        binding.btnLogout.setOnClickListener {
            AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out") { _, _ ->
                    repo.clearAll()
                    prefs.clearAllData()
                    startActivity(Intent(requireContext(), AuthActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                    requireActivity().finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun showEditProfileDialog() {
        val profile = repo.profile.value ?: JsonObject()

        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }

        val nameInput = EditText(requireContext()).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
            hint = "Display Name"
            setText(profile.get("displayName")?.asString
                ?: profile.get("username")?.asString ?: "")
            setPadding(24, 18, 24, 18)
        }
        layout.addView(nameInput)

        AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
            .setTitle(getString(R.string.edit_profile))
            .setView(layout)
            .setPositiveButton(getString(R.string.save)) { _, _ ->
                val updates = JsonObject().apply {
                    addProperty("displayName", nameInput.text.toString().trim())
                    addProperty("username", nameInput.text.toString().trim())
                }
                repo.updateProfile(updates)
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    private fun handlePasswordUpdateDialog() {
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }

        val newPwInput = EditText(requireContext()).apply {
            setBackgroundResource(R.drawable.bg_input)
            setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
            hint = "New Password"
            setPadding(24, 18, 24, 18)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        layout.addView(newPwInput)

        AlertDialog.Builder(requireContext(), R.style.TenxBottomSheet)
            .setTitle("Change Password")
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val newPw = newPwInput.text.toString()
                if (newPw.length >= 6) {
                    executePwUpdate(newPw)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun executePwUpdate(newPw: String) {
        lifecycleScope.launch {
            try {
                val token = prefs.getAccessToken()
                RetrofitClient.instance.updatePassword(
                    "Bearer $token", mapOf("password" to newPw)
                )
            } catch (e: Exception) {}
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
