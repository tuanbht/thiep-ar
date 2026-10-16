/* The server's services, made once per process: the orders service on the configured repository (Supabase), photo
   store (Supabase Storage), template catalog and payment provider. Pages and routes call getServices(). */
import 'server-only';
import { getRepository } from '../db';
import { photoExists, signedPhotoUrl, uploadDraftPhoto } from '../db/photos';
import { getTemplateInfo } from '../catalog/templates';
import { OrdersService } from '../orders/service';
import { PHOTO_TYPES } from '../orders/photo';
import { paymentProviderFactory } from '../payments';
import { serverEnv } from './env';
import { cleanPhoto } from './photo-clean';

export interface Services {
  orders: OrdersService;
}

let services: Services | null = null;

export function getServices(): Services {
  if (services) return services;
  const env = serverEnv();
  const orders = new OrdersService({
    repo: getRepository(),
    photos: {
      uploadDraftPhoto: (bytes, ext) => uploadDraftPhoto(bytes, ext, PHOTO_TYPES[ext]),
      signedUrl: (path, seconds) => signedPhotoUrl(path, seconds),
      exists: path => photoExists(path)
    },
    cleanPhoto,
    templates: getTemplateInfo,
    makeProvider: paymentProviderFactory(env),
    siteUrl: env.NEXT_PUBLIC_SITE_URL
  });
  services = { orders };
  return services;
}
