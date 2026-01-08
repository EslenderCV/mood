import sdk from "node-appwrite";

// ------------------------------------------------------------------
// 🛡️ BLOQUE DE SEGURIDAD UNIVERSAL
// Esto arregla el error "Messaging is not a constructor".
// Intenta cargar la librería de forma directa Y de forma empaquetada.
// ------------------------------------------------------------------
const Client = sdk.Client || sdk.default?.Client;
const Messaging = sdk.Messaging || sdk.default?.Messaging;
const ID = sdk.ID || sdk.default?.ID;

export default async ({ req, res, log, error }) => {
  // 1. Verificación de seguridad inicial
  if (!Client || !Messaging) {
    error(
      "❌ Error Crítico: La librería node-appwrite no se cargó correctamente."
    );
    return res.json({ error: "Library Load Failed" }, 500);
  }

  try {
    // 2. Inicializar SDK
    const client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
      )
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const messaging = new Messaging(client);

    // 3. PARSEO INTELIGENTE DEL BODY
    // Appwrite a veces manda el body como String y a veces como Objeto.
    let notificationDoc = req.body;

    if (typeof req.body === "string") {
      // Si llega vacío o es una cadena vacía
      if (!req.body) {
        return res.json({ message: "Evento vacío (Prueba manual)" });
      }
      try {
        notificationDoc = JSON.parse(req.body);
      } catch (e) {
        // Si falló el parseo, asumimos que es una prueba vacía
        log("⚠️ No se pudo parsear el JSON. Usando body tal cual.");
      }
    }

    // Si lanzamos la ejecución manual desde la consola con {}, notificationDoc estará vacío
    if (!notificationDoc || !notificationDoc.userId) {
      log(
        "ℹ️ Ejecución de prueba o sin datos de usuario. El sistema funciona."
      );
      return res.json({
        message: "Sistema operativo. Esperando eventos reales.",
      });
    }

    // 4. Extraer datos reales
    const receiverId = notificationDoc.userId;
    const messageBody =
      notificationDoc.message || "Tienes una nueva notificación";
    const senderName = notificationDoc.senderName || "Mood App";

    log(`🔔 Procesando notificación para: ${receiverId}`);

    // 5. Enviar la Push Notification
    // NOTA: createPush requiere [userId] en un array
    const result = await messaging.createPush(
      ID.unique(), // Message ID
      "Mood", // Título
      `${senderName}: ${messageBody}`, // Cuerpo
      [], // Topics (vacío)
      [receiverId] // Users (A quién se le envía)
    );

    log("✅ Notificación enviada con éxito a FCM/APNS");
    return res.json({ success: true, data: result });
  } catch (err) {
    // Si algo falla, lo registramos en los logs de Appwrite
    error("🔴 Error enviando push: " + err.message);
    return res.json({ error: err.message }, 500);
  }
};
