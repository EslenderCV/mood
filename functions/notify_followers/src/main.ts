import { Client, Databases, Query, Models } from "node-appwrite";

// --- CONFIGURACIÓN ---
const CONFIG = {
  ENDPOINT: "https://nyc.cloud.appwrite.io/v1",
  PROJECT_ID: "697d0db30009f4ca4dd6",
  DATABASE_ID: "6689e7cc002bf2740136",
  USERS_COLLECTION_ID: "6962f488000f10f39b70",
  FOLLOWS_COLLECTION_ID: "6949a7500026f2cf2850",
};

// --- INTERFACES ACTUALIZADAS SEGÚN TU LOG ---
interface PostDocument extends Models.Document {
  // El log muestra que 'postedBy' es un objeto con datos del usuario
  postedBy:
    | {
        $id: string;
        username: string;
        [key: string]: any;
      }
    | string;
  description?: string;
  [key: string]: any;
}

interface FollowDocument extends Models.Document {
  followerId: string;
  followingId: string;
}

interface UserProfileDocument extends Models.Document {
  expoPushToken?: string;
  username: string;
}

interface Context {
  req: {
    body: string | object;
    headers: Record<string, string>;
  };
  res: {
    json: (data: any, statusCode?: number) => object;
    empty: () => object;
    send: (data: string, statusCode?: number) => object;
  };
  log: (message: any) => void;
  error: (message: any) => void;
}

export default async ({ req, res, log, error }: Context) => {
  const client = new Client()
    .setEndpoint(CONFIG.ENDPOINT)
    .setProject(CONFIG.PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"] as string);

  const databases = new Databases(client);

  try {
    // 1. PARSEAR EL PAYLOAD
    let post: PostDocument;
    try {
      post = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      error("Error parseando el body JSON.");
      return res.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    // 2. VALIDACIÓN (CORREGIDA)
    // Ahora validamos que exista 'postedBy' en lugar de 'creator'
    if (!post || !post.$id || !post.postedBy) {
      log(
        "⚠️ El evento no contiene datos válidos o falta el campo 'postedBy'.",
      );
      return res.json({ success: false, error: "Missing post data" }, 400);
    }

    // 3. EXTRAER DATOS DEL AUTOR (OPTIMIZADO)
    // Appwrite a veces envía el objeto expandido (tu caso) o solo el ID (string).
    let authorId: string;
    let authorName: string = "Alguien";

    if (typeof post.postedBy === "object") {
      // ¡Genial! Ya tenemos los datos, no hay que consultar la DB de nuevo.
      authorId = post.postedBy.$id;
      if (post.postedBy.username) {
        authorName = post.postedBy.username;
      }
    } else {
      // Si llega solo el string ID
      authorId = post.postedBy as string;
    }

    log(`📝 Procesando post (${post.$id}) de: ${authorName} (ID: ${authorId})`);

    // 4. BUSCAR SEGUIDORES
    // Buscamos quién sigue a este ID
    const followsList = await databases.listDocuments<FollowDocument>(
      CONFIG.DATABASE_ID,
      CONFIG.FOLLOWS_COLLECTION_ID,
      [Query.equal("followedId", authorId)],
    );

    if (followsList.total === 0) {
      log("ℹ️ Este usuario no tiene seguidores. Fin.");
      return res.json({ success: true, count: 0 });
    }

    log(`👥 Encontrados ${followsList.documents.length} seguidores.`);

    // 5. RECOLECTAR TOKENS
    const messages: any[] = [];

    await Promise.all(
      followsList.documents.map(async (followDoc) => {
        try {
          // Buscamos el perfil del SEGUIDOR para obtener su token
          const followerProfile =
            await databases.getDocument<UserProfileDocument>(
              CONFIG.DATABASE_ID,
              CONFIG.USERS_COLLECTION_ID,
              followDoc.followerId,
            );

          if (followerProfile && followerProfile.expoPushToken) {
            messages.push({
              to: followerProfile.expoPushToken,
              sound: "default",
              title: `Nuevo Mood de ${authorName} 🔥`,
              body: post.description ? post.description : "¡Entra para verlo!",
              data: {
                type: "post",
                postId: post.$id,
                url: `/post/${post.$id}`,
              },
            });
          }
        } catch (err: any) {
          log(
            `⚠️ Error perfil seguidor ${followDoc.followerId}: ${err.message}`,
          );
        }
      }),
    );

    if (messages.length === 0) {
      log("ℹ️ Hay seguidores, pero ninguno tiene Push Token configurado.");
      return res.json({ success: true, sent: 0 });
    }

    // 6. ENVIAR A EXPO
    log(`🚀 Enviando ${messages.length} notificaciones a Expo...`);

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await expoResponse.json();
    log(`✅ Resultado Expo: ${JSON.stringify(result)}`);

    return res.json({ success: true, sent: messages.length, result });
  } catch (err: any) {
    error("🔴 Error fatal: " + err.message);
    return res.json({ error: err.message }, 500);
  }
};
