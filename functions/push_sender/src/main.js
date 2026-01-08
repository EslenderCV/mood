const sdk = require("node-appwrite");

// Esta función se ejecuta cada vez que se crea una notificación en la BD
module.exports = async ({ req, res, log, error }) => {
  // 1. Inicializar Cliente (Usando la sintaxis clásica sdk.Client)
  const client = new sdk.Client()
    .setEndpoint(
      process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
    )
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const messaging = new sdk.Messaging(client);

  try {
    // 2. PARSEO DEL BODY
    let notificationDoc = req.body;

    // Si llega como string, lo convertimos
    if (typeof req.body === "string") {
      if (!req.body) {
        return res.json({ message: "Prueba manual vacía detectada." });
      }
      try {
        notificationDoc = JSON.parse(req.body);
      } catch (e) {
        log("⚠️ Error parseando JSON, usando body crudo.");
      }
    }

    // Si es prueba manual {}
    if (!notificationDoc || !notificationDoc.userId) {
      log("ℹ️ Sistema listo. Esperando datos reales.");
      return res.json({ status: "ok", message: "Funcionando correctamente" });
    }

    // 3. Variables
    const receiverId = notificationDoc.userId;
    const messageBody = notificationDoc.message || "Nueva notificación";
    const senderName = notificationDoc.senderName || "Mood App";

    log(`🔔 Enviando a: ${receiverId}`);

    // 4. Enviar Push
    const result = await messaging.createPush(
      sdk.ID.unique(), // ID único
      "Mood", // Título
      `${senderName}: ${messageBody}`, // Mensaje
      [], // Topics
      [receiverId] // Usuarios destino
    );

    log("✅ ¡Enviado!");
    return res.json({ success: true, data: result });
  } catch (err) {
    error("🔴 Error: " + err.message);
    return res.json({ error: err.message }, 500);
  }
};
