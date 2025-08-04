package com.fake.cohere_serverr

import com.google.gson.annotations.SerializedName

data class QueryRequest(
    @SerializedName("prompt") val prompt: String
)

data class QueryResponse(
    @SerializedName("text") val text: String,
    @SerializedName("citations") val citations: List<Citation>?
)

data class Citation(
    val id: String,
    val score: Double
)
