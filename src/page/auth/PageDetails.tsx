import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

// Sample images for the slideshow
const images = [
  'https://cdn.glitch.global/be6962dd-2c2d-4f41-bd40-95b569818599/spa1.image.png?v=1737568274766',
  'https://cdn.glitch.global/be6962dd-2c2d-4f41-bd40-95b569818599/spa2.image.png?v=1737568448860',
  'https://cdn.glitch.global/be6962dd-2c2d-4f41-bd40-95b569818599/spa3.image.png?v=1737568458154',
  'https://cdn.glitch.global/be6962dd-2c2d-4f41-bd40-95b569818599/spa4.image.png?v=1737568539389'
];

const PageDetail: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const interval = setInterval(nextImage, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <Box className="flex flex-col justify-center items-center p-8">

      {/* Image Slideshow */}
      <div className="relative w-full overflow-hidden rounded-lg" style={{
        height: '500px',
      }}>
        <img
          src={images[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-500 ease-in-out"
        />
        {/* Previous Button */}
        <button
          className="absolute top-1/2 left-4 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2"
          onClick={prevImage}
        >
          &#10094;
        </button>
        {/* Next Button */}
        <button
          className="absolute top-1/2 right-4 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2"
          onClick={nextImage}
        >
          &#10095;
        </button>

        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${
                currentIndex === index ? 'bg-white' : 'bg-gray-500'
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>

      {/* Content below */}
      <Typography className="mt-5 pt-3 text-xl text-gray-700 dark:text-gray-200">
        Đây là nội dung của trang chủ. Dưới đây là một số hình ảnh minh họa cho SPA của chúng tôi.
      </Typography>
    </Box>
  );
};

export default PageDetail;
