import React from 'react';

const LazyImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  style = {},
  ...props
}) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      style={style}
      {...props}
    />
  );
};

export default LazyImage;
