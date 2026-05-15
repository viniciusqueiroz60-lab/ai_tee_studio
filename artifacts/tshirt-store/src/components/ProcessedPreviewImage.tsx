import { useState, useEffect } from 'react';
import { removeWhiteBackground } from '../services/imageUtils.ts';

export const ProcessedPreviewImage = ({ src, className, alt }: { src: string, className?: string, alt?: string }) => {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const processImage = async () => {
      try {
        setLoading(true);
        const processed = await removeWhiteBackground(src);
        if (isMounted) {
          setProcessedSrc(processed);
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setProcessedSrc(src);
          setLoading(false);
        }
      }
    };

    processImage();
    
    return () => { isMounted = false; };
  }, [src]);

  return (
    <img 
      src={processedSrc || src} 
      className={className} 
      alt={alt}
      style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s' }}
    />
  );
};
