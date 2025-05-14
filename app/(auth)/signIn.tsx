import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButtom from "@/components/CustomButtom";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Link, router } from "expo-router";
import { getCurrentUser, signInn } from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";
import { AppwriteException } from "react-native-appwrite";

const signIn = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
  const [passwordShow, setPasswordShow] = useState(true);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert("Error", "Please fill in all the fields!");
    } else {
      try {
        setIsLoading(true);
        await signInn(form.email, form.password);

        const result = await getCurrentUser();
        setLoggedIn(true);
        // @ts-ignore
        setUser(result ? result : null);
        router.replace("/home");
      } catch (error) {
        Alert.alert("Error", (error as AppwriteException).message);
      } finally {
        setIsLoading(false);
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
            onChangeText={(text) => setForm({ ...form, email: text })}
            value={form.email}
            placeholder="Username or email address"
            className="text-sm mt-10 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border-2 border-gray/20 focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            secureTextEntry={passwordShow}
            onChangeText={(text) => setForm({ ...form, password: text })}
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
          <TouchableOpacity activeOpacity={0.7}>
            <Text className="text-primaryy -mt-2 ml-[190px] font-light">
              Forgot password?
            </Text>
          </TouchableOpacity>
          <CustomButtom
            text="SIGN IN"
            handlePress={submit}
            containerStyles="w-[300px] mt-8 bg-primaryy"
            textStyles="text-white"
            loading={isLoading}
          />
          <View className="flex-row justify-center items-center w-full gap-3 mt-6">
            <View className="bg-gray w-[130px] h-[1px]"></View>
            <Text className="text-gray">OR</Text>
            <View className="bg-gray w-[130px] h-[1px]"></View>
          </View>
          <View className="mt-14 items-center justify-center">
            <TouchableOpacity
              activeOpacity={0.7}
              className={`rounded h-[40px] justify-center items-center bg-white w-[300px] flex-row`}
            >
              <View className="absolute left-3">
                <Ionicons name="logo-apple" size={20} />
              </View>
              <Text className={`text-primaryy text-base text-black font-bold`}>
                Sign in with Apple
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
                Sign in with Google
              </Text>
            </TouchableOpacity>
            <View className="mt-4 flex-row items-center justify-center">
              <Text className="text-white">Dont have an account? </Text>
              <Link href="/signUp">
                <Text className="text-primaryy font-bold">Sign up</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusBar backgroundColor="black" style="light" />
    </SafeAreaView>
  );
};

export default signIn;
