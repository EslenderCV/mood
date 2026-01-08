import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client, Messaging, ID } = require("node-appwrite");

export default async ({ req, res, log, error }) => {
  // 1. Inicializar SDK
  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
    ) // <--- 2. Protección por si la variable no existe
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const messaging = new Messaging(client);

  try {
    // 3. PARSEO SEGURO DEL BODY (Vital para que lea los datos reales)
    let notificationDoc = req.body;

    // Si llega como texto (string), lo convertimos a objeto JSON
    if (typeof req.body === "string") {
      try {
        notificationDoc = JSON.parse(req.body);
      } catch (e) {
        return res.json({ error: "El body no es un JSON válido" });
      }
    }

    // Validación básica
    if (!notificationDoc) {
      return res.json({ error: "No llegaron datos en el evento" });
    }

    // 4. Extraer variables
    const receiverId = notificationDoc.userId;
    const messageBody = notificationDoc.message;
    const senderName = notificationDoc.senderName || "Mood App";

    // Log para depuración (Lo verás en la consola de Appwrite)
    log(`Procesando notificación para: ${receiverId}`);
    log(`Mensaje: ${messageBody}`);

    // Evitar enviarse notificación a uno mismo
    // (Asegúrate que en tu BD 'senderId' exista, si no, borra este if)
    if (notificationDoc.senderId && notificationDoc.senderId === receiverId) {
      return res.json({ result: "Auto-notificación ignorada" });
    }

    // 5. Enviar la Push Notification
    const result = await messaging.createPush(
      ID.unique(), // Message ID
      "Mood", // Título de la notificación
      `${senderName}: ${messageBody}`, // Cuerpo: "Elz: le gustó tu post"
      [], // Topics (vacío)
      [receiverId] // Users (Array con el ID del usuario destino)
    );

    return res.json({ success: true, result });
  } catch (err) {
    error("Error fatal enviando push: " + err.message);
    return res.json({ error: err.message });
  }
};
