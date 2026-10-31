import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const bucket = 'default-bucket';

// Server-only client: SUPABASE_KEY must never be exposed with a NEXT_PUBLIC_ prefix.
export const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string
);

const EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

export const uploadImage = async (image: File) => {
    const extension = EXTENSIONS[image.type];
    if (!extension) throw new Error('Unsupported image type');

    // Random server-generated name: the client's filename is never used as a storage path.
    const newName = `${Date.now()}-${randomUUID()}.${extension}`;

    const { data, error } = await supabase
        .storage.from(bucket)
        .upload(newName, image, { cacheControl: '3600', contentType: image.type, upsert: false });

    if (error || !data) throw new Error('Image upload failed');

    return supabase.storage.from(bucket).getPublicUrl(newName).data.publicUrl;
};

export const deleteImage = (url: string) => {
    const imageName = decodeURIComponent(url.split('/').pop() as string);
    if (!imageName || imageName.includes('..')) throw new Error('Invalid URL');
    return supabase.storage.from(bucket).remove([imageName]);
};
