import React from "react";
import { View, Image, ImageBackground, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import CustomButtom from "@/components/CustomButtom";
import { useGlobalContext } from "@/context/GlobalProvider";

// Importamos la librería estable de animaciones
import * as Animatable from "react-native-animatable";

// Solución para los errores de TypeScript en VS Code:
// Forzamos el tipo 'any' para evitar que TS se queje de las firmas de constructor
const AnimatableView = Animatable.View as any;

const Index = () => {
  const { loading, loggedIn } = useGlobalContext();

  // Pantalla de carga mientras verificamos la sesión en Appwrite
  if (loading)
    return (
      <View className="w-full h-full bg-black justify-center items-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          className="w-[200px]"
          resizeMode="contain"
        />
      </View>
    );

  // Si ya está logueado, redirigimos al Home directamente
  if (!loading && loggedIn) return <Redirect href="/home" />;

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ImageBackground
        source={require("@/assets/onBoardingBG.jpg")}
        className="flex-1"
        resizeMode="cover"
      >
        {/* Overlays para mejorar la legibilidad del texto */}
        <View className="absolute inset-0 bg-black/40" />
        <View className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />

        <SafeAreaView className="flex-1 px-6">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="w-full h-full justify-between py-6">
              {/* LOGO: Animación de Zoom al iniciar */}
              <AnimatableView
                animation="zoomIn"
                duration={800}
                className="items-center mt-12"
              >
                <Image
                  source={require("@/assets/fullLogo.png")}
                  className="w-[160px] h-[90px]"
                  resizeMode="contain"
                />
              </AnimatableView>

              <View className="w-full mb-10">
                {/* TÍTULO: Animación de deslizamiento hacia arriba */}
                <AnimatableView animation="fadeInUp" delay={500} duration={500}>
                  <Text className="text-5xl text-white font-bold text-center tracking-tighter leading-[1.1]">
                    Vibe {"\n"}
                    <Text className="text-[#5E17EB]">Together.</Text>
                  </Text>
                </AnimatableView>

                {/* SUBTÍTULO: Aparece con un Fade suave */}
                <AnimatableView animation="fadeIn" delay={700} duration={500}>
                  <Text className="text-zinc-300 text-center text-base font-medium mt-5 px-2 leading-6">
                    La música no es solo para escuchar, es para sentirla y
                    compartirla con los tuyos.
                  </Text>
                </AnimatableView>

                {/* BOTÓN: Aparece con un rebote sutil */}
                <AnimatableView animation="bounceIn" delay={700} duration={800}>
                  <CustomButtom
                    text="Comenzar Ahora"
                    containerStyles="w-full mt-10 bg-[#5E17EB] rounded-2xl py-4 border border-white/10 shadow-xl shadow-[#5E17EB]/50"
                    textStyles="text-white font-bold text-lg tracking-wider"
                    handlePress={() => router.push("/signIn")}
                    loading={false}
                  />
                </AnimatableView>

                {/* Pie de página */}
                <AnimatableView animation="fadeIn" delay={2000}>
                  <Text className="text-zinc-500 text-[10px] mt-8 text-center uppercase tracking-widest opacity-60">
                    Mood App © 2024
                  </Text>
                </AnimatableView>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

export default Index;
