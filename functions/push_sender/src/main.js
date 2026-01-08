import { Client, Messaging } from "node-appwrite";

// Esta función se ejecuta cada vez que se crea una notificación en la BD
export default async ({ req, res, log, error }) => {
  // 1. Inicializar el SDK de Appwrite (Modo Servidor)
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // Necesitamos crear esta llave

  const messaging = new Messaging(client);

  try {
    // 2. Leer el evento (El documento que se acaba de crear en la BD)
    // Appwrite nos envía los datos del documento en req.body
    if (!req.body) {
      return res.json({ error: "No hay cuerpo en la petición" });
    }

    // Nota: Dependiendo de la versión de Appwrite, el payload puede venir directo o serializado
    // Normalmente en triggers de BD, req.body es el documento JSON.
    const notificationDoc = req.body;

    const receiverId = notificationDoc.userId; // A quién va dirigida
    const messageBody = notificationDoc.message; // "le gustó tu post"
    const senderName = notificationDoc.senderName || "Alguien";

    // Evitar enviarse notificación a uno mismo
    if (notificationDoc.senderId === receiverId) {
      return res.json({ result: "Auto-notificación ignorada" });
    }

    log(`Enviando Push a ${receiverId}: ${senderName} ${messageBody}`);

    // 3. Enviar la Push Notification
    // createPush(messageId, title, body, topics, users)
    const result = await messaging.createPush(
      ID.unique(), // ID del mensaje
      "Mood", // Título (Puedes personalizarlo)
      `${senderName} ${messageBody}`, // Ej: "Juan le gustó tu post"
      [], // Topics (vacío)
      [receiverId] // Targets: El ID del usuario destino
    );

    return res.json({ success: true, result });
  } catch (err) {
    error("Error enviando push: " + err.message);
    return res.json({ error: err.message });
  }
};
