package com.fake.cohere_serverr

import okhttp3.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ChatApi {
    @POST("query")
    suspend fun sendQuery(@Body req: QueryModels.QueryRequest): Response<QueryResponse>
}