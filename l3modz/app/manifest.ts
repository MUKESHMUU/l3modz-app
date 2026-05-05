import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'L3 MODZ Premium Motorcycle Parts',
    short_name: 'L3 MODZ',
    description: 'Fast, reliable, and premium motorcycle parts store in Coimbatore.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F9FAFB',
    theme_color: '#007185',
    icons: [
      {
        src: '/l3modz-favicon.svg',
        sizes: '64x64',
        type: 'image/svg+xml',
      },
      {
        src: '/l3modz-favicon.svg',
        sizes: '64x64',
        type: 'image/svg+xml',
      },
    ],
  };
}
