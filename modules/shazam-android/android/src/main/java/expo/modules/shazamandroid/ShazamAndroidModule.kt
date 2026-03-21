package expo.modules.shazamandroid

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import com.shazam.shazamkit.*
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*

class ShazamAndroidModule : Module() {

  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private lateinit var catalog: Catalog
  private var currentSession: StreamingSession? = null
  private var audioRecord: AudioRecord? = null
  private var recordingThread: Thread? = null
  private var isRecording = false
  private var job: Job? = null
  private var currentPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoShazamKit")

    Function("setDeveloperToken") { token: String ->
      Log.i("ShazamKit", "setDeveloperToken called")
      val tokenProvider = DeveloperTokenProvider { DeveloperToken(token) }
      catalog = ShazamKit.createShazamCatalog(tokenProvider)
    }

    Function("isAvailable") {
      true
    }

    AsyncFunction("startListening") { promise: Promise ->
      Log.i("ShazamKit", "startListening called")

      if (currentPromise != null) {
        promise.reject("ALREADY_LISTENING", "Already listening for Shazam matches", null)
        return@AsyncFunction
      }

      currentPromise = promise

      job = CoroutineScope(Dispatchers.Unconfined).launch {
        shazamStarter(promise)
      }
    }

    AsyncFunction("stopListening") { promise: Promise ->
      Log.d("ShazamKit", "stopListening called")
      cleanup()
      promise.resolve(true)
    }
  }

  private suspend fun shazamStarter(promise: Promise) {
    try {
      when (val result = ShazamKit.createStreamingSession(
        catalog,
        AudioSampleRateInHz.SAMPLE_RATE_48000,
        8192
      )) {
        is ShazamKitResult.Success -> {
          currentSession = result.data
          CoroutineScope(Dispatchers.IO).launch {
            startRecording(promise)
          }
        }
        is ShazamKitResult.Failure -> {
          safeReject(promise, "SESSION_ERROR", result.reason.message ?: "Error creating session", null)
          return
        }
      }

      currentSession?.let { session ->
        try {
          session.recognitionResults().collect { result: MatchResult ->
            when (result) {
              is MatchResult.Match -> {
                Log.d("ShazamKit", "Match found: ${result.matchedMediaItems.size} items")
                val matches = result.matchedMediaItems.map { item ->
                  MatchedItem(
                    isrc         = item.isrc,
                    title        = item.title,
                    artist       = item.artist,
                    shazamID     = item.shazamID,
                    appleMusicID = item.appleMusicID,
                    appleMusicURL = item.appleMusicURL?.toString().orEmpty(),
                    artworkURL   = item.artworkURL?.toString().orEmpty(),
                    genres       = item.genres,
                    webURL       = item.webURL?.toString().orEmpty(),
                    subtitle     = item.subtitle,
                    videoURL     = item.videoURL?.toString(),
                    explicitContent = item.explicitContent ?: false,
                    matchOffset  = item.matchOffsetInMs?.toDouble() ?: 0.0
                  )
                }
                safeResolve(promise, matches)
                cleanup()
              }
              is MatchResult.NoMatch -> {
                Log.d("ShazamKit", "No match")
                safeReject(promise, "NO_MATCH", "No match found", null)
                cleanup()
              }
              is MatchResult.Error -> {
                Log.e("ShazamKit", "Match error: ${result.exception.message}")
                safeReject(promise, "MATCH_ERROR", result.exception.message, result.exception.cause)
                cleanup()
              }
            }
          }
        } catch (e: Exception) {
          safeReject(promise, "RECOGNITION_ERROR", e.message, e)
        }
      } ?: safeReject(promise, "SESSION_NULL", "Session is null", null)

    } catch (e: Exception) {
      Log.e("ShazamKit", "shazamStarter error: ${e.message}", e)
      safeReject(promise, "SHAZAM_ERROR", e.message, e)
    }
  }

  private fun startRecording(promise: Promise) {
    try {
      val audioFormat = AudioFormat.Builder()
        .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
        .setSampleRate(48_000)
        .build()

      audioRecord = AudioRecord.Builder()
        .setAudioSource(MediaRecorder.AudioSource.DEFAULT)
        .setAudioFormat(audioFormat)
        .build()

      val bufferSize = AudioRecord.getMinBufferSize(
        48_000,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
      )

      if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
        safeReject(promise, "AUDIO_INIT_ERROR", "AudioRecord failed to initialize", null)
        return
      }

      audioRecord?.startRecording()
      isRecording = true

      recordingThread = Thread({
        val readBuffer = ByteArray(bufferSize)
        while (isRecording) {
          val actualRead = audioRecord!!.read(readBuffer, 0, bufferSize)
          if (actualRead > 0) {
            currentSession?.matchStream(readBuffer, actualRead, System.currentTimeMillis())
          }
        }
      }, "ShazamKit AudioRecorder").also { it.start() }

    } catch (e: Exception) {
      Log.e("ShazamKit", "startRecording error: ${e.message}", e)
      safeReject(promise, "RECORDING_ERROR", e.message, e)
    }
  }

  private fun cleanup() {
    currentPromise = null
    isRecording = false
    try {
      audioRecord?.stop()
      audioRecord?.release()
    } catch (e: Exception) {
      Log.e("ShazamKit", "cleanup error: ${e.message}")
    }
    audioRecord = null
    recordingThread = null
    job?.cancel()
  }

  private fun safeResolve(promise: Promise, result: Any?) {
    if (currentPromise == promise) {
      currentPromise = null
      promise.resolve(result)
    }
  }

  private fun safeReject(promise: Promise, code: String, message: String?, cause: Throwable?) {
    if (currentPromise == promise) {
      currentPromise = null
      promise.reject(code, message, cause)
    }
  }
}
