import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const bucket = 'default-bucket';

// Server-only client, created on first use so a build without env vars still succeeds.
// SUPABASE_KEY must never be exposed with a NEXT_PUBLIC_ prefix.
let client: SupabaseClient | null = null;

const getSupabase = () => {
    if (!client) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_KEY must be set");
        client = createClient(url, key);
    }
    return client;
};

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

    const { data, error } = await getSupabase()
        .storage.from(bucket)
        .upload(newName, image, { cacheControl: '3600', contentType: image.type, upsert: false });

    if (error || !data) throw new Error('Image upload failed');

    return getSupabase().storage.from(bucket).getPublicUrl(newName).data.publicUrl;
};

export const deleteImage = (url: string) => {
    const imageName = decodeURIComponent(url.split('/').pop() as string);
    if (!imageName || imageName.includes('..')) throw new Error('Invalid URL');
    return getSupabase().storage.from(bucket).remove([imageName]);
};
