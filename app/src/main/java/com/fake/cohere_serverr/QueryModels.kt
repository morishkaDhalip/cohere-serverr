package com.fake.cohere_serverr

class QueryModels {

    data class QueryRequest(val query: String)
    data class QueryResponse(val answer: String)
}