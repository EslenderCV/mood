import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButtom from "@/components/CustomButtom";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { createUser } from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Models } from "react-native-appwrite";

const signUp = () => {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const { setUser, setLoggedIn } = useGlobalContext();
  const [passwordShow, setPasswordShow] = React.useState(true);

  const submit = async () => {
    if (
      !form.email.trim() ||
      !form.password.trim() ||
      !form.name.trim() ||
      !form.username.trim()
    ) {
      Alert.alert("Error", "Please fill in all the fields!");
    } else {
      try {
        const result = (await createUser(
          form.email,
          form.password,
          form.name,
          form.username
        )) as Models.Document;

        setUser(result);
        setLoggedIn(true);

        router.replace("/home");
      } catch (error) {
        Alert.alert("Error", "Something happened, please try again!");
      }
    }
  };

  return (
    <SafeAreaView className="bg-black h-full">
      <ScrollView>
        <View className="w-full items-center h-full">
          <Image
            source={require("@/assets/fullLogo.png")}
            className="w-[150px] h-[150px]"
            resizeMode="contain"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={(e) => setForm({ ...form, name: e })}
            value={form.name}
            placeholder="Name"
            className="text-sm mt-62 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border-2 border-gray/20 focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={(e) => setForm({ ...form, username: e })}
            value={form.username}
            placeholder="Username"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border-2 border-gray/20 focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={(e) => setForm({ ...form, email: e })}
            value={form.email}
            placeholder="Email address"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border-2 border-gray/20 focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            secureTextEntry={passwordShow}
            onChangeText={(e) => setForm({ ...form, password: e })}
            value={form.password}
            placeholder="Password"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border-2 border-gray/20 focus:border-primaryy"
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPasswordShow(passwordShow ? false : true)}
          >
            <View className="relative bottom-[30px] left-[130px]">
              <Ionicons
                name={!passwordShow ? "eye-outline" : "eye-off-outline"}
                color="#6D6D6D"
                size={20}
              />
            </View>
          </TouchableOpacity>
          <CustomButtom
            text="CREATE ACCOUNT"
            handlePress={submit}
            containerStyles="w-[300px] mt-4 bg-primaryy"
            textStyles="text-white"
          />
          <View className="flex-row justify-center items-center w-full gap-3 mt-2">
            <View className="bg-gray w-[130px] h-[1px]"></View>
            <Text className="text-gray">OR</Text>
            <View className="bg-gray w-[130px] h-[1px]"></View>
          </View>
          <View className="mt-6 items-center justify-center">
            <TouchableOpacity
              activeOpacity={0.7}
              className={`rounded h-[40px] justify-center items-center bg-white w-[300px] flex-row`}
            >
              <View className="absolute left-3">
                <Ionicons name="logo-apple" size={20} />
              </View>
              <Text className={`text-primaryy text-base text-black font-bold`}>
                Sign up with Apple
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              className={`rounded h-[40px] justify-center items-center bg-white w-[300px] mt-4 flex-row`}
            >
              <View className="absolute left-3">
                <Ionicons name="logo-google" size={20} />
              </View>
              <Text className={`text-primaryy text-base text-black font-bold`}>
                Sign up with Google
              </Text>
            </TouchableOpacity>
            <View className="mt-4 flex-row items-center justify-center">
              <Text className="text-white">Already have an account? </Text>
              <Link href="/signIn">
                <Text className="text-primaryy font-bold">Sign in</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusBar backgroundColor="black" style="light" />
    </SafeAreaView>
  );
};

export default signUp;
