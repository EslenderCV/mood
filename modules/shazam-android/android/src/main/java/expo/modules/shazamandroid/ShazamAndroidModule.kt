package expo.modules.shazamandroid

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.shazam.shazamkit.MatchResult
import com.shazam.shazamkit.ShazamKit
import com.shazam.shazamkit.ShazamKitCatalog
import com.shazam.shazamkit.StreamingSession
import com.shazam.shazamkit.TokenResult
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class ShazamAndroidModule : Module() {

    companion object {
        private const val SAMPLE_RATE = 44100
    }

    private val bufferSize by lazy {
        AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(8192)
    }

    private val moduleScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // Estado del reconocimiento activo
    private var activeJob: Job? = null
    private var activeRecord: AudioRecord? = null
    private var activeSession: StreamingSession? = null

    override fun definition() = ModuleDefinition {
        Name("ShazamAndroid")

        // ShazamKit Android requiere mínimo API 23 (Marshmallow), siempre disponible aquí.
        Function("isAvailable") { true }

        AsyncFunction("startListening") { token: String, promise: Promise ->
            val ctx = appContext.reactContext ?: run {
                promise.reject("NO_CONTEXT", "No React context available", null)
                return@AsyncFunction
            }

            if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "Se requiere permiso de micrófono", null)
                return@AsyncFunction
            }

            // Cancelar cualquier reconocimiento previo
            stopActive()

            activeJob = moduleScope.launch {
                try {
                    // 1. Configurar ShazamKit con el Developer Token (JWT de MusicKit)
                    configureShazamKit(ctx, token)

                    // 2. Crear la sesión de streaming
                    val session = ShazamKit.createStreamingSession(
                        catalog = ShazamKitCatalog.Apple,
                        audioSampleRateHz = SAMPLE_RATE,
                        bufferSizeInBytes = bufferSize,
                    )
                    activeSession = session

                    // 3. Iniciar AudioRecord
                    val record = AudioRecord(
                        MediaRecorder.AudioSource.MIC,
                        SAMPLE_RATE,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize,
                    )

                    if (record.state != AudioRecord.STATE_INITIALIZED) {
                        promise.reject("AUDIO_INIT_FAILED", "No se pudo inicializar AudioRecord", null)
                        return@launch
                    }

                    activeRecord = record
                    record.startRecording()

                    // 4. Alimentar audio al SDK en background
                    val feedJob = launch(Dispatchers.IO) {
                        val buffer = ByteArray(bufferSize)
                        while (true) {
                            val bytesRead = record.read(buffer, 0, buffer.size)
                            if (bytesRead > 0) {
                                session.matchStream(buffer, bytesRead, System.currentTimeMillis())
                            }
                        }
                    }

                    // 5. Esperar el primer resultado del SDK (StreamingSession es un Flow)
                    var resolved = false
                    session.collect { result ->
                        if (resolved) return@collect
                        when (result) {
                            is MatchResult.Match -> {
                                resolved = true
                                feedJob.cancel()
                                val matches = result.matchedMediaItems.map { item ->
                                    mapOf<String, Any?>(
                                        "title"        to item.title,
                                        "artist"       to item.subtitle,
                                        "artworkURL"   to item.artworkURL?.toString(),
                                        "appleMusicID" to item.appleMusicID,
                                        "shazamID"     to item.shazamID,
                                    )
                                }
                                promise.resolve(matches)
                            }

                            is MatchResult.NoMatch -> {
                                // Sin coincidencia en este chunk — seguimos escuchando
                            }

                            is MatchResult.Error -> {
                                resolved = true
                                feedJob.cancel()
                                promise.reject(
                                    "SHAZAM_ERROR",
                                    result.exception.message ?: "Error de reconocimiento",
                                    result.exception,
                                )
                            }
                        }
                    }

                } catch (e: kotlinx.coroutines.CancellationException) {
                    // El usuario canceló — resolver vacío sin error
                    promise.resolve(emptyList<Any>())
                } catch (e: Exception) {
                    promise.reject("SHAZAM_ERROR", e.message ?: "Error desconocido", e)
                } finally {
                    cleanupAudio()
                }
            }
        }

        Function("stopListening") {
            stopActive()
        }

        OnDestroy {
            moduleScope.cancel()
            cleanupAudio()
        }
    }

    // ---------------------------------------------------------------------------

    /** Configura ShazamKit con el Developer Token (callback → coroutine). */
    private suspend fun configureShazamKit(context: android.content.Context, token: String) {
        suspendCancellableCoroutine { cont ->
            ShazamKit.configure(context, token) { result ->
                when (result) {
                    is TokenResult.Success -> cont.resume(Unit)
                    is TokenResult.Failure -> cont.resumeWithException(
                        Exception("ShazamKit configure failed: ${result.developerError?.message}")
                    )
                }
            }
        }
    }

    private fun stopActive() {
        activeJob?.cancel()
        activeJob = null
        cleanupAudio()
    }

    private fun cleanupAudio() {
        activeRecord?.let {
            try { it.stop() } catch (_: Exception) {}
            try { it.release() } catch (_: Exception) {}
        }
        activeRecord = null
        activeSession?.endSession()
        activeSession = null
    }
}
