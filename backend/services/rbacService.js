// backend/services/rbacService.js
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

class RBACService {
  // Initialize default roles and permissions
  async initializeDefaults() {
    try {
      // Create default permissions
      const permissions = [
        // User permissions
        { name: 'user.read', resource: 'User', action: 'read' },
        { name: 'user.create', resource: 'User', action: 'create' },
        { name: 'user.update', resource: 'User', action: 'update' },
        { name: 'user.delete', resource: 'User', action: 'delete' },
        { name: 'user.manage', resource: 'User', action: 'manage' },

        // Ad permissions
        { name: 'ad.read', resource: 'Ad', action: 'read' },
        { name: 'ad.create', resource: 'Ad', action: 'create' },
        { name: 'ad.update', resource: 'Ad', action: 'update' },
        { name: 'ad.delete', resource: 'Ad', action: 'delete' },
        { name: 'ad.approve', resource: 'Ad', action: 'approve' },
        { name: 'ad.reject', resource: 'Ad', action: 'reject' },

        // Order permissions
        { name: 'order.read', resource: 'Order', action: 'read' },
        { name: 'order.create', resource: 'Order', action: 'create' },
        { name: 'order.update', resource: 'Order', action: 'update' },
        { name: 'order.delete', resource: 'Order', action: 'delete' },
        { name: 'order.approve', resource: 'Order', action: 'approve' },

        // Analytics permissions
        { name: 'analytics.read', resource: 'Analytics', action: 'read' },
        { name: 'analytics.export', resource: 'Analytics', action: 'export' },

        // System permissions
        { name: 'system.manage', resource: 'System', action: 'manage' },
      ];

      for (const perm of permissions) {
        await Permission.findOneAndUpdate(
          { name: perm.name },
          perm,
          { upsert: true }
        );
      }

      // Create default roles
      const allPermissions = await Permission.find();

      // Admin role - all permissions
      await Role.findOneAndUpdate(
        { name: 'admin' },
        {
          name: 'admin',
          displayName: 'Administrator',
          description: 'Full system access',
          permissions: allPermissions.map((p) => p._id),
          isSystem: true,
          priority: 100,
        },
        { upsert: true }
      );

      // Exporter role
      const exporterPerms = allPermissions.filter((p) =>
        [
          'ad.read',
          'ad.create',
          'ad.update',
          'ad.delete',
          'order.read',
          'order.update',
          'order.approve',
          'analytics.read',
        ].includes(p.name)
      );

      await Role.findOneAndUpdate(
        { name: 'exporter' },
        {
          name: 'exporter',
          displayName: 'Exporter',
          description: 'Exporter permissions',
          permissions: exporterPerms.map((p) => p._id),
          isSystem: true,
          priority: 50,
        },
        { upsert: true }
      );

      // Manufacturer role
      const manufacturerPerms = allPermissions.filter((p) =>
        [
          'ad.read',
          'ad.create',
          'ad.update',
          'ad.delete',
          'order.read',
          'order.create',
        ].includes(p.name)
      );

      await Role.findOneAndUpdate(
        { name: 'manufacturer' },
        {
          name: 'manufacturer',
          displayName: 'Manufacturer',
          description: 'Manufacturer permissions',
          permissions: manufacturerPerms.map((p) => p._id),
          isSystem: true,
          priority: 50,
        },
        { upsert: true }
      );

      logger.info('Default roles and permissions initialized');
    } catch (error) {
      logger.error('Error initializing RBAC defaults:', error);
      throw error;
    }
  }

  // Check if user has permission
  async hasPermission(userId, permissionName) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      const role = await Role.findOne({ name: user.role }).populate(
        'permissions'
      );

      if (!role) return false;

      const allPermissions = await role.getAllPermissions();
      const permissions = await Permission.find({
        _id: { $in: allPermissions },
      });

      return permissions.some((p) => p.name === permissionName);
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  // Get user permissions
  async getUserPermissions(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];

      const role = await Role.findOne({ name: user.role }).populate(
        'permissions'
      );

      if (!role) return [];

      const allPermissions = await role.getAllPermissions();
      const permissions = await Permission.find({
        _id: { $in: allPermissions },
      }).lean();

      return permissions.map((p) => p.name);
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  // Create custom role
  async createRole(roleData) {
    try {
      const role = await Role.create(roleData);
      logger.info(`Role created: ${role.name}`);
      return role;
    } catch (error) {
      logger.error('Error creating role:', error);
      throw error;
    }
  }

  // Update role permissions
  async updateRolePermissions(roleId, permissionIds) {
    try {
      const role = await Role.findByIdAndUpdate(
        roleId,
        { permissions: permissionIds },
        { new: true }
      );

      logger.info(`Role permissions updated: ${roleId}`);
      return role;
    } catch (error) {
      logger.error('Error updating role permissions:', error);
      throw error;
    }
  }
}

export default new RBACService();
