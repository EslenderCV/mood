import { Image, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { Link, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { useGlobalContext } from "@/context/GlobalProvider";
import SettOption from "@/components/settOption";

const TabsLayout = () => {
  const [setting, setSetting] = useState(false);
  const { user } = useGlobalContext();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#181818",
            borderTopColor: "#181818",
            height: 80,
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
                <Ionicons name="home" size={27} color="#5E17EB" />
              ) : (
                <Ionicons name="home-outline" size={27} color="#5E17EB" />
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
                <Ionicons name="compass" size={27} color="#5E17EB" />
              ) : (
                <Ionicons name="compass-outline" size={27} color="#5E17EB" />
              ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="mood"
          options={{
            title: "",
            tabBarIcon: () => (
              <Image
                source={require("../../assets/mood.png")}
                resizeMode="contain"
                className="w-6 h-6"
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
                <Ionicons name="albums" size={27} color="#5E17EB" />
              ) : (
                <Ionicons name="albums-outline" size={27} color="#5E17EB" />
              ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
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
          paddingTop: 17,
          textAlign: "center",
          height: 80,
        }}
        onPress={() => setSetting(setting ? false : true)}
      />

      <View
        className={`bg-black/70 absolute bottom-[88px] right-0 h-[90%] w-full  ${
          !setting ? "hidden" : ""
        }`}
      >
        <View className="bg-graysecondd w-[300px] h-[88%] p-5 absolute right-0 bottom-0 items-center">
          <Link href="/profile" onPress={() => setSetting(false)}>
            <View className="flex-row gap-3 w-full">
              <Image
                source={user?.pfp != null ? {uri: user.pfp} : require("@/assets/noPfp.jpg")}
                className="w-12 h-12 rounded-full"
                resizeMode="contain"
              />
              <View>
                <Text className="text-white font-semibold text-2xl">
                  {user?.name}
                </Text>
                <Text className="text-gray text-md">See profile</Text>
              </View>
            </View>
          </Link>
          <View className="h-[2px] w-[70%] bg-gray mt-3"></View>
          <View className="absolute bottom-2 right-0 p-5">
            <SettOption
              name="Get Plus"
              icon={<Ionicons name="diamond" color="#5E17EB" size={20} />}
            />
            <SettOption
              name="Help"
              icon={
                <Ionicons name="information-circle" color="#5E17EB" size={20} />
              }
            />
            <SettOption
              name="Notifications"
              icon={
                <Ionicons name="notifications-off" color="#5E17EB" size={20} />
              }
            />
            <SettOption
              name="Security"
              icon={<Ionicons name="shield" color="#5E17EB" size={20} />}
            />
            <SettOption
              name="Privacy"
              icon={<Ionicons name="key" color="#5E17EB" size={20} />}
            />
            <SettOption
              name="Settings"
              icon={<Ionicons name="cog" color="#5E17EB" size={20} />}
            />
          </View>
        </View>
      </View>
    </>
  );
};

export default TabsLayout;
