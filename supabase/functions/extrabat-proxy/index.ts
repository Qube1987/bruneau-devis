const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExtrabatRequest {
  endpoint?: string;
  params?: Record<string, any>;
  technicianCode?: string;
  interventionData?: {
    clientName: string;
    systemType: string;
    problemDesc: string;
    startedAt: string;
    endedAt?: string;
  };
  clientId?: number;
}

interface ExtrabatAppointment {
  journee: boolean;
  objet: string;
  debut: string;
  fin: string;
  couleur: string;
  users: Array<{
    user: string;
  }>;
  rdvClients?: Array<{
    client: number;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Extrabat credentials from Supabase secrets
    const apiKey = Deno.env.get('EXTRABAT_API_KEY') || 'MjMxYjcwNGEtYjhiNy00YWFmLTk3ZmEtY2VjZTdmNTA5ZjQwOjQ2NTE2OjYyNzE3'
    const securityKey = Deno.env.get('EXTRABAT_SECURITY_KEY') || Deno.env.get('EXTRABAT_SECURITY') || 'b8778cb3e72e1d8c94ed6a96d476a72ae09c1b5ba9d9f449d7e2e7a163a51b3c'

    console.log('Using Extrabat credentials:', {
      apiKey: apiKey ? 'SET' : 'NOT SET',
      securityKey: securityKey ? 'SET' : 'NOT SET'
    })

    // Parse request body
    const requestBody: ExtrabatRequest = await req.json()

    // Handle different types of requests
    if (requestBody.endpoint) {
      // Client search or other API calls
      const { endpoint, params } = requestBody

      // Ensure endpoint starts with a slash but avoid double slashes
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      // Switching to v1 as per main documentation preference
      let apiUrl = `https://api.extrabat.com/v1${cleanEndpoint}`

      if (params) {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
        if (searchParams.toString()) {
          apiUrl += `?${searchParams.toString()}`
        }
      }

      console.log('Calling Extrabat API:', apiUrl)

      // Add company_id if configured
      const companyId = Deno.env.get('EXTRABAT_COMPANY_ID')
      if (companyId && params && !params.company_id) {
        const url = new URL(apiUrl)
        url.searchParams.append('company_id', companyId)
        apiUrl = url.toString()
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-EXTRABAT-API-KEY': apiKey,
          'X-EXTRABAT-SECURITY': securityKey,
        }
      })

      const responseText = await response.text()
      let responseData

      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = responseText
      }

      if (!response.ok) {
        console.error('Extrabat API error:', response.status, responseData)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Extrabat API error: ${response.status} - ${responseText}`,
            status: response.status
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('Extrabat API success:', responseData)

      return new Response(
        JSON.stringify({
          success: true,
          data: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle appointment creation (existing logic)
    const { technicianCode, interventionData, clientId } = requestBody

    if (!technicianCode || !interventionData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: technicianCode and interventionData'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the intervention date
    const startDate = new Date(interventionData.startedAt)
    const endDate = interventionData.endedAt
      ? new Date(interventionData.endedAt)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // +2 hours by default

    // Format dates for Extrabat API (yyyy-mm-dd hh:mm:ss)
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    // Create appointment object
    const appointment: ExtrabatAppointment = {
      journee: false,
      objet: `SAV ${interventionData.systemType} - ${interventionData.clientName}`,
      debut: formatDate(startDate),
      fin: formatDate(endDate),
      couleur: "131577", // Bleu foncé pour les SAV
      users: [
        {
          user: technicianCode
        }
      ]
    }

    // Add client ID if provided
    if (clientId) {
      appointment.rdvClients = [
        {
          client: clientId
        }
      ];
    }

    console.log('Calling Extrabat API with:', JSON.stringify(appointment, null, 2))

    // Make API call to Extrabat
    const response = await fetch('https://api.extrabat.com/v1/agenda/rendez-vous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EXTRABAT-API-KEY': apiKey,
        'X-EXTRABAT-SECURITY': securityKey,
      },
      body: JSON.stringify(appointment)
    })

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = responseText
    }

    if (!response.ok) {
      console.error('Extrabat API error:', response.status, responseData)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Extrabat API error: ${response.status} - ${responseText}`,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Extrabat API success:', responseData)

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        message: 'Appointment created successfully in Extrabat'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Extrabat proxy error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})