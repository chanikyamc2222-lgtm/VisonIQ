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
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.SamplerConfig
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * On-device Gemma inference backed by LiteRT-LM.
 *
 * NOTE: this deliberately uses LiteRT-LM (com.google.ai.edge.litertlm) rather than
 * MediaPipe's LlmInference. MediaPipe cannot run vision on Gemma 4 — its vision
 * executor asserts the encoder has exactly one input tensor
 * (litert_vision_executor.cc:294) and Gemma 4's encoder has several. LiteRT-LM is
 * also the runtime Google's own AI Edge Gallery ships for these .litertlm models,
 * while the MediaPipe LLM API is in maintenance-only mode.
 */
class LiteRTLMModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LiteRTLMModule"

    // Single-thread executor — the engine is not safe to drive from several threads.
    private val executor = Executors.newSingleThreadExecutor()

    // Engine load is expensive (multi-second, GBs of weights), so cache it.
    private var engine: Engine? = null
    private var loadedModelPath: String? = null

    // ─── Model File Discovery ─────────────────────────────────────────────────

    private fun getDefaultModelFile(): File? {
        val searchDirs = listOf(
            reactContext.filesDir,
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            File("/storage/emulated/0/Download"),
            File("/storage/emulated/0/Downloads"),
            File("/sdcard/Download")
        )
        val targetNames = listOf(
            "gemma-4-E2B-it.litertlm",
            "gemma-4-e2b-it.litertlm",
            "gemma-4-E4B-it.litertlm",
            "gemma-3n-E2B-it.litertlm",
            "gemma.litertlm"
        )

        for (dir in searchDirs) {
            for (name in targetNames) {
                val f = File(dir, name)
                if (f.exists()) return f
            }
        }

        // Fall back to any .litertlm in the search dirs.
        for (dir in searchDirs) {
            if (dir.exists() && dir.isDirectory) {
                val found = dir.listFiles { f -> f.name.lowercase().endsWith(".litertlm") }
                found?.firstOrNull()?.let { return it }
            }
        }
        return null
    }

    // ─── Engine (cached, created once per model path) ─────────────────────────

    @Synchronized
    private fun getOrCreateEngine(modelFile: File): Engine {
        engine?.let { if (loadedModelPath == modelFile.absolutePath) return it }

        engine?.close()
        engine = null
        loadedModelPath = null

        val config = EngineConfig(
            modelPath = modelFile.absolutePath,
            backend = Backend.CPU(),
            // visionBackend is what actually enables image input; without it the
            // engine loads but rejects any Content.ImageFile/ImageBytes.
            visionBackend = Backend.GPU(),
            maxNumTokens = 4000,
            maxNumImages = 1,
            // Writable cache dir markedly speeds up subsequent loads.
            cacheDir = reactContext.cacheDir.absolutePath,
        )

        val created = Engine(config)
        created.initialize()
        engine = created
        loadedModelPath = modelFile.absolutePath
        return created
    }

    // ─── Image Preparation ────────────────────────────────────────────────────

    /**
     * LiteRT-LM reads images from a real filesystem path, so content:// URIs are
     * decoded and re-encoded into the cache dir. Also scales down to keep the
     * image token cost sane.
     */
    private fun prepareImageFile(imageUri: String): File? {
        return try {
            val stream = when {
                imageUri.startsWith("content://") || imageUri.startsWith("file://") ->
                    reactContext.contentResolver.openInputStream(Uri.parse(imageUri))
                else -> File(imageUri).inputStream()
            }
            val original = stream.use { BitmapFactory.decodeStream(it) } ?: return null

            val maxDim = 768
            val scaled = if (original.width > maxDim || original.height > maxDim) {
                val ratio = maxDim.toFloat() / maxOf(original.width, original.height)
                Bitmap.createScaledBitmap(
                    original,
                    (original.width * ratio).toInt(),
                    (original.height * ratio).toInt(),
                    true
                ).also { if (it != original) original.recycle() }
            } else original

            val out = File(reactContext.cacheDir, "visioniq_input.jpg")
            FileOutputStream(out).use { scaled.compress(Bitmap.CompressFormat.JPEG, 90, it) }
            scaled.recycle()
            out
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    // ─── Inference ────────────────────────────────────────────────────────────

    private fun textOf(message: Message): String =
        message.contents.contents
            .filterIsInstance<Content.Text>()
            .joinToString("") { it.text }
            .trim()

    /**
     * Runs one prompt (optionally with an image) in a throwaway conversation.
     * MUST be called off the main thread — engine init and generation both block.
     */
    private fun runInference(engine: Engine, imageFile: File?, userText: String): String {
        val config = ConversationConfig(
            systemInstruction = Contents.of(
                "You are VisionIQ, a concise visual assistant. Answer directly and factually."
            ),
            samplerConfig = SamplerConfig(topK = 64, topP = 0.95, temperature = 1.0),
        )

        return engine.createConversation(config).use { conversation ->
            val contents = if (imageFile != null) {
                // Image before text, matching the documented multimodal ordering.
                Contents.of(Content.ImageFile(imageFile.absolutePath), Content.Text(userText))
            } else {
                Contents.of(Content.Text(userText))
            }

            val reply = textOf(conversation.sendMessage(contents))
            reply.ifEmpty {
                "The model returned an empty response. Please try rephrasing your question."
            }
        }
    }

    // ─── Check Model Status ───────────────────────────────────────────────────

    @ReactMethod
    fun checkModelStatus(promise: Promise) {
        try {
            val modelFile = getDefaultModelFile()
            val result: WritableMap = Arguments.createMap()
            result.putBoolean("exists", modelFile != null && modelFile.exists())
            result.putString("path", modelFile?.absolutePath ?: "/storage/emulated/0/Download/gemma-4-E2B-it.litertlm")
            result.putString("name", modelFile?.name ?: "gemma-4-E2B-it.litertlm")
            result.putDouble("sizeBytes", modelFile?.length()?.toDouble() ?: 0.0)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("MODEL_CHECK_ERROR", e.message, e)
        }
    }

    // ─── Analyze Image ────────────────────────────────────────────────────────

    @ReactMethod
    fun analyzeImageWithLocalModel(imageUri: String, prompt: String, customModelPath: String?, promise: Promise) {
        executor.submit {
            try {
                val modelFile = getDefaultModelFile()
                    ?: customModelPath?.takeIf { it.isNotEmpty() && File(it).exists() }?.let { File(it) }
                    ?: return@submit promise.reject(
                        "MODEL_NOT_FOUND",
                        "Gemma .litertlm model not found. Place gemma-4-E2B-it.litertlm in your Downloads folder."
                    )

                val imageFile = prepareImageFile(imageUri)
                    ?: return@submit promise.reject("IMAGE_LOAD_ERROR", "Could not decode image from: $imageUri")

                val userPrompt = prompt.ifBlank {
                    "Describe this image in detail. Identify the main subject, visible text, objects, colors, and setting."
                }

                val responseText = runInference(getOrCreateEngine(modelFile), imageFile, userPrompt)

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
                    ?: return@submit promise.reject(
                        "MODEL_NOT_FOUND",
                        "Gemma .litertlm model not found. Place gemma-4-E2B-it.litertlm in your Downloads folder."
                    )

                val question = message.ifBlank { "What can you tell me about this image?" }
                val imageFile = if (!imageUri.isNullOrBlank()) prepareImageFile(imageUri) else null

                val answer = runInference(getOrCreateEngine(modelFile), imageFile, question)

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
            // SpeechRecognizer can fire onError after onResults (and onError more than
            // once); settling an RN promise twice throws, so gate it.
            val settled = AtomicBoolean(false)
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
                    promise.reject("SPEECH_NOT_AVAILABLE", "Speech recognition is not available on this device.")
                    return@post
                }

                if (speechRecognizer == null) {
                    val context = currentActivity ?: reactContext
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
                }

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
                        if (!settled.compareAndSet(false, true)) return
                        val msg = when (error) {
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized. Please try again."
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected."
                            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error."
                            else -> "Speech recognition error ($error)."
                        }
                        promise.reject("SPEECH_ERROR", msg)
                    }
                    override fun onResults(results: Bundle?) {
                        if (!settled.compareAndSet(false, true)) return
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
                if (settled.compareAndSet(false, true)) {
                    promise.reject("SPEECH_EXCEPTION", e.message, e)
                }
            }
        }
    }

    @ReactMethod
    fun stopSpeechRecognition(promise: Promise) {
        Handler(Looper.getMainLooper()).post {
            try {
                // cancel(), not stopListening() — stopListening still delivers a result,
                // which would resolve the pending startSpeechRecognition promise and
                // submit a question the user already dismissed.
                speechRecognizer?.cancel()
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
        synchronized(this) {
            engine?.close()
            engine = null
            loadedModelPath = null
        }
        speechRecognizer?.destroy()
        speechRecognizer = null
        executor.shutdown()
    }
}
