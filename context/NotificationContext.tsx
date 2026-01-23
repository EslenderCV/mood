import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";
import { getCurrentUser } from "@/lib/appwrite";
import { updateUserPushToken } from "@/lib/appwrite/notifications";

// 🔥 FIX TYPE SCRIPT: Usamos un bloque con 'return' y 'as ...'
Notifications.setNotificationHandler({
  handleNotification: async (_notification) => {
    return {
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior;
  },
});

const NotificationContext = createContext<any>(null);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>("");
  const [currentNotification, setCurrentNotification] =
    useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.Subscription | undefined>(
    undefined,
  );
  const responseListener = useRef<Notifications.Subscription | undefined>(
    undefined,
  );

  useEffect(() => {
    // 1. Registrar Token
    registerForPushNotificationsAsync().then(async (token) => {
      setExpoPushToken(token);
      if (token) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          await updateUserPushToken(currentUser.$id, token);
        }
      }
    });

    // 2. Escuchar Notificaciones en Primer Plano
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notificación recibida (Silenciosa en sistema):", notification);
        setCurrentNotification(notification);
        setTimeout(() => setCurrentNotification(null), 4000);
      });

    // 3. Manejar clics en notificaciones
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.url) {
          setTimeout(() => {
            router.push(data.url as any);
          }, 500);
        }
      });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, currentNotification, setCurrentNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("social-updates", {
      name: "Actividad Social",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#5E17EB",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("messages", {
      name: "Mensajes Directos",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: "#5E17EB",
      sound: "default",
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
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.log("Error obteniendo token:", e);
    }
  }

  return token;
}