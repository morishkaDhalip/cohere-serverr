package com.fake.cohere_serverr


import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity

class ChatActivity : AppCompatActivity() {
    private val viewModel: ChatViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        val editQuery  = findViewById<EditText>(R.id.editQuery)
        val btnSend    = findViewById<Button>(R.id.btnSend)
        val textAnswer = findViewById<TextView>(R.id.textAnswer)

        // Observe LiveData from the ViewModel
        viewModel.chatState.observe(this) { answer ->
            textAnswer.text = answer
        }

        btnSend.setOnClickListener {
            val input = editQuery.text.toString().trim()
            if (input.isNotEmpty()) {
                viewModel.sendQuery(input)
            }
        }
    }
}

