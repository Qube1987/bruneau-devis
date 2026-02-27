import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function generateThumbnail(
  supabase: any,
  bucket: string,
  filePath: string,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`);
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const pathParts = filePath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const fileNameParts = fileName.split('.');
  const extension = fileNameParts[fileNameParts.length - 1];
  const nameWithoutExt = fileNameParts.slice(0, -1).join('.');
  const thumbnailFileName = `${nameWithoutExt}_thumb.${extension}`;
  const thumbnailPath = pathParts.slice(0, -1).concat(thumbnailFileName).join('/');

  const { Image } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");

  const image = await Image.decode(uint8Array);

  const targetRatio = maxWidth / maxHeight;
  const sourceRatio = image.width / image.height;

  let cropWidth = image.width;
  let cropHeight = image.height;
  let cropX = 0;
  let cropY = 0;

  if (sourceRatio > targetRatio) {
    cropWidth = Math.floor(image.height * targetRatio);
    cropX = Math.floor((image.width - cropWidth) / 2);
  } else if (sourceRatio < targetRatio) {
    cropHeight = Math.floor(image.width / targetRatio);
    cropY = Math.floor((image.height - cropHeight) / 2);
  }

  const croppedImage = image.crop(cropX, cropY, cropWidth, cropHeight);
  const resizedImage = croppedImage.resize(maxWidth, maxHeight);
  const encodedImage = await resizedImage.encodeJPEG(quality);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(thumbnailPath, encodedImage, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
  }

  return thumbnailPath;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: images, error: fetchError } = await supabase
      .from("media_library")
      .select("id, file_path, thumbnail_path")
      .eq("media_type", "image");

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`);
    }

    const results = {
      total: images?.length || 0,
      processed: 0,
      errors: [] as string[],
    };

    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No images to process",
          results,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    for (const image of images) {
      try {
        if (image.thumbnail_path) {
          await supabase.storage
            .from("products")
            .remove([image.thumbnail_path]);
        }

        const thumbnailPath = await generateThumbnail(
          supabase,
          "products",
          image.file_path,
          1200,
          1200,
          98
        );

        const { error: updateError } = await supabase
          .from("media_library")
          .update({ thumbnail_path: thumbnailPath })
          .eq("id", image.id);

        if (updateError) {
          throw new Error(`Failed to update database: ${updateError.message}`);
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing ${image.file_path}:`, error);
        results.errors.push(
          `${image.file_path}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed}/${results.total} images`,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error regenerating thumbnails:", error);
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
