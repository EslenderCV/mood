// lib/email.ts

// IMPORTANTE: Ya no importamos 'resend' para evitar errores de compilación
// Reemplaza con tu API Key real de Resend
const RESEND_API_KEY = "re_YYap2SXf_JexquXEYNyrxLK2MAnis1MLB";

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Mood <onboarding@resend.dev>",
        to: [email],
        subject: "¡Bienvenido a Mood!",
        html: `
          <div style="font-family: sans-serif; text-align: center; background-color: #000; color: #fff; padding: 40px;">
            <h1 style="color: #5E17EB;">¡Hola ${name}!</h1>
            <p style="font-size: 16px;">Gracias por unirte a Mood. ¡Empieza a compartir tu música!</p>
            <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; font-size: 12px; color: #666;">
              © 2026 Mood App
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Correo enviado exitosamente vía API:", data.id);
    } else {
      console.error("Error de Resend API:", data);
    }
  } catch (error) {
    console.error("Error de red enviando email:", error);
  }
};
