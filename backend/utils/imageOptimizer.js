// backend/utils/imageOptimizer.js
import sharp from 'sharp';
import logger from './logger.js';
import path from 'path';
import fs from 'fs/promises';

class ImageOptimizer {
  constructor() {
    this.sizes = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 400, height: 400 },
      medium: { width: 800, height: 800 },
      large: { width: 1200, height: 1200 },
    };
  }

  async optimize(inputPath, options = {}) {
    try {
      const {
        quality = 80,
        format = 'webp',
        resize = null,
        outputPath = null,
      } = options;

      const output = outputPath || this.getOutputPath(inputPath, format);

      let transformer = sharp(inputPath);

      // Resize if dimensions provided
      if (resize) {
        transformer = transformer.resize(resize.width, resize.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to specified format with quality
      if (format === 'webp') {
        transformer = transformer.webp({ quality });
      } else if (format === 'jpeg' || format === 'jpg') {
        transformer = transformer.jpeg({ quality, progressive: true });
      } else if (format === 'png') {
        transformer = transformer.png({ quality, progressive: true });
      }

      await transformer.toFile(output);

      logger.info(`Optimized image: ${inputPath} -> ${output}`);
      return output;
    } catch (error) {
      logger.error('Error optimizing image:', error);
      throw error;
    }
  }

  async generateThumbnails(inputPath, outputDir) {
    try {
      const thumbnails = {};

      for (const [size, dimensions] of Object.entries(this.sizes)) {
        const outputPath = path.join(
          outputDir,
          `${size}_${path.basename(inputPath, path.extname(inputPath))}.webp`
        );

        await this.optimize(inputPath, {
          resize: dimensions,
          format: 'webp',
          quality: size === 'thumbnail' ? 70 : 80,
          outputPath,
        });

        thumbnails[size] = outputPath;
      }

      logger.info(`Generated thumbnails for: ${inputPath}`);
      return thumbnails;
    } catch (error) {
      logger.error('Error generating thumbnails:', error);
      throw error;
    }
  }

  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();

      const validation = {
        isValid: true,
        errors: [],
        metadata,
      };

      // Check format
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!allowedFormats.includes(metadata.format)) {
        validation.isValid = false;
        validation.errors.push(`Invalid format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}`);
      }

      // Check dimensions
      const maxWidth = 4096;
      const maxHeight = 4096;
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        validation.isValid = false;
        validation.errors.push(`Image too large. Max dimensions: ${maxWidth}x${maxHeight}`);
      }

      // Check file size (read from file system)
      const stats = await fs.stat(filePath);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        validation.isValid = false;
        validation.errors.push(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
      }

      return validation;
    } catch (error) {
      logger.error('Error validating image:', error);
      return {
        isValid: false,
        errors: ['Invalid image file'],
      };
    }
  }

  async compressImage(inputPath, outputPath, quality = 80) {
    try {
      const metadata = await sharp(inputPath).metadata();
      const format = metadata.format === 'png' ? 'png' : 'jpeg';

      await sharp(inputPath)
        [format]({ quality, progressive: true })
        .toFile(outputPath);

      const inputStats = await fs.stat(inputPath);
      const outputStats = await fs.stat(outputPath);
      const compressionRatio = (
        ((inputStats.size - outputStats.size) / inputStats.size) *
        100
      ).toFixed(2);

      logger.info(
        `Compressed image: ${inputPath} (${compressionRatio}% reduction)`
      );

      return {
        inputSize: inputStats.size,
        outputSize: outputStats.size,
        compressionRatio,
        outputPath,
      };
    } catch (error) {
      logger.error('Error compressing image:', error);
      throw error;
    }
  }

  getOutputPath(inputPath, format) {
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, `${name}_optimized.${format}`);
  }

  async createWatermark(inputPath, watermarkText, outputPath) {
    try {
      const svgWatermark = `
        <svg width="200" height="50">
          <text x="50%" y="50%" font-family="Arial" font-size="20"
                fill="rgba(255,255,255,0.5)" text-anchor="middle"
                dominant-baseline="middle">
            ${watermarkText}
          </text>
        </svg>
      `;

      await sharp(inputPath)
        .composite([
          {
            input: Buffer.from(svgWatermark),
            gravity: 'southeast',
          },
        ])
        .toFile(outputPath);

      logger.info(`Added watermark to: ${inputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Error adding watermark:', error);
      throw error;
    }
  }
}

export default new ImageOptimizer();
