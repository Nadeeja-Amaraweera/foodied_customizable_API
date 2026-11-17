import {supabase} from '../config/supabase'

export const uploadImage = async (
    file: any,
    bucketName: string="food-images"
) => {
    
    const uuid = crypto.randomUUID()
    const sanitizedName = file.orignalname.replace(/[^a-zA-Z0-9.-]/g, "-")
    const fileName = `${uuid}-${sanitizedName}`

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file.buffer, { contentType: file.mimetype })

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`)
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
  return data.publicUrl
}