// Smart fuel entry settings.
//
// readerUrl: the address of your MileageMate photo reader (Cloudflare Worker),
// e.g. 'https://mileagemate-reader.yourname.workers.dev'. While it is empty, the
// labelled demo reader is used, which does NOT read photos.
// No API keys ever go in this file; the key lives only in the Worker's secrets.

export const SMART_CONFIG = {
  readerUrl: '',
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileBytes: 20 * 1024 * 1024, // reject anything larger before processing
  maxEdgePx: 1600, // photos are resized so the long edge is at most this
  jpegQuality: 0.85,
};

export const activeProvider = () => (SMART_CONFIG.readerUrl ? 'cloud' : 'mock');
