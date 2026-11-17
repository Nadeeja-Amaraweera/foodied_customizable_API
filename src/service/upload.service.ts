import { supabase } from '../config/supabase';

export const uploadImage = async (
  file: Express.Multer.File,
  bucketName: string = "food-images"
): Promise<string> => {
  if (!file || !file.buffer) {
    throw new Error("No image file buffer provided");
  }

  const uuid = crypto.randomUUID();
  // Fixed typo from file.orignalname to file.originalname
  const rawName = file.originalname || "image.png";
  const sanitizedName = rawName.replace(/[^a-zA-Z0-9.-]/g, "-");
  const fileName = `${uuid}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
  return data.publicUrl;
};

export const deleteImage = async (
  imageUrl: string,
  bucketName: string = "food-images"
): Promise<void> => {
  try {
    if (!imageUrl) return;

    // Check if the image belongs to the Supabase bucket
    const marker = `/${bucketName}/`;
    const index = imageUrl.indexOf(marker);
    if (index !== -1) {
      const fileName = decodeURIComponent(imageUrl.substring(index + marker.length));
      if (fileName) {
        const { error } = await supabase.storage.from(bucketName).remove([fileName]);
        if (error) {
          console.warn(`[Supabase Storage] Failed to delete image (${fileName}): ${error.message}`);
        }
      }
    }
  } catch (err) {
    console.warn("[Supabase Storage] Error cleaning up image:", err);
  }
};
