"use client";
import type { ReactNode } from 'react';

interface ProductTitleProps {
  title: string;
  variant?: 'card' | 'table' | 'modal' | 'input' | 'badge' | 'hero' | 'header';
  maxLines?: number;
  className?: string;
  truncate?: boolean;
  showTooltip?: boolean;
  captionOnly?: boolean;
  children?: ReactNode;
}

/**
 * Reusable ProductTitle component for consistent product name display across the application.
 * Ensures full product names are visible everywhere without premature truncation.
 * Next.js/App Router version
 * 
 * Variants:
 * - card: Product cards with text wrapping (no truncation by default)
 * - table: Table cells with wrap-text and tooltips
 * - modal: Modal/detailed view with full text
 * - input: Input fields with full width
 * - badge: Small display in headers/badges (may truncate for space)
 * - hero: Large heading on product detail page
 * - header: Mini display in navigation/dropdowns (may truncate for space)
 */

/**
 * Extract main product caption from title that contains SEO keywords
 * Handles patterns like "Main Name | Keyword1 | Keyword2" or "Main Name – Keyword"
 * Also handles space-separated keywords at the end
 */
function extractCaption(title: string): string {
  const cleaned = (title || '').trim();
  
  // First, split by common separators: pipe, en-dash, em-dash, comma
  let parts = cleaned.split(/\s*[\|\-–—,]\s*/);
  let caption = parts[0].trim();
  
  // If still very long, it might be keywords separated by spaces
  // Look for patterns like "Word1 Word2 Word3 Word1 Word2..." (repeated words = keywords)
  if (caption.split(' ').length > 8) {
    // Try to find the main part by looking for the first repeated word
    const words = caption.split(/\s+/);
    let mainPart = caption;
    
    // If more than 8 words, likely just take the first 5-7 words as main caption
    if (words.length > 7) {
      // Find a good break point - look for natural boundaries
      const possibleBreak = caption.match(/^([^|–—,]*?)(?:\s+[A-Z]|$)/);
      if (possibleBreak) {
        mainPart = possibleBreak[1].trim();
      } else {
        // Just take first 6-7 words
        mainPart = words.slice(0, 6).join(' ');
      }
    }
    
    caption = mainPart.trim();
  }
  
  return caption.trim();
}

export default function ProductTitle({
  title,
  variant = 'card',
  maxLines = 2,
  className = '',
  truncate = false,
  showTooltip = true,
  captionOnly = false,
  children,
}: ProductTitleProps) {
  // Sanitize title
  let displayTitle = (title || '').trim();
  
  // Extract only the main caption if requested
  if (captionOnly) {
    displayTitle = extractCaption(displayTitle);
  }

  // Base styles for all variants
  const baseClasses = 'text-brand-text transition-colors';

  // Helper to get line-clamp class based on maxLines
  const getLineClamClass = (lines: number) => {
    const clamps: { [key: number]: string } = {
      1: 'line-clamp-1',
      2: 'line-clamp-2',
      3: 'line-clamp-3',
      4: 'line-clamp-4',
      5: 'line-clamp-5',
      6: 'line-clamp-6',
    };
    return clamps[lines] || 'line-clamp-2';
  };

  // Variant-specific styles - NEVER truncate product names by default
  const variantClasses = {
    card: 'font-normal text-sm md:text-base whitespace-normal break-words hover:text-brand-primary',
    table: 'whitespace-normal break-words text-sm font-normal',
    modal: 'whitespace-normal break-words font-normal text-base block',
    input: 'w-full px-3 py-2 rounded-lg border border-brand-border text-sm whitespace-normal break-words',
    badge: 'text-xs font-semibold px-2 py-1 rounded-full bg-brand-primary/10 text-brand-primary whitespace-normal break-words',
    hero: 'text-2xl sm:text-3xl md:text-[2rem] lg:text-4xl font-normal leading-tight tracking-tight whitespace-normal break-words',
    header: 'text-sm font-normal text-gray-900 whitespace-normal break-words',
  };

  // Combine classes - apply truncation only if explicitly requested AND supported by variant
  let finalClasses = `${baseClasses} ${variantClasses[variant]}`;
  
  if (truncate && (variant === 'badge' || variant === 'header')) {
    finalClasses = `${finalClasses} ${getLineClamClass(maxLines)}`;
  }
  
  finalClasses = `${finalClasses} ${className}`;

  // For input variant, return input element
  if (variant === 'input') {
    return (
      <input
        type="text"
        value={displayTitle}
        readOnly
        className={finalClasses}
        title={showTooltip ? displayTitle : undefined}
        aria-label={displayTitle}
      />
    );
  }

  // For other variants, render as span or div
  // Use block for modal and hero to support multi-line wrapping
  const wrapperClasses = (variant === 'modal' || variant === 'hero') ? 'block' : 'inline-block';

  return (
    <span
      className={`${finalClasses} ${wrapperClasses}`}
      title={showTooltip ? displayTitle : undefined}
      aria-label={displayTitle}
    >
      {displayTitle}
      {children}
    </span>
  );
}

/**
 * Utility function to handle product title display with consistent formatting
 */
export function formatProductTitle(title: string, maxLength?: number): string {
  const trimmed = (title || '').trim();
  if (!maxLength) return trimmed;
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength) + '...';
}

/**
 * Export extractCaption function for external use
 */
export { extractCaption };

/**
 * Hook for managing product title display with tooltip
 */
export function useProductTitle(title: string) {
  return {
    display: formatProductTitle(title),
    full: title,
    caption: extractCaption(title),
    truncated: title && title.length > 50,
    preview: formatProductTitle(title, 50),
  };
}
