package com.example.myapplication.api

import com.google.gson.JsonObject
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    // ═══ Auth ═══
    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): Response<JsonObject>

    @POST("api/auth/register")
    suspend fun register(@Body body: Map<String, String>): Response<JsonObject>

    @POST("api/auth/reset-password-direct")
    suspend fun resetPassword(@Body body: Map<String, String>): Response<JsonObject>

    @POST("api/auth/update-password")
    suspend fun updatePassword(
        @Header("Authorization") token: String,
        @Body body: Map<String, String>
    ): Response<JsonObject>

    // ═══ Data Sync ═══
    @GET("api/data/{type}/{userId}")
    suspend fun fetchData(
        @Path("type") type: String,
        @Path("userId") userId: String
    ): Response<JsonObject>

    @POST("api/data/{type}/{userId}")
    suspend fun syncData(
        @Path("type") type: String,
        @Path("userId") userId: String,
        @Body body: JsonObject
    ): Response<JsonObject>

    // ═══ Quotes ═══
    @GET("api/quotes/random")
    suspend fun getRandomQuote(): Response<JsonObject>

    // ═══ News ═══
    @GET("api/news")
    suspend fun getNews(): Response<JsonObject>

    // ═══ Profile ═══
    @POST("api/profile/{userId}")
    suspend fun updateProfile(
        @Path("userId") userId: String,
        @Body body: Map<String, String>
    ): Response<JsonObject>
}
