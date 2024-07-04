import { Image } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export const TabsLayout = () => {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#181818",
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="home" size={24} color="#5E17EB" />
              ) : (
                <Ionicons name="home-outline" size={24} color="#5E17EB" />
              ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="compass" size={24} color="#5E17EB" />
              ) : (
                <Ionicons name="compass-outline" size={24} color="#5E17EB" />
              ),
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
                className="w-6 h-6"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="library" size={24} color="#5E17EB" />
              ) : (
                <Ionicons name="library-outline" size={24} color="#5E17EB" />
              ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="close" size={24} color="#5E17EB" />
              ) : (
                <Ionicons name="menu" size={24} color="#5E17EB" />
              ),
          }}
        />
      </Tabs>
    </>
  );
};
