import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ El usuario denegó el permiso de notificaciones");
      return;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
      console.log("✅ Push Token generado:", token);
    } catch (error) {
      console.error("Error obteniendo token:", error);
      return;
    }

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
