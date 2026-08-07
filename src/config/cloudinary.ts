import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

export { cloudinary };

export function uploadBuffer(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'auto' = 'image'
): Promise<{ secure_url: string; public_id: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (err, result) => {
      if (err || !result) {
        reject(err ?? new Error('Cloudinary upload failed'));
        return;
      }
      resolve({ secure_url: result.secure_url, public_id: result.public_id, bytes: result.bytes });
    });
    stream.end(buffer);
  });
}
