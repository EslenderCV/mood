import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
// 👇 Importamos la función que guarda el token en Appwrite (la verificaremos en el paso 3)
import { updateUserToken } from "./appwrite";

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Si no tiene permiso, lo pedimos
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ El usuario denegó el permiso de notificaciones");
      return;
    }

    // Generar el token
    // (A veces requiere projectId si usas EAS, pero intenta así primero)
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
      console.log("✅ Push Token generado:", token);
    } catch (error) {
      console.error("Error obteniendo token:", error);
      return;
    }

    // Guardar en Appwrite
    if (userId && token) {
      try {
        await updateUserToken(userId, token);
        console.log("💾 Token guardado en base de datos");
      } catch (error) {
        console.error("Error guardando token en BD:", error);
      }
    }

    return token;
  } else {
    console.log("⚠️ Debes usar un dispositivo físico para Push Notifications");
  }
}
