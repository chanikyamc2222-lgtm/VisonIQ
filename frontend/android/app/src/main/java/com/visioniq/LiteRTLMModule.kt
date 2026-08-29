package com.visioniq

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.genai.llminference.GraphOptions
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInference.LlmInferenceOptions
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession.LlmInferenceSessionOptions
import java.io.File
import java.io.InputStream
import java.util.concurrent.Executors

class LiteRTLMModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LiteRTLMModule"

    // Single-thread executor — LlmInference is NOT thread-safe across calls
    private val executor = Executors.newSingleThreadExecutor()

    // LlmInference engine (expensive to create, cached/reused)
    private var llmEngine: LlmInference? = null
    private var loadedModelPath: String? = null

    // ─── Model File Discovery ─────────────────────────────────────────────────

    /**
     * Finds the Gemma .litertlm model — works whether it's a single file OR a directory bundle.
     * On Android 13+, getExternalStoragePublicDirectory still returns the correct path.
     */
    private fun getDefaultModelFile(): File? {
        val downloadDirs = listOf(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            File("/storage/emulated/0/Download"),
            File("/storage/emulated/0/Downloads"),
            File("/sdcard/Download"),
            reactContext.filesDir
        )
        val targetNames = listOf(
            "gemma-4-e2b-it.litertlm",
            "gemma_4_e2b_it.litertlm",
            "gemma-4-2b-it.litertlm",
            "gemma-3-4b-it.litertlm",
            "gemma.litertlm"
        )

        // Check exact names — accepts both file and directory (bundle)
        for (dir in downloadDirs) {
            for (name in targetNames) {
                val f = File(dir, name)
                if (f.exists()) return f   // ← no length check — dirs have length 0
            }
        }

        // Broad scan for any .litertlm / .task entry (file or directory) with 'gemma' in name
        for (dir in downloadDirs) {
            if (dir.exists() && dir.isDirectory) {
                val found = dir.listFiles { f ->
                    val l = f.name.lowercase()
                    (l.endsWith(".litertlm") || l.endsWith(".task")) && l.contains("gemma")
                }
                found?.firstOrNull()?.let { return it }
            }
        }
        return null
    }

    // ─── LlmInference Engine (cached, created once per model path) ───────────

    @Synchronized
    private fun getOrCreateEngine(modelFile: File): LlmInference {
        if (llmEngine != null && loadedModelPath == modelFile.absolutePath) {
            return llmEngine!!
        }
        llmEngine?.close()
        llmEngine = null

        val options = LlmInferenceOptions.builder()
            .setModelPath(modelFile.absolutePath)
            .setMaxTokens(1024)
            .build()

        llmEngine = LlmInference.createFromOptions(reactContext, options)
        loadedModelPath = modelFile.absolutePath
        return llmEngine!!
    }

    // ─── Gemma IT Prompt Format ───────────────────────────────────────────────

    /**
     * Wraps user text in Gemma instruction-tuned format.
     * Template: <start_of_turn>user\n{text}<end_of_turn>\n<start_of_turn>model\n
     */
    private fun gemmaPrompt(userText: String): String {
        return "<start_of_turn>user\n$userText<end_of_turn>\n<start_of_turn>model\n"
    }

    // ─── Image Loading ────────────────────────────────────────────────────────

    private fun loadBitmapFromUri(imageUri: String): Bitmap? {
        return try {
            val uri = Uri.parse(imageUri)
            val stream: InputStream? = when {
                imageUri.startsWith("content://") || imageUri.startsWith("file://") ->
                    reactContext.contentResolver.openInputStream(uri)
                else -> File(imageUri).inputStream()
            }
            // Scale down to max 768px on longest side to keep token count manageable
            val original = BitmapFactory.decodeStream(stream) ?: return null
            val maxDim = 768
            return if (original.width > maxDim || original.height > maxDim) {
                val ratio = maxDim.toFloat() / maxOf(original.width, original.height)
                Bitmap.createScaledBitmap(
                    original,
                    (original.width * ratio).toInt(),
                    (original.height * ratio).toInt(),
                    true
                )
            } else original
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    // ─── Run Inference via LlmInferenceSession ────────────────────────────────

    /**
     * Creates a new LlmInferenceSession, optionally with vision modality enabled.
     * Adds image + text query, collects streaming response synchronously.
     * MUST be called from a background thread (not main thread).
     */
    private fun runInference(
        engine: LlmInference,
        bitmap: Bitmap?,
        userText: String,
        timeoutSec: Long = 60
    ): String {
        val enableVision = bitmap != null

        // Build session options — enable vision only when image is provided
        val sessionOptions = LlmInferenceSessionOptions.builder()
            .setTemperature(0.8f)
            .setTopK(40)
            .setRandomSeed(101)
            .setGraphOptions(
                GraphOptions.builder()
                    .setEnableVisionModality(enableVision)
                    .build()
            )
            .build()

        val session = LlmInferenceSession.createFromOptions(engine, sessionOptions)

        try {
            // Add image BEFORE text (required order per Google docs)
            if (bitmap != null) {
                val mpImage: MPImage = BitmapImageBuilder(bitmap).build()
                session.addImage(mpImage)
            }

            // Add text query in Gemma IT format
            session.addQueryChunk(gemmaPrompt(userText))

            // Run generation (already running in background thread)
            val result = session.generateResponse()

            return result.trim().ifEmpty {
                "The model processed the input but returned an empty response. Please try rephrasing your question."
            }
        } finally {
            session.close()
        }
    }

    // ─── Check Model Status ───────────────────────────────────────────────────

    @ReactMethod
    fun checkModelStatus(promise: Promise) {
        try {
            val modelFile = getDefaultModelFile()
            val result: WritableMap = Arguments.createMap()
            result.putBoolean("exists", modelFile != null && modelFile.exists())
            result.putString("path", modelFile?.absolutePath ?: "/storage/emulated/0/Download/gemma-4-e2b-it.litertlm")
            result.putString("name", modelFile?.name ?: "gemma-4-e2b-it.litertlm")
            result.putDouble("sizeBytes", modelFile?.length()?.toDouble() ?: 0.0)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("MODEL_CHECK_ERROR", e.message, e)
        }
    }

    // ─── Analyze Image: Initial Load ─────────────────────────────────────────

    @ReactMethod
    fun analyzeImageWithLocalModel(imageUri: String, prompt: String, customModelPath: String?, promise: Promise) {
        executor.submit {
            try {
                // Resolve model file
                val modelFile = when {
                    !customModelPath.isNullOrEmpty() && File(customModelPath).exists() -> File(customModelPath)
                    else -> getDefaultModelFile()
                } ?: return@submit promise.reject("MODEL_NOT_FOUND",
                    "Gemma model file not found. Please ensure gemma-4-e2b-it.litertlm is in your Downloads folder.")

                // Load bitmap
                val bitmap = loadBitmapFromUri(imageUri)
                    ?: return@submit promise.reject("IMAGE_LOAD_ERROR",
                        "Could not decode image from: $imageUri")

                // Build the user prompt
                val userPrompt = if (prompt.isBlank())
                    "Describe this image in detail. Identify the main subject, visible text, objects, colors, and setting."
                else prompt

                // Get or create LlmInference engine
                val engine = getOrCreateEngine(modelFile)

                // Run inference via session with vision enabled
                val responseText = runInference(engine, bitmap, userPrompt)

                // Build response map
                val resultMap: WritableMap = Arguments.createMap()
                resultMap.putString("summary", responseText)
                resultMap.putString("modelUsed", modelFile.name)
                resultMap.putBoolean("isLocalInference", true)

                val responseMap: WritableMap = Arguments.createMap()
                responseMap.putString("sessionId", "gemma_${System.currentTimeMillis()}")
                responseMap.putMap("result", resultMap)
                responseMap.putString("prompt", userPrompt)

                promise.resolve(responseMap)

            } catch (e: Exception) {
                promise.reject("INFERENCE_ERROR", "Image analysis failed: ${e.message}", e)
            }
        }
    }

    // ─── Ask Chat: Follow-up Q&A ──────────────────────────────────────────────

    @ReactMethod
    fun askChatWithLocalModel(sessionId: String, message: String, imageUri: String?, promise: Promise) {
        executor.submit {
            try {
                val modelFile = getDefaultModelFile()
                    ?: return@submit promise.reject("MODEL_NOT_FOUND",
                        "Gemma model file not found. Please ensure gemma-4-e2b-it.litertlm is in your Downloads folder.")

                val question = message.ifBlank { "What can you tell me about this image?" }

                // Load image if URI provided
                val bitmap = if (!imageUri.isNullOrBlank()) loadBitmapFromUri(imageUri) else null

                // Get or create engine
                val engine = getOrCreateEngine(modelFile)

                // Run inference — with or without image
                val answer = runInference(engine, bitmap, question)

                val responseMap: WritableMap = Arguments.createMap()
                responseMap.putString("sessionId", sessionId.ifBlank { "gemma_${System.currentTimeMillis()}" })
                responseMap.putString("answer", answer)
                responseMap.putBoolean("isLocalInference", true)

                promise.resolve(responseMap)

            } catch (e: Exception) {
                promise.reject("CHAT_ERROR", "Chat inference failed: ${e.message}", e)
            }
        }
    }

    // ─── Native Speech Recognition ────────────────────────────────────────────

    private var speechRecognizer: SpeechRecognizer? = null

    @ReactMethod
    fun startSpeechRecognition(promise: Promise) {
        Handler(Looper.getMainLooper()).post {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
                    promise.reject("SPEECH_NOT_AVAILABLE", "Speech recognition is not available on this device.")
                    return@post
                }

                speechRecognizer?.destroy()
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext)

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }

                speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {}
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    override fun onError(error: Int) {
                        val msg = when (error) {
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized. Please try again."
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected."
                            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error."
                            else -> "Speech recognition error ($error)."
                        }
                        promise.reject("SPEECH_ERROR", msg)
                    }
                    override fun onResults(results: Bundle?) {
                        val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
                        val res = Arguments.createMap()
                        res.putString("text", text)
                        promise.resolve(res)
                    }
                    override fun onPartialResults(partialResults: Bundle?) {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })

                speechRecognizer?.startListening(intent)
            } catch (e: Exception) {
                promise.reject("SPEECH_EXCEPTION", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stopSpeechRecognition(promise: Promise) {
        Handler(Looper.getMainLooper()).post {
            try {
                speechRecognizer?.stopListening()
                val res = Arguments.createMap()
                res.putBoolean("stopped", true)
                promise.resolve(res)
            } catch (e: Exception) {
                promise.reject("SPEECH_STOP_ERROR", e.message, e)
            }
        }
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        llmEngine?.close()
        llmEngine = null
        speechRecognizer?.destroy()
        executor.shutdown()
    }
}
