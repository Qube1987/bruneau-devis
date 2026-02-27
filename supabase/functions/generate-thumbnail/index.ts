import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  bucket: string;
  filePath: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bucket, filePath, maxWidth = 1200, maxHeight = 1200, quality = 98 }: RequestBody = await req.json();

    if (!bucket || !filePath) {
      throw new Error("bucket and filePath are required");
    }

    // Download the original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Generate thumbnail path
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fileNameParts = fileName.split('.');
    const extension = fileNameParts[fileNameParts.length - 1];
    const nameWithoutExt = fileNameParts.slice(0, -1).join('.');
    const thumbnailFileName = `${nameWithoutExt}_thumb.${extension}`;
    const thumbnailPath = pathParts.slice(0, -1).concat(thumbnailFileName).join('/');

    // Import imagescript dynamically
    const { Image } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");

    const image = await Image.decode(uint8Array);

    // Calculate dimensions for centered crop (object-fit: cover behavior)
    // We want to fill the target dimensions while maintaining aspect ratio
    const targetRatio = maxWidth / maxHeight;
    const sourceRatio = image.width / image.height;

    let cropWidth = image.width;
    let cropHeight = image.height;
    let cropX = 0;
    let cropY = 0;

    if (sourceRatio > targetRatio) {
      // Image is wider than target, crop width
      cropWidth = Math.floor(image.height * targetRatio);
      cropX = Math.floor((image.width - cropWidth) / 2);
    } else if (sourceRatio < targetRatio) {
      // Image is taller than target, crop height
      cropHeight = Math.floor(image.width / targetRatio);
      cropY = Math.floor((image.height - cropHeight) / 2);
    }

    // Crop the image from center
    const croppedImage = image.crop(cropX, cropY, cropWidth, cropHeight);

    // Resize to target dimensions
    const resizedImage = croppedImage.resize(maxWidth, maxHeight);

    // Encode to JPEG with high quality
    const encodedImage = await resizedImage.encodeJPEG(quality);
    
    // Upload thumbnail to storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(thumbnailPath, encodedImage, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        thumbnailPath,
        originalPath: filePath,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating thumbnail:", error);
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