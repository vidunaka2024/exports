// backend/services/twoFactorService.js
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import TwoFactorAuth from '../models/TwoFactorAuth.js';
import logger from '../utils/logger.js';

class TwoFactorService {
  // Generate secret for TOTP
  async generateSecret(user) {
    try {
      const secret = speakeasy.generateSecret({
        name: `ExportHaven (${user.email})`,
        issuer: 'ExportHaven',
        length: 32,
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(10);

      // Save to database
      await TwoFactorAuth.findOneAndUpdate(
        { user: user._id },
        {
          user: user._id,
          secret: secret.base32,
          enabled: false,
          method: 'totp',
          backupCodes: backupCodes.map((code) => ({ code, used: false })),
        },
        { upsert: true, new: true }
      );

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      logger.info(`2FA secret generated for user: ${user._id}`);

      return {
        secret: secret.base32,
        qrCode,
        backupCodes: backupCodes.map((bc) => bc.code),
      };
    } catch (error) {
      logger.error('Error generating 2FA secret:', error);
      throw error;
    }
  }

  // Generate backup codes
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push({ code, used: false });
    }
    return codes;
  }

  // Verify TOTP token
  async verifyToken(userId, token) {
    try {
      const twoFactor = await TwoFactorAuth.findOne({ user: userId });

      if (!twoFactor || !twoFactor.enabled) {
        return { verified: false, error: '2FA not enabled' };
      }

      // Check if it's a backup code
      const backupCode = twoFactor.backupCodes.find(
        (bc) => bc.code === token && !bc.used
      );

      if (backupCode) {
        backupCode.used = true;
        backupCode.usedAt = new Date();
        await twoFactor.save();

        logger.info(`Backup code used for user: ${userId}`);
        return { verified: true, method: 'backup_code' };
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time-steps before and after
      });

      if (verified) {
        twoFactor.lastVerified = new Date();
        await twoFactor.save();
        logger.info(`2FA verified for user: ${userId}`);
      }

      return { verified, method: 'totp' };
    } catch (error) {
      logger.error('Error verifying 2FA token:', error);
      throw error;
    }
  }

  // Enable 2FA
  async enable(userId, token) {
    try {
      const twoFactor = await TwoFactorAuth.findOne({ user: userId });

      if (!twoFactor) {
        throw new Error('2FA not set up');
      }

      // Verify the token before enabling
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!verified) {
        return { success: false, error: 'Invalid token' };
      }

      twoFactor.enabled = true;
      twoFactor.lastVerified = new Date();
      await twoFactor.save();

      logger.info(`2FA enabled for user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  // Disable 2FA
  async disable(userId) {
    try {
      const result = await TwoFactorAuth.findOneAndDelete({ user: userId });

      if (result) {
        logger.info(`2FA disabled for user: ${userId}`);
        return { success: true };
      }

      return { success: false, error: '2FA not found' };
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  // Add trusted device
  async addTrustedDevice(userId, deviceInfo) {
    try {
      const deviceId = crypto.randomBytes(16).toString('hex');

      await TwoFactorAuth.findOneAndUpdate(
        { user: userId },
        {
          $push: {
            trustedDevices: {
              deviceId,
              deviceName: deviceInfo.name,
              userAgent: deviceInfo.userAgent,
              ipAddress: deviceInfo.ipAddress,
              lastUsed: new Date(),
            },
          },
        }
      );

      logger.info(`Trusted device added for user: ${userId}`);
      return { deviceId };
    } catch (error) {
      logger.error('Error adding trusted device:', error);
      throw error;
    }
  }

  // Check if device is trusted
  async isTrustedDevice(userId, deviceId) {
    try {
      const twoFactor = await TwoFactorAuth.findOne({ user: userId });

      if (!twoFactor) return false;

      const device = twoFactor.trustedDevices.find(
        (d) => d.deviceId === deviceId
      );

      if (device) {
        // Update last used
        device.lastUsed = new Date();
        await twoFactor.save();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking trusted device:', error);
      return false;
    }
  }

  // Remove trusted device
  async removeTrustedDevice(userId, deviceId) {
    try {
      await TwoFactorAuth.findOneAndUpdate(
        { user: userId },
        {
          $pull: {
            trustedDevices: { deviceId },
          },
        }
      );

      logger.info(`Trusted device removed for user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error removing trusted device:', error);
      throw error;
    }
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId) {
    try {
      const backupCodes = this.generateBackupCodes(10);

      await TwoFactorAuth.findOneAndUpdate(
        { user: userId },
        {
          backupCodes: backupCodes.map((bc) => ({ code: bc.code, used: false })),
        }
      );

      logger.info(`Backup codes regenerated for user: ${userId}`);
      return backupCodes.map((bc) => bc.code);
    } catch (error) {
      logger.error('Error regenerating backup codes:', error);
      throw error;
    }
  }
}

export default new TwoFactorService();
