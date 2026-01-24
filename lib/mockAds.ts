// Datos simulados de anuncios
export const MOCK_ADS = [
  {
    id: "ad-spotify", // ID base
    type: "ad",
    advertiserName: "Spotify",
    advertiserAvatar:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/2048px-Spotify_logo_without_text.svg.png",
    content:
      "¿Cansado de los anuncios? Pásate a Premium y disfruta de música sin interrupciones, modo offline y la mejor calidad de audio.",
    image:
      "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1000&auto=format&fit=crop",
    ctaText: "Obtén 3 meses gratis",
    url: "https://spotify.com/premium",
  },
  {
    id: "ad-nike",
    type: "ad",
    advertiserName: "Nike",
    advertiserAvatar:
      "https://c.static-nike.com/a/images/w_1920,c_limit/bzl2wmsfh7kgdkufrrjq/nike-logo.jpg",
    content:
      "La velocidad no espera. Descubre la nueva colección de running diseñada para romper tus récords.",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop",
    ctaText: "Comprar Ahora",
    url: "https://nike.com",
  },
  {
    id: "ad-uber",
    type: "ad",
    advertiserName: "Uber Eats",
    advertiserAvatar:
      "https://seeklogo.com/images/U/uber-eats-logo-CA3BA2098B-seeklogo.com.png",
    content:
      "Tu comida favorita, entregada en la puerta de tu casa. Usa el código MOOD para envío gratis.",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1000&auto=format&fit=crop",
    ctaText: "Pedir Ahora",
    url: "https://ubereats.com",
  },
];

// Función para mezclar posts y anuncios
export const injectAdsInFeed = (feedItems: any[]) => {
  if (!feedItems || feedItems.length === 0) return [];

  // Creamos una copia para no mutar el original
  const feedWithAds = [...feedItems];
  let adIndex = 0;

  // Insertar un anuncio cada 7 elementos (posts/canciones)
  // Empezamos en el índice 4 para que no salga un anuncio tan arriba
  for (let i = 4; i < feedWithAds.length; i += 7) {
    if (adIndex < MOCK_ADS.length) {
      // 🔥 CORRECCIÓN CLAVE:
      // Creamos un NUEVO objeto copiando los datos del anuncio
      // pero asignándole un ID ÚNICO basado en la posición 'i'.
      // Ejemplo: "ad-spotify-4", "ad-nike-11", etc.
      const uniqueAd = {
        ...MOCK_ADS[adIndex],
        id: `${MOCK_ADS[adIndex].id}-${i}`, // ID único garantizado
      };

      feedWithAds.splice(i, 0, uniqueAd);

      // Ciclar los anuncios
      adIndex = (adIndex + 1) % MOCK_ADS.length;
    }
  }
  return feedWithAds;
};
