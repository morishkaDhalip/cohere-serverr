package com.fake.cohere_serverr

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.LiveData
import kotlinx.coroutines.launch
import com.fake.cohere_serverr.QueryRequest

class ChatViewModel : ViewModel() {
    private val _chatState = MutableLiveData<String>()
    val chatState: LiveData<String> = _chatState

    fun sendQuery(userInput: String) {
        viewModelScope.launch {
            try {
                // Use QueryRequest directly, matching your server's { "prompt": "..." } payload
                val resp = RetrofitClient.chatApi.sendQuery(QueryRequest(userInput))

                if (resp.isSuccessful) {
                    // Pull from the "text" field of your response JSON
                    _chatState.value = resp.body()?.text ?: "No answer"
                } else {
                    _chatState.value = "Error ${resp.code()}"
                }
            } catch (e: Exception) {
                _chatState.value = "Network error: ${e.localizedMessage}"
            }
        }
    }
}
