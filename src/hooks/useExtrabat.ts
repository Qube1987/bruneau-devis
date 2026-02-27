import { supabase } from '../lib/supabase';

interface ExtrabatResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const useExtrabat = () => {
  const searchClients = async (query: string): Promise<ExtrabatResponse> => {
    try {
      console.log('Searching Extrabat clients for:', query);
      
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          endpoint: 'clients',
          params: {
            q: query,
            include: 'telephone,adresse,ouvrage'
          }
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Extrabat API error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Extrabat client search successful');
      return { success: true, data: data.data };

    } catch (error) {
      console.error('Extrabat client search failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const createAppointment = async (
    technicianCode: string,
    interventionData: {
      clientName: string;
      systemType: string;
      problemDesc: string;
      startedAt: string;
      endedAt?: string;
    },
    clientId?: number
  ): Promise<ExtrabatResponse> => {
    try {
      console.log('Creating Extrabat appointment for technician:', technicianCode);
      
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          technicianCode,
          interventionData,
          clientId
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        
        if (error.message && error.message.includes('credentials not configured')) {
          console.error('🔑 CONFIGURATION REQUIRED:');
          console.error('1. Go to your Supabase dashboard');
          console.error('2. Navigate to Edge Functions > Secrets');
          console.error('3. Add these secrets:');
          console.error('   - EXTRABAT_API_KEY = your Extrabat API key');
          console.error('   - EXTRABAT_SECURITY = your Extrabat security key');
          console.error('4. The secrets will be automatically available to the edge function');
        }
        
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Extrabat API error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Extrabat appointment created successfully');
      return { success: true, data: data.data };

    } catch (error) {
      console.error('Extrabat appointment creation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  return { searchClients, createAppointment };
};