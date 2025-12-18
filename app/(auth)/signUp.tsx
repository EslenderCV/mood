import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButtom from "@/components/CustomButtom";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";

// 1. IMPORTANTE: Importar 'User' desde tu GlobalProvider
import { useGlobalContext, User } from "@/context/GlobalProvider";
import { createUser } from "@/lib/appwrite";
import { AppwriteException } from "react-native-appwrite";

const signUp = () => {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const { setUser, setLoggedIn } = useGlobalContext();
  const [passwordShow, setPasswordShow] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (
      !form.email.trim() ||
      !form.password.trim() ||
      !form.name.trim() ||
      !form.username.trim()
    ) {
      Alert.alert("Error", "Please fill in all the fields!");
      return;
    }

    try {
      setIsLoading(true);
      const result = await createUser(
        form.email,
        form.password,
        form.name,
        form.username
      );

      // 2. Aquí aplicamos el cast para que TS no se queje
      if (setUser) {
        setUser(result as unknown as User);
        setLoggedIn(true);
        router.replace("/home");
      }
    } catch (error) {
      Alert.alert("Error", (error as AppwriteException).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-black h-full">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="w-full items-center px-4 py-10">
          <Image
            source={require("@/assets/fullLogo.png")}
            className="w-[150px] h-[150px]"
            resizeMode="contain"
          />

          {/* Inputs con estilos corregidos (Cuidado con mt-62, mejor mt-6) */}
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(e) => setForm({ ...form, name: e })}
            value={form.name}
            placeholder="Name"
            placeholderTextColor="#7B7B8B"
            className="text-sm mt-6 bg-gray/40 w-[300px] h-[40px] text-white pl-4 rounded border-2 border-gray/20 focus:border-primaryy"
          />

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(e) => setForm({ ...form, username: e })}
            value={form.username}
            placeholder="Username"
            placeholderTextColor="#7B7B8B"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 rounded border-2 border-gray/20 focus:border-primaryy"
          />

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(e) => setForm({ ...form, email: e })}
            value={form.email}
            placeholder="Email address"
            placeholderTextColor="#7B7B8B"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 rounded border-2 border-gray/20 focus:border-primaryy"
          />

          <View className="mt-4 relative">
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={passwordShow}
              onChangeText={(e) => setForm({ ...form, password: e })}
              value={form.password}
              placeholder="Password"
              placeholderTextColor="#7B7B8B"
              className="text-sm bg-gray/40 w-[300px] h-[40px] text-white pl-4 rounded border-2 border-gray/20 focus:border-primaryy"
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPasswordShow(!passwordShow)}
              className="absolute right-3 top-2"
            >
              <Ionicons
                name={!passwordShow ? "eye-outline" : "eye-off-outline"}
                color="#6D6D6D"
                size={20}
              />
            </TouchableOpacity>
          </View>

          {/* 3. Aseguramos que textStyles esté presente para quitar el error rojo */}
          <CustomButtom
            text="CREATE ACCOUNT"
            handlePress={submit}
            containerStyles="w-[300px] mt-8 bg-primaryy"
            textStyles="text-white font-bold"
            loading={isLoading}
          />

          <View className="flex-row justify-center items-center w-full gap-3 mt-6">
            <View className="bg-gray/20 w-[120px] h-[1px]"></View>
            <Text className="text-gray-500">OR</Text>
            <View className="bg-gray/20 w-[120px] h-[1px]"></View>
          </View>

          <View className="mt-6 gap-4">
            <TouchableOpacity className="rounded h-[40px] justify-center items-center bg-white w-[300px] flex-row">
              <Ionicons name="logo-apple" size={20} className="mr-2" />
              <Text className="font-bold text-black">Sign up with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity className="rounded h-[40px] justify-center items-center bg-white w-[300px] flex-row">
              <Ionicons name="logo-google" size={20} className="mr-2" />
              <Text className="font-bold text-black">Sign up with Google</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-8 flex-row items-center">
            <Text className="text-white">Already have an account? </Text>
            <Link href="/signIn">
              <Text className="text-primaryy font-bold">Sign in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
};

export default signUp;
