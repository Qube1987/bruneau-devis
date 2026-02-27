import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DevisItem {
  label: string;
  qty: number;
  category?: string;
  reference?: string;
  description_short?: string;
  description_long?: string;
}

interface GenerateIntroRequest {
  items: DevisItem[];
  client_type?: string;
  max_chars?: number;
}

const FALLBACK_INTRO = `La solution proposée vise à sécuriser vos accès et à assurer une détection fiable des événements, avec une gestion simple au quotidien. Les équipements sélectionnés ont été dimensionnés pour répondre à votre configuration et permettre un usage clair et efficace, sur site comme à distance.`;

async function generateIntroWithOpenAI(items: DevisItem[], clientType: string, maxChars: number): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not configured");
    return FALLBACK_INTRO;
  }

  const itemsDescription = items.map(item => {
    let desc = `- ${item.label} (Réf: ${item.reference || 'N/A'}, Quantité: ${item.qty})`;
    if (item.category) {
      desc += `\n  Catégorie: ${item.category}`;
    }
    if (item.description_short) {
      desc += `\n  Description courte: ${item.description_short}`;
    }
    if (item.description_long) {
      desc += `\n  Description détaillée: ${item.description_long}`;
    }
    return desc;
  }).join('\n\n');

  console.log("DEBUG - Items sent to LLM:", JSON.stringify(items, null, 2));

  const systemPrompt = `Vous êtes un expert en sécurité électronique qui rédige des introductions professionnelles pour l'entreprise Bruneau Protection.

RÈGLES IMPÉRATIVES:
- Ton professionnel, neutre, vouvoiement obligatoire, et emploi de la première personne du pluriel ("nous vous proposons...")
- Analysez PRÉCISÉMENT chaque produit listé avec ses descriptions techniques
- Mentionnez les technologies spécifiques (Ajax, détection extérieure, levée de doute par prise d'images, transmission 4G, etc.) si présentes
- Ne mentionnez pas les références des produits, indiquez seulement leur nature (la centrale, les détecteurs extérieurs à prise d'image, etc)
- Expliquez la LOGIQUE de la solution : pourquoi ces équipements ensemble forment un système cohérent
- Mettez en avant les bénéfices concrets : prévention en amont, continuité de service, supervision à distance, fiabilité
- JAMAIS de superlatifs commerciaux ("exceptionnel", "révolutionnaire", etc.)
- JAMAIS d'invention : utilisez UNIQUEMENT les informations des produits fournis
- Aucun titre, juste le texte d'introduction
- Style fluide et naturel, pas de liste à puces`;

  const userPrompt = `CLIENT: ${clientType === 'pro' ? 'Professionnel' : 'Particulier'}

PRODUITS DU DEVIS:
${itemsDescription}

MISSION:
Analysez ces produits en détail. Rédigez une introduction qui explique comment ces équipements forment une solution de sécurité cohérente et adaptée. Mentionnez les technologies clés présentes (détection extérieure, caméras avec levée de doute, transmission mobile, maintenance, etc.) et leurs avantages pratiques pour le client. Soyez précis sur les capacités réelles du système proposé.

Texte d'introduction uniquement (pas de titre, pas de formule de politesse) :`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return FALLBACK_INTRO;
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      console.error("No text generated from OpenAI");
      return FALLBACK_INTRO;
    }

    if (generatedText.length > maxChars) {
      return generatedText.substring(0, maxChars - 3) + "...";
    }

    return generatedText;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return FALLBACK_INTRO;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { items, client_type = "particulier", max_chars = 900 }: GenerateIntroRequest = await req.json();

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucun article fourni",
          intro_text: FALLBACK_INTRO
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const introText = await generateIntroWithOpenAI(items, client_type, max_chars);

    return new Response(
      JSON.stringify({
        success: true,
        intro_text: introText,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in generate-devis-intro:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        intro_text: FALLBACK_INTRO,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
