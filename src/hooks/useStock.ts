import { useState } from 'react';
import { stockClient } from '../lib/stock-client';

export interface DevisLine {
  designation: string;
  ref_extrabat: string | null;
  quantite: number;
}

export interface StockStatus {
  status: 'sufficient' | 'partial' | 'out_of_stock' | 'not_referenced';
  label: string;
  color: string;
}

export interface StockEntry {
  designation: string;
  quantite: number;
}

export interface StockComparisonLine {
  devisDesignation: string;
  refExtrabat: string | null;
  quantiteDemandee: number;
  stockEntries: StockEntry[];
  totalStock: number;
  status: StockStatus;
}

interface StockProduct {
  ref_extrabat: string | null;
  name: string;
  depot_quantity: number;
  paul_truck_quantity: number;
  quentin_truck_quantity: number;
}

export function useStock() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStockStatus = (totalStock: number, quantiteDemandee: number, hasEntries: boolean): StockStatus => {
    if (!hasEntries) {
      return {
        status: 'not_referenced',
        label: 'Non référencé',
        color: 'text-gray-500 bg-gray-100'
      };
    }

    if (totalStock === 0) {
      return {
        status: 'out_of_stock',
        label: 'Rupture',
        color: 'text-red-700 bg-red-100'
      };
    }

    if (totalStock >= quantiteDemandee) {
      return {
        status: 'sufficient',
        label: 'Stock suffisant',
        color: 'text-green-700 bg-green-100'
      };
    }

    return {
      status: 'partial',
      label: 'Stock partiel',
      color: 'text-orange-700 bg-orange-100'
    };
  };

  const fetchStockForDevis = async (devisLines: DevisLine[]): Promise<StockComparisonLine[]> => {
    setLoading(true);
    setError(null);

    try {
      const linesWithRef = devisLines.filter(line => line.ref_extrabat);
      const uniqueRefs = [...new Set(linesWithRef.map(line => line.ref_extrabat))].filter(Boolean) as string[];

      let stockProducts: StockProduct[] = [];

      if (uniqueRefs.length > 0) {
        console.log('Fetching stock from database for refs:', uniqueRefs);

        const allProducts: StockProduct[] = [];

        for (const ref of uniqueRefs) {
          console.log(`Searching for ref: "${ref}" (length: ${ref.length}, trimmed: "${ref.trim()}")`);

          const trimmedRef = ref.trim();

          const { data, error: dbError } = await stockClient
            .from('stock_products')
            .select('ref_extrabat, name, depot_quantity, paul_truck_quantity, quentin_truck_quantity')
            .eq('ref_extrabat', trimmedRef);

          if (dbError) {
            console.error(`Error fetching stock for ref ${trimmedRef}:`, dbError);
            continue;
          }

          console.log(`Found ${data?.length || 0} products for ref "${trimmedRef}"`);

          if (data && data.length > 0) {
            allProducts.push(...data);
          } else {
            console.warn(`No stock found for ref: "${trimmedRef}"`);
          }
        }

        stockProducts = allProducts;
        console.log('Total fetched stock products:', stockProducts.length);
      }

      const result: StockComparisonLine[] = devisLines.map(line => {
        if (!line.ref_extrabat) {
          return {
            devisDesignation: line.designation,
            refExtrabat: null,
            quantiteDemandee: line.quantite,
            stockEntries: [],
            totalStock: 0,
            status: getStockStatus(0, line.quantite, false)
          };
        }

        const trimmedLineRef = line.ref_extrabat.trim();

        const matchingProducts = stockProducts.filter(
          product => product.ref_extrabat?.trim() === trimmedLineRef
        );

        if (matchingProducts.length === 0) {
          console.warn(`No matching products found for devis line ref: "${trimmedLineRef}"`);
        }

        const stockEntries: StockEntry[] = [];
        let totalStock = 0;

        for (const product of matchingProducts) {
          const depotQty = product.depot_quantity || 0;
          const paulQty = product.paul_truck_quantity || 0;
          const quentinQty = product.quentin_truck_quantity || 0;

          const productTotal = depotQty + paulQty + quentinQty;

          stockEntries.push({
            designation: product.name,
            quantite: depotQty
          });

          totalStock += depotQty;
        }

        return {
          devisDesignation: line.designation,
          refExtrabat: line.ref_extrabat,
          quantiteDemandee: line.quantite,
          stockEntries,
          totalStock,
          status: getStockStatus(totalStock, line.quantite, matchingProducts.length > 0)
        };
      });

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  return {
    fetchStockForDevis,
    loading,
    error
  };
}
