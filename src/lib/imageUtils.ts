/**
 * Utility functions for optimizing image delivery
 */

/**
 * Optimizes an Unsplash URL by adding WebP format and appropriate sizing
 * @param url - The original image URL
 * @param width - Desired width (optional, for responsive sizing)
 * @param quality - Image quality 1-100 (default: 80)
 * @returns Optimized URL with WebP format
 */
export const optimizeUnsplashUrl = (
  url: string | null | undefined,
  width?: number,
  quality: number = 80
): string => {
  if (!url) return '';
  
  // Only process Unsplash URLs
  if (!url.includes('images.unsplash.com')) {
    return url;
  }

  const urlObj = new URL(url);
  
  // Set WebP format for better compression
  urlObj.searchParams.set('fm', 'webp');
  
  // Set quality
  urlObj.searchParams.set('q', quality.toString());
  
  // Set width if provided
  if (width) {
    urlObj.searchParams.set('w', width.toString());
  }
  
  // Enable auto format optimization
  urlObj.searchParams.set('auto', 'format');
  
  return urlObj.toString();
};

/**
 * Generates a srcset for responsive images
 * @param url - The original image URL
 * @param sizes - Array of widths to generate
 * @returns srcset string
 */
export const generateSrcSet = (
  url: string | null | undefined,
  sizes: number[] = [320, 640, 960, 1280, 1920]
): string => {
  if (!url || !url.includes('images.unsplash.com')) {
    return '';
  }

  return sizes
    .map(size => `${optimizeUnsplashUrl(url, size)} ${size}w`)
    .join(', ');
};
