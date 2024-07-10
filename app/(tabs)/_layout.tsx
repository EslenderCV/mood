import { Image } from "react-native";
import React, { useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TabsLayout = () => {
  const [setting, setSetting] = useState(false);
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#181818",
            borderTopColor: "#181818",
            height: 88,
            width: "83%",
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="home" size={30} color="#5E17EB" />
              ) : (
                <Ionicons name="home-outline" size={30} color="#5E17EB" />
              ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="compass" size={30} color="#5E17EB" />
              ) : (
                <Ionicons name="compass-outline" size={30} color="#5E17EB" />
              ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="mood"
          options={{
            title: "",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../assets/mood.png")}
                resizeMode="contain"
                className="w-7 h-7"
              />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="albums" size={30} color="#5E17EB" />
              ) : (
                <Ionicons name="albums-outline" size={30} color="#5E17EB" />
              ),
            headerShown: false,
          }}
        />
      </Tabs>

      <Ionicons
        name={setting ? "close" : "menu"}
        size={32}
        color="#5E17EB"
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          backgroundColor: "#181818",
          width: "17%",
          paddingTop: 6,
          textAlign: "center",
          height: 88,
        }}
        onPress={() => setSetting(setting ? false : true)}
      />
    </>
  );
};

export default TabsLayout;
