package com.fake.cohere_serverr

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.LiveData
import kotlinx.coroutines.launch

class ChatViewModel : ViewModel() {
    private val _chatState = MutableLiveData<String>()
    val chatState: LiveData<String> = _chatState

    fun sendQuery(userInput: String) {
        viewModelScope.launch {
            try {
                val resp = RetrofitClient.chatApi.sendQuery(QueryModels.QueryRequest(userInput))
                if (resp.isSuccessful) {
                    _chatState.value = resp.body()?.answer ?: "No answer"
                } else {
                    _chatState.value = "Error ${resp.code()}"
                }
            } catch (e: Exception) {
                _chatState.value = "Network error: ${e.localizedMessage}"
            }
        }
    }
}
