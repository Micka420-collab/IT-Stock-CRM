/**
 * Check if a user has a specific permission.
 * Admins have all permissions by default.
 * 
 * @param {Object} user - The user object (must contain role and permissions array)
 * @param {string} permissionId - The permission identifier to check check (e.g. 'inventory_view')
 * @returns {boolean}
 */
export const hasPermission = (user, permissionId) => {
    if (!user) return false;

    // Admins have full access
    if (user.role === 'admin') return true;

    // Check permissions array
    if (user.permissions && Array.isArray(user.permissions)) {
        return user.permissions.includes(permissionId);
    }

    return false;
};

/**
 * Check if a user has ANY of the provided permissions.
 * @param {Object} user 
 * @param {Array<string>} permissionIds 
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissionIds) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    if (user.permissions && Array.isArray(user.permissions)) {
        return permissionIds.some(id => user.permissions.includes(id));
    }

    return false;
};
