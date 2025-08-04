package com.fake.cohere_serverr

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

// Import your top‐level model classes:
 import com.fake.cohere_serverr.QueryRequest
import com.fake.cohere_serverr.QueryResponse

interface ChatApi {
    @POST("generate")
    suspend fun sendQuery(
        @Body req: QueryRequest
    ): Response<QueryResponse>
}
