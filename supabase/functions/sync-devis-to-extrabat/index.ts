import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DevisLine {
  id: string;
  reference: string;
  name: string;
  description?: string;
  quantity: number;
  price_ht: number;
  vat_rate: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
}

interface DevisClient {
  extrabat_id?: number;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
}

interface DevisData {
  id: string;
  titre_affaire?: string;
  lignes: DevisLine[];
  totaux: {
    total_ht: number;
    total_tva: number;
    total_ttc: number;
  };
  taux_tva: number;
  client: DevisClient;
  observations?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { devisId } = await req.json();

    if (!devisId) {
      throw new Error("devisId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const extrabatApiKey = Deno.env.get("EXTRABAT_API_KEY");
    const extrabatSecurityKey = Deno.env.get("EXTRABAT_SECURITY_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!extrabatApiKey || !extrabatSecurityKey) {
      throw new Error("Missing Extrabat API keys (API_KEY and SECURITY_KEY required)");
    }

    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/devis?id=eq.${devisId}&select=*`, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!supabaseResponse.ok) {
      throw new Error("Failed to fetch devis from database");
    }

    const devisData: DevisData[] = await supabaseResponse.json();

    if (!devisData || devisData.length === 0) {
      throw new Error("Devis not found");
    }

    const devis = devisData[0];

    if (!devis.client.extrabat_id) {
      throw new Error("Client does not have an Extrabat ID");
    }

    const extrabatDevisPayload = {
      type: 1,
      date: new Date().toISOString().split('T')[0],
      titre: devis.titre_affaire || "Devis",
      totalHT: Math.round(devis.totaux.total_ht * 100) / 100,
      totalTTC: Math.round(devis.totaux.total_ttc * 100) / 100,
      totalTVA: Math.round(devis.totaux.total_tva * 100) / 100,
      escompte: 0,
      portHT: 0,
      portTTC: 0,
      portTVA: 0,
      client: devis.client.extrabat_id,
      commentaire: devis.observations || "",
      adresseFacturation: devis.client.adresse
        ? `${devis.client.adresse}, ${devis.client.code_postal || ''} ${devis.client.ville || ''}`.trim()
        : "",
      adresseLivraison: devis.client.adresse
        ? `${devis.client.adresse}, ${devis.client.code_postal || ''} ${devis.client.ville || ''}`.trim()
        : "",
      lignes: devis.lignes.map((ligne: DevisLine, index: number) => ({
        code: ligne.reference || "",
        description: ligne.name + (ligne.description ? ` - ${ligne.description}` : ""),
        quantite: Math.round(ligne.quantity * 100) / 100,
        puht: Math.round(ligne.price_ht * 100) / 100,
        totalHt: Math.round(ligne.total_ht * 100) / 100,
        totalEscompte: 0,
        totalNet: Math.round(ligne.total_ht * 100) / 100,
        tauxTva: Math.round(ligne.vat_rate),
        totalTva: Math.round(ligne.total_vat * 100) / 100,
        totalTtc: Math.round(ligne.total_ttc * 100) / 100,
        ordre: index + 1,
        tenueStock: false,
        nomenclature: false,
        tauxRemise: 0,
        numLigne: index + 1,
      })),
    };

    console.log("Payload sent to Extrabat:", JSON.stringify(extrabatDevisPayload, null, 2));

    const extrabatResponse = await fetch(
      `https://api.extrabat.com/v1/client/${devis.client.extrabat_id}/devis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-EXTRABAT-API-KEY": extrabatApiKey,
          "X-EXTRABAT-SECURITY": extrabatSecurityKey,
        },
        body: JSON.stringify(extrabatDevisPayload),
      }
    );

    const responseBody = await extrabatResponse.text();
    console.log("Extrabat response status:", extrabatResponse.status);
    console.log("Extrabat response body:", responseBody);

    if (!extrabatResponse.ok) {
      let errorDetails = responseBody;
      try {
        const parsed = JSON.parse(responseBody);
        errorDetails = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Keep as text if not JSON
      }

      throw new Error(`Extrabat API error: ${extrabatResponse.status} - ${errorDetails}`);
    }

    const extrabatResult = JSON.parse(responseBody);

    const updatePayload: any = {
      extrabat_devis_id: extrabatResult.id,
    };

    if (extrabatResult.code) {
      updatePayload.devis_number = extrabatResult.code;
    }

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/devis?id=eq.${devisId}`, {
      method: "PATCH",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      console.error("Failed to update devis with Extrabat ID");
    }

    return new Response(
      JSON.stringify({
        success: true,
        extrabatDevisId: extrabatResult.id,
        devisNumber: extrabatResult.code,
        message: "Devis successfully synced to Extrabat",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error syncing devis to Extrabat:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
