// lib/appwrite/imageOptimizer.ts

/**
 * Transforma una URL de Appwrite Storage para obtener una versión optimizada.
 * @param url La URL original de la imagen (ej: .../files/123/view?project=...)
 * @param width Ancho deseado (default: 400)
 * @param height Alto deseado (default: 400)
 * @returns La URL optimizada o la original si no es de Appwrite.
 */
export const getOptimizedImageUrl = (
  url: string | null | undefined,
  width: number = 400,
  height: number = 400,
) => {
  if (!url) return undefined;

  // Verificamos si es una URL de Appwrite Storage
  // Buscamos "appwrite.io" y "/storage/" para asegurarnos
  if (url.includes("appwrite.io") && url.includes("/storage/buckets/")) {
    try {
      // 1. Cambiamos el endpoint de 'view' (original) a 'preview' (transformación)
      let newUrl = url.replace("/view", "/preview");

      // 2. Aseguramos que tenga el separador correcto para los nuevos parámetros
      const separator = newUrl.includes("?") ? "&" : "?";

      // 3. Agregamos los parámetros de optimización de Appwrite Pro
      // gravity=center: Mantiene el centro de la imagen si se recorta
      // quality=80: Reduce peso sin perder calidad visible
      // output=webp: Formato moderno mucho más ligero que JPG/PNG
      return `${newUrl}${separator}width=${width}&height=${height}&gravity=center&quality=80&output=webp`;
    } catch (e) {
      return url; // Si algo falla, devolvemos la original
    }
  }

  // Si es de Google, Deezer u otro lado, la devolvemos igual
  return url;
};
